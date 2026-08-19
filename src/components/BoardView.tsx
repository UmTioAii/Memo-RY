import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, Check, X, MoreHorizontal, GripVertical, GripHorizontal, Palette, Tags } from 'lucide-react';
import type { BoardColumn, MemoItem, MarkerColor, Attachment } from '@/lib/types';
import { MemoCard } from './MemoCard';
import { MarkerPicker } from './MarkerPicker';
import { useI18n } from '@/lib/i18n';
import { useMemos } from '@/hooks/useMemos';
import { HexColorPicker } from 'react-colorful';
import * as Popover from '@radix-ui/react-popover';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BoardViewProps {
  memos: MemoItem[];
  columns: BoardColumn[];
  onAddMemo: (text: string, color: MarkerColor, columnId?: string, extraAttachments?: Attachment[]) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onSetMarker: (id: string, color: MarkerColor) => void;
  onMoveMemo: (id: string, columnId: string, targetIndex?: number) => void;
  onAddColumn: (name: string) => void;
  onRenameColumn: (id: string, name: string) => void;
  onDeleteColumn: (id: string) => void;
  onReorderColumns: (activeId: string, overId: string) => void;
}

function ColumnAddCard({ columnId, onAdd }: { columnId: string; onAdd: (text: string, color: MarkerColor, colId: string, attachments?: Attachment[], customColor?: string, tagIds?: string[]) => void }) {
  const { t } = useI18n();
  const { tags, savedColors, saveColor, removeSavedColor } = useMemos();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [marker, setMarker] = useState<MarkerColor>('none');
  const [customColor, setCustomColor] = useState<string | undefined>();
  const [tagIds, setTagIds] = useState<string[]>([]);

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), marker, columnId, undefined, customColor, tagIds);
      setText('');
      setMarker('none');
      setCustomColor(undefined);
      setTagIds([]);
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 w-full px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{t('addMemo')}</span>
      </button>
    );
  }

  return (
    <div className="p-2 bg-card rounded-lg border border-border">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={t('writeSomething')}
        className="w-full rounded-md bg-background border border-input px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        rows={2}
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd();
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <div className="flex items-center justify-between mt-2 gap-1">
        <div className="flex items-center gap-1 shrink-0">
          <MarkerPicker 
            selected={marker} 
            onSelect={(c) => {
              setMarker(c);
              if (c !== 'none') setCustomColor(undefined);
            }} 
            compact 
          />
          
          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-accent transition-colors" title="Cor Customizada">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50 p-3 bg-popover border border-border rounded-xl shadow-xl w-[224px]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium">Cor de Fundo</span>
                  {customColor && (
                    <button onClick={() => setCustomColor(undefined)} className="text-[10px] text-muted-foreground hover:underline">
                      Limpar
                    </button>
                  )}
                </div>
                <div className="flex justify-center">
                  <HexColorPicker 
                    color={customColor || '#ffffff'} 
                    onChange={(c) => {
                      setCustomColor(c);
                      setMarker('none');
                    }} 
                  />
                </div>
                
                <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Cores Salvas</span>
                    <button 
                      onClick={() => saveColor(customColor || '#ffffff')}
                      className="text-[10px] text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Salvar atual
                    </button>
                  </div>
                  {savedColors.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {savedColors.map(color => (
                        <div key={color} className="group/color relative">
                          <button 
                            onClick={() => setCustomColor(color)}
                            className="w-5 h-5 rounded-full border border-border transition-transform hover:scale-110"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSavedColor(color); }}
                            className="absolute -top-1 -right-1 hidden group-hover/color:flex items-center justify-center w-3 h-3 bg-destructive text-destructive-foreground rounded-full shadow-sm z-10"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Nenhuma cor salva.</p>
                  )}
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <Popover.Root>
            <Popover.Trigger asChild>
              <button className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-accent transition-colors" title="Adicionar Tags">
                <Tags className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50 p-2 bg-popover border border-border rounded-xl shadow-xl w-48 max-h-60 overflow-y-auto">
                <div className="mb-2">
                  <span className="text-xs font-medium">Selecionar Tags</span>
                </div>
                {tags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma tag criada.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {tags.map(tag => {
                      const isSelected = tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => setTagIds(prev => isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                          className="flex items-center justify-between p-1.5 text-xs rounded hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                          </div>
                          {isSelected && <Check className="h-3 w-3 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => { setOpen(false); setText(''); setMarker('none'); setCustomColor(undefined); setTagIds([]); }} className="px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground">{t('cancel')}</button>
          <button onClick={handleAdd} disabled={!text.trim()} className="px-2 py-1 text-[10px] bg-primary text-primary-foreground rounded-md disabled:opacity-40">{t('add')}</button>
        </div>
      </div>
    </div>
  );
}

function ColumnHeader({ column, count, onRename, onDelete, dragListeners, dragAttributes }: {
  column: BoardColumn;
  count: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  dragListeners: any;
  dragAttributes: any;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSave = () => {
    if (name.trim()) {
      onRename(column.id, name.trim());
      setEditing(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mb-3 px-1 min-w-0">
      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          />
          <button onClick={handleSave} className="h-6 w-6 shrink-0 rounded flex items-center justify-center hover:bg-accent"><Check className="h-3 w-3" /></button>
          <button onClick={() => setEditing(false)} className="h-6 w-6 shrink-0 rounded flex items-center justify-center hover:bg-accent"><X className="h-3 w-3" /></button>
        </div>
      ) : (
        <>
          <h3 className="text-xs font-semibold text-foreground truncate flex-1">{column.name}</h3>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{count}</span>
          
          <div className="flex items-center shrink-0">
            {column.id !== 'done' && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-accent">
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[110px]">
                    <button onClick={() => { setEditing(true); setMenuOpen(false); }} className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-2">
                      <Pencil className="h-3 w-3" /> {t('rename')}
                    </button>
                    <button onClick={() => { onDelete(column.id); setMenuOpen(false); }} className="w-full px-3 py-1.5 text-xs text-left hover:bg-destructive/10 text-destructive flex items-center gap-2">
                      <Trash2 className="h-3 w-3" /> {t('delete')}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button
              {...dragAttributes}
              {...dragListeners}
              className="h-6 w-6 rounded flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-accent hover:text-foreground text-muted-foreground transition-colors ml-1"
              title="Mover Coluna"
            >
              <GripHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SortableColumnWrapper({ 
  col, 
  colMemos, 
  onRenameColumn, 
  onDeleteColumn, 
  dragOverCol, 
  setDragOverCol,
  setDropIndex,
  handleColumnDrop,
  dropIndex,
  draggingId,
  handleDragStart,
  handleDragEnd,
  handleMemoDragOver,
  onToggle,
  onDelete,
  onUpdate,
  onSetMarker,
  t,
  onAddMemo
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDragOver = dragOverCol === col.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl p-3 border min-w-0 transition-all duration-200 bg-muted/50 border-border/50 ${
        isDragging ? 'opacity-40 shadow-xl scale-[1.02] z-50' : ''
      } ${
        isDragOver && !isDragging
          ? 'bg-primary/5 border-primary/40 ring-2 ring-primary/20'
          : ''
      }`}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.id); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOverCol(null);
          setDropIndex(null);
        }
      }}
      onDrop={e => handleColumnDrop(e, col.id)}
    >
      <ColumnHeader 
        column={col} 
        count={colMemos.length} 
        onRename={onRenameColumn} 
        onDelete={onDeleteColumn} 
        dragAttributes={attributes}
        dragListeners={listeners}
      />

      <div className="flex flex-col min-h-[80px]">
        {/* Drop indicator at top */}
        {dropIndex?.colId === col.id && dropIndex.index === 0 && draggingId && (
          <div className="h-1 bg-primary rounded-full mx-2 mb-1 transition-all" />
        )}

        {colMemos.map((memo: any, idx: number) => (
          <div key={memo.id}>
            <div
              draggable
              onDragStart={e => handleDragStart(e, memo.id)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleMemoDragOver(e, col.id, idx)}
              className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 mb-2 ${
                draggingId === memo.id ? 'opacity-30 scale-95' : ''
              }`}
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 opacity-0 hover:opacity-60 transition-opacity z-10">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <MemoCard
                memo={memo}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onSetMarker={onSetMarker}
                compact
              />
            </div>
            {/* Drop indicator after this memo */}
            {dropIndex?.colId === col.id && dropIndex.index === idx + 1 && draggingId && draggingId !== memo.id && (
              <div className="h-1 bg-primary rounded-full mx-2 mb-1 transition-all" />
            )}
          </div>
        ))}

        {colMemos.length === 0 && (
          <div className={`flex-1 flex items-center justify-center py-6 rounded-lg border-2 border-dashed transition-all duration-200 ${
            isDragOver && !isDragging
              ? 'border-primary/40 bg-primary/5' 
              : 'border-transparent'
          }`}>
            <p className={`text-xs transition-colors ${
              isDragOver && !isDragging ? 'text-primary font-medium' : 'text-muted-foreground/40'
            }`}>
              {isDragOver && !isDragging ? `↓ ${t('dropHere')}` : '—'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2">
        <ColumnAddCard columnId={col.id} onAdd={onAddMemo} />
      </div>
    </div>
  );
}

export function BoardView({
  memos, columns, onAddMemo, onToggle, onDelete, onUpdate, onSetMarker, onMoveMemo,
  onAddColumn, onRenameColumn, onDeleteColumn, onReorderColumns
}: BoardViewProps) {
  const { t } = useI18n();
  const [newColName, setNewColName] = useState('');
  const [addingCol, setAddingCol] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<{ colId: string; index: number } | null>(null);

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  // Configure sensors for column drag and drop
  // Using PointerSensor with a constraint prevents it from interfering with 
  // the native drag events of the memos unless it's dragged a few pixels.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragColumnEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderColumns(active.id as string, over.id as string);
    }
  };

  const handleAddColumn = () => {
    if (newColName.trim()) {
      onAddColumn(newColName.trim());
      setNewColName('');
      setAddingCol(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, memoId: string) => {
    e.dataTransfer.setData('memoId', memoId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(memoId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    setDropIndex(null);
  };

  const handleMemoDragOver = (e: React.DragEvent, colId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const actualIndex = e.clientY < midY ? index : index + 1;
    setDropIndex({ colId, index: actualIndex });
  };

  const handleDrop = (e: React.DragEvent, columnId: string, targetIndex?: number) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggingId(null);
    setDropIndex(null);
    const memoId = e.dataTransfer.getData('memoId');
    if (memoId) onMoveMemo(memoId, columnId, targetIndex);
  };

  const handleColumnDrop = (e: React.DragEvent, columnId: string) => {
    const idx = dropIndex?.colId === columnId ? dropIndex.index : undefined;
    handleDrop(e, columnId, idx);
  };

  return (
    <div className="w-full pb-2">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragColumnEnd}
      >
        <SortableContext 
          items={sortedColumns.map(c => c.id)} 
          strategy={horizontalListSortingStrategy}
        >
          <div
            className="flex flex-col gap-3 md:grid md:gap-3"
            style={{
              gridTemplateColumns: `repeat(${sortedColumns.length}, minmax(180px, 1fr)) auto`,
            } as React.CSSProperties}
          >
            {sortedColumns.map(col => {
              const colMemos = memos.filter(m => m.columnId === col.id);
              return (
                <SortableColumnWrapper
                  key={col.id}
                  col={col}
                  colMemos={colMemos}
                  onRenameColumn={onRenameColumn}
                  onDeleteColumn={onDeleteColumn}
                  dragOverCol={dragOverCol}
                  setDragOverCol={setDragOverCol}
                  setDropIndex={setDropIndex}
                  handleColumnDrop={handleColumnDrop}
                  dropIndex={dropIndex}
                  draggingId={draggingId}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleMemoDragOver={handleMemoDragOver}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onSetMarker={onSetMarker}
                  t={t}
                  onAddMemo={onAddMemo}
                />
              );
            })}

            {/* Add column */}
            <div className="w-full md:min-w-[140px] md:max-w-[200px]">
              {addingCol ? (
                <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
                  <input
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    placeholder={t('columnName')}
                    className="w-full px-2 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setAddingCol(false); }}
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={handleAddColumn} disabled={!newColName.trim()} className="px-2.5 py-1 text-[10px] bg-primary text-primary-foreground rounded-md disabled:opacity-40">{t('create')}</button>
                    <button onClick={() => setAddingCol(false)} className="px-2 py-1 text-[10px] text-muted-foreground">{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCol(true)}
                  className="w-full h-20 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[10px] font-medium">{t('addColumn')}</span>
                </button>
              )}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}