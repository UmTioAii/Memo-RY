import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, Check, Pencil, X } from 'lucide-react';
import type { MemoItem, ListSection, MarkerColor, Attachment } from '@/lib/types';
import { MemoCard } from './MemoCard';

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

  const sortedSections = [...listSections].sort((a, b) => a.order - b.order);

  const getMemosBySection = (sectionId: string) =>
    memos.filter(m => (m.listSectionId || 'todo') === sectionId);

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

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5">
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
                        <input
                          autoFocus
                          value={quickAddText}
                          onChange={e => setQuickAddText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleQuickAdd(section.id);
                            if (e.key === 'Escape') { setQuickAddSectionId(null); setQuickAddText(''); }
                          }}
                          placeholder="Novo memo... (Enter para confirmar)"
                          className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50"
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
