import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Check, Pencil, X, Copy, Scissors, ClipboardPaste } from 'lucide-react';
import type { MemoItem, ListSection, MarkerColor, Attachment } from '@/lib/types';
import { MemoCard } from './MemoCard';
import { useI18n } from '@/lib/i18n';

interface ListSectionViewProps {
  memos: MemoItem[];
  listSections: ListSection[];
  onAddMemo: (
    text: string,
    markerColor: MarkerColor,
    columnId: undefined,
    extraAttachments: Attachment[] | undefined,
    customColor: string | undefined,
    tagIds: string[] | undefined,
    listSectionId: string,
  ) => void;
  onAddMultipleMemos: (
    items: Array<{
      text: string;
      markerColor?: MarkerColor;
      columnId?: string;
      customColor?: string;
      tagIds?: string[];
      listSectionId?: string;
    }>
  ) => void;
  onDeleteMultipleMemos: (ids: string[]) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onSetMarker: (id: string, color: MarkerColor) => void;
  onAddSection: (name: string) => void;
  onRenameSection: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
  onMoveMemoToSection: (memoId: string, sectionId: string, targetIndex?: number) => void;
  onReorderInSection: (memoId: string, sectionId: string, targetIndex: number) => void;
}

export function ListSectionView({
  memos,
  listSections,
  onAddMemo,
  onAddMultipleMemos,
  onDeleteMultipleMemos,
  onToggle,
  onDelete,
  onUpdate,
  onSetMarker,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onToggleCollapsed,
  onMoveMemoToSection,
  onReorderInSection,
}: ListSectionViewProps) {
  const { t } = useI18n();

  // ── Drag state ───────────────────────────────────────────────────────────────
  const [draggingMemoId, setDraggingMemoId] = useState<string | null>(null);
  const [draggingFromSectionId, setDraggingFromSectionId] = useState<string | null>(null);
  const [dropTargetSectionId, setDropTargetSectionId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // ── Section editing ──────────────────────────────────────────────────────────
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // ── Add new section ──────────────────────────────────────────────────────────
  const [addingSectionMode, setAddingSectionMode] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // ── Quick-add per section ────────────────────────────────────────────────────
  const [quickAddSectionId, setQuickAddSectionId] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState('');

  // ── Toast Feedback ───────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Hovered / active section tracking for keyboard shortcuts
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  const sortedSections = [...listSections].sort((a, b) => a.order - b.order);

  const getMemosBySection = (sectionId: string) =>
    memos.filter(m => (m.listSectionId || 'todo') === sectionId);

  // ── Copy, Cut, Paste Section Lists ───────────────────────────────────────────
  const handleCopySection = useCallback(async (sectionId: string) => {
    const sectionMemos = getMemosBySection(sectionId);
    if (sectionMemos.length === 0) return;

    const formattedText = sectionMemos.map(m => m.text).join('\n');
    try {
      await navigator.clipboard.writeText(formattedText);
      showToast(t('listCopied'));
    } catch {
      /* fallback */
    }
  }, [memos, t]);

  const handleCutSection = useCallback(async (sectionId: string) => {
    const sectionMemos = getMemosBySection(sectionId);
    if (sectionMemos.length === 0) return;

    const formattedText = sectionMemos.map(m => m.text).join('\n');
    try {
      await navigator.clipboard.writeText(formattedText);
      onDeleteMultipleMemos(sectionMemos.map(m => m.id));
      showToast(t('listCut'));
    } catch {
      /* fallback */
    }
  }, [memos, onDeleteMultipleMemos, t]);

  const handlePasteToSection = useCallback(async (sectionId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) return;

      // Parse lines
      const lines = text
        .split('\n')
        .map(l => l.replace(/^[-*•\d.]+\s+/, '').trim())
        .filter(l => l.length > 0);

      if (lines.length === 0) return;

      const items = lines.map(line => ({
        text: line,
        markerColor: 'none' as MarkerColor,
        listSectionId: sectionId,
      }));

      onAddMultipleMemos(items);
      showToast(`${lines.length} ${t('listPasted')}`);
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  }, [onAddMultipleMemos, t]);

  // Global Keyboard Shortcuts (Ctrl+C, Ctrl+X, Ctrl+V) when hovering a section
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && hoveredSectionId) {
        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleCopySection(hoveredSectionId);
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          handleCutSection(hoveredSectionId);
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          handlePasteToSection(hoveredSectionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredSectionId, handleCopySection, handleCutSection, handlePasteToSection]);

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const resetDragState = useCallback(() => {
    setDraggingMemoId(null);
    setDraggingFromSectionId(null);
    setDropTargetSectionId(null);
    setDropIndex(null);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, memoId: string, sectionId: string) => {
    e.dataTransfer.setData('memoId', memoId);
    e.dataTransfer.setData('fromSectionId', sectionId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingMemoId(memoId);
    setDraggingFromSectionId(sectionId);
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent, sectionId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropTargetSectionId(sectionId);
    setDropIndex(e.clientY < midY ? index : index + 1);
  }, []);

  const handleSectionContainerDragOver = useCallback((e: React.DragEvent, sectionId: string, sectionLength: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetSectionId !== sectionId) {
      setDropTargetSectionId(sectionId);
      setDropIndex(sectionLength);
    }
  }, [dropTargetSectionId]);

  const handleDrop = useCallback((e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    const memoId = e.dataTransfer.getData('memoId');
    const fromSectionId = e.dataTransfer.getData('fromSectionId');
    if (!memoId) { resetDragState(); return; }

    const targetIdx = dropIndex ?? 0;
    if (fromSectionId === sectionId) {
      onReorderInSection(memoId, sectionId, targetIdx);
    } else {
      onMoveMemoToSection(memoId, sectionId, targetIdx);
    }
    resetDragState();
  }, [dropIndex, onReorderInSection, onMoveMemoToSection, resetDragState]);

  // ── Section rename ───────────────────────────────────────────────────────────
  const startRename = (section: ListSection) => {
    setEditingSectionId(section.id);
    setEditingName(section.name);
  };

  const confirmRename = () => {
    if (editingSectionId && editingName.trim()) {
      onRenameSection(editingSectionId, editingName.trim());
    }
    setEditingSectionId(null);
    setEditingName('');
  };

  // ── Add section ──────────────────────────────────────────────────────────────
  const handleAddSection = () => {
    if (newSectionName.trim()) {
      onAddSection(newSectionName.trim());
      setNewSectionName('');
      setAddingSectionMode(false);
    }
  };

  // ── Quick add ────────────────────────────────────────────────────────────────
  const handleQuickAdd = (sectionId: string) => {
    if (quickAddText.trim()) {
      onAddMemo(quickAddText.trim(), 'none', undefined, undefined, undefined, undefined, sectionId);
      setQuickAddText('');
      setQuickAddSectionId(null);
    }
  };

  const openQuickAdd = (sectionId: string, isCollapsed?: boolean) => {
    setQuickAddSectionId(sectionId);
    setQuickAddText('');
    if (isCollapsed) onToggleCollapsed(sectionId);
  };

  return (
    <div className="flex flex-col gap-5 relative">
      {/* Toast Feedback Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {sortedSections.map(section => {
        const sectionMemos = getMemosBySection(section.id);
        const isCollapsed = section.collapsed;
        const isDropTarget = dropTargetSectionId === section.id;
        const isEditing = editingSectionId === section.id;
        const isDefault = section.id === 'todo' || section.id === 'done';

        return (
          <motion.div
            key={section.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col group/section"
            onMouseEnter={() => setHoveredSectionId(section.id)}
            onMouseLeave={() => setHoveredSectionId(prev => prev === section.id ? null : prev)}
          >
            {/* ── Section Header ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 mb-2 px-1">
              {/* Collapse toggle */}
              <button
                onClick={() => onToggleCollapsed(section.id)}
                className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title={isCollapsed ? 'Expandir' : 'Recolher'}
              >
                {isCollapsed
                  ? <ChevronRight className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />
                }
              </button>

              {/* Name — editable */}
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmRename();
                      if (e.key === 'Escape') { setEditingSectionId(null); }
                    }}
                    onBlur={confirmRename}
                    className="flex-1 min-w-0 bg-transparent border-b border-primary text-sm font-semibold focus:outline-none"
                  />
                  <button onClick={confirmRename} className="text-primary hover:text-primary/80 shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex-1 min-w-0 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                  onDoubleClick={() => startRename(section)}
                  title="Duplo clique para renomear"
                >
                  {section.name}
                </button>
              )}

              {/* Count badge */}
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 min-w-[1.5rem] text-center shrink-0">
                {sectionMemos.length}
              </span>

              {/* Action buttons — visible on section hover */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover/section:opacity-100 transition-opacity">
                {/* Add memo */}
                <button
                  onClick={() => openQuickAdd(section.id, isCollapsed)}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Adicionar memo nesta seção"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                {/* Copy list */}
                {sectionMemos.length > 0 && (
                  <button
                    onClick={() => handleCopySection(section.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title={t('copyList')}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}

                {/* Cut list */}
                {sectionMemos.length > 0 && (
                  <button
                    onClick={() => handleCutSection(section.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title={t('cutList')}
                  >
                    <Scissors className="h-3 w-3" />
                  </button>
                )}

                {/* Paste list */}
                <button
                  onClick={() => handlePasteToSection(section.id)}
                  className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title={t('pasteList')}
                >
                  <ClipboardPaste className="h-3 w-3" />
                </button>

                {/* Rename */}
                {!isEditing && (
                  <button
                    onClick={() => startRename(section)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Renomear seção"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}

                {/* Delete — only for custom sections */}
                {!isDefault && (
                  <button
                    onClick={() => onDeleteSection(section.id)}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Deletar seção (memos vão para 'A fazer')"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Section Body ───────────────────────────────────────────────── */}
            {!isCollapsed && (
              <div
                className={`flex flex-col rounded-xl transition-all duration-200 ${
                  isDropTarget && draggingFromSectionId !== section.id
                    ? 'ring-2 ring-primary/40 bg-primary/5 pb-2'
                    : ''
                }`}
                onDragOver={e => handleSectionContainerDragOver(e, section.id, sectionMemos.length)}
                onDrop={e => handleDrop(e, section.id)}
                onDragLeave={e => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTargetSectionId(null);
                    setDropIndex(null);
                  }
                }}
              >
                {/* Quick-add input */}
                <AnimatePresence>
                  {quickAddSectionId === section.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-2 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-3 py-2.5 shadow-sm">
                        <textarea
                          autoFocus
                          rows={1}
                          value={quickAddText}
                          onChange={e => setQuickAddText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
                                e.preventDefault();
                                const target = e.currentTarget;
                                const start = target.selectionStart;
                                const end = target.selectionEnd;
                                const val = target.value;
                                const next = val.substring(0, start) + '\n' + val.substring(end);
                                setQuickAddText(next);
                                setTimeout(() => {
                                  target.selectionStart = target.selectionEnd = start + 1;
                                }, 0);
                              } else {
                                e.preventDefault();
                                handleQuickAdd(section.id);
                              }
                            }
                            if (e.key === 'Escape') { setQuickAddSectionId(null); setQuickAddText(''); }
                          }}
                          placeholder="Novo memo... (Enter para salvar · Ctrl+Enter pula linha)"
                          className="flex-1 min-w-0 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50"
                        />
                        <button onClick={() => handleQuickAdd(section.id)} className="text-primary hover:text-primary/80 shrink-0">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setQuickAddSectionId(null); setQuickAddText(''); }}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Drop indicator at very top */}
                {isDropTarget && dropIndex === 0 && draggingMemoId && (
                  <div className="h-0.5 bg-primary rounded-full mx-2 mb-1.5" />
                )}

                <AnimatePresence mode="popLayout">
                  {sectionMemos.map((memo, idx) => (
                    <div key={memo.id}>
                      <div
                        draggable
                        onDragStart={e => handleDragStart(e, memo.id, section.id)}
                        onDragEnd={resetDragState}
                        onDragOver={e => handleCardDragOver(e, section.id, idx)}
                        className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 mb-2 group/drag ${
                          draggingMemoId === memo.id ? 'opacity-30 scale-[0.98]' : ''
                        }`}
                      >
                        {/* Grip handle — hidden on mobile */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 opacity-0 group-hover/drag:opacity-50 transition-opacity hidden sm:flex">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <MemoCard
                          memo={memo}
                          onToggle={onToggle}
                          onDelete={onDelete}
                          onUpdate={onUpdate}
                          onSetMarker={onSetMarker}
                        />
                      </div>
                      {/* Drop indicator after card */}
                      {isDropTarget && dropIndex === idx + 1 && draggingMemoId && draggingMemoId !== memo.id && (
                        <div className="h-0.5 bg-primary rounded-full mx-2 mb-1.5" />
                      )}
                    </div>
                  ))}
                </AnimatePresence>

                {/* Empty state */}
                {sectionMemos.length === 0 && quickAddSectionId !== section.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`py-4 px-4 text-xs text-muted-foreground/40 text-center border border-dashed rounded-xl transition-colors ${
                      isDropTarget ? 'border-primary/40 text-primary/40' : 'border-border'
                    }`}
                  >
                    {isDropTarget ? 'Solte aqui' : 'Vazio — arraste memos aqui ou clique em +'}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* ── Add Section ─────────────────────────────────────────────────────── */}
      <div className="mt-1">
        <AnimatePresence mode="wait">
          {addingSectionMode ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-3 py-2.5 shadow-sm">
                <input
                  autoFocus
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSection();
                    if (e.key === 'Escape') { setAddingSectionMode(false); setNewSectionName(''); }
                  }}
                  placeholder="Nome da nova seção..."
                  className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
                />
                <button onClick={handleAddSection} className="text-primary hover:text-primary/80 shrink-0">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setAddingSectionMode(false); setNewSectionName(''); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingSectionMode(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1 rounded-lg hover:bg-accent/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar seção
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
