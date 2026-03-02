import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import { GripVertical } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MemoInput } from '@/components/MemoInput';
import { MemoCard } from '@/components/MemoCard';
import { FilterBar } from '@/components/FilterBar';
import { ViewToggle } from '@/components/ViewToggle';
import { BoardView } from '@/components/BoardView';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTheme } from '@/hooks/useTheme';
import { useMemos } from '@/hooks/useMemos';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useI18n } from '@/lib/i18n';
import type { FilterType, ViewMode } from '@/lib/types';
import './Index.css';

const Index = () => {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const {
    memos, addMemo, toggleMemo, deleteMemo, updateMemo, setMarkerColor, clearCompleted, moveMemoToColumn, reorderListMemo,
    columns, addColumn, renameColumn, deleteColumn,
  } = useMemos();
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('memory-view', 'list');

  // List view: only memos WITHOUT columnId
  const listMemos = useMemo(() => memos.filter(m => !m.columnId), [memos]);
  // Board view: only memos WITH columnId
  const boardMemos = useMemo(() => memos.filter(m => m.columnId), [memos]);

  const filteredMemos = useMemo(() => {
    switch (filter) {
      case 'active': return listMemos.filter(m => !m.completed);
      case 'completed': return listMemos.filter(m => m.completed);
      default: return listMemos;
    }
  }, [listMemos, filter]);

  const activeCount = listMemos.filter(m => !m.completed).length;
  const completedCount = listMemos.filter(m => m.completed).length;

  // List drag reorder state
  const [listDraggingId, setListDraggingId] = useState<string | null>(null);
  const [listDropIndex, setListDropIndex] = useState<number | null>(null);

  const handleListDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('listMemoId', id);
    e.dataTransfer.effectAllowed = 'move';
    setListDraggingId(id);
  }, []);

  const handleListDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setListDropIndex(e.clientY < midY ? index : index + 1);
  }, []);

  const handleListDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('listMemoId');
    if (id && listDropIndex !== null) {
      // Map filtered index to actual list index
      const filteredIds = filteredMemos.map(m => m.id);
      const listIds = listMemos.map(m => m.id);
      
      // Find actual target index in listMemos
      if (listDropIndex >= filteredIds.length) {
        const lastFiltered = filteredIds[filteredIds.length - 1];
        const actualIdx = listIds.indexOf(lastFiltered) + 1;
        reorderListMemo(id, actualIdx);
      } else {
        const targetId = filteredIds[listDropIndex];
        const actualIdx = listIds.indexOf(targetId);
        reorderListMemo(id, actualIdx);
      }
    }
    setListDraggingId(null);
    setListDropIndex(null);
  }, [listDropIndex, filteredMemos, listMemos, reorderListMemo]);

  const handleListDragEnd = useCallback(() => {
    setListDraggingId(null);
    setListDropIndex(null);
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none memo-grid-overlay" />

      <div className="relative w-full px-4 md:px-8 py-6 md:py-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 w-full"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">
                Memo<span className="text-primary">RY</span>
              </h1>
              <p className="text-[10px] text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <LanguageSwitcher />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </motion.header>

        {viewMode === 'list' ? (
          <div className="max-w-xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">
              <MemoInput onAdd={addMemo} />
            </motion.div>

            {listMemos.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-3">
                <FilterBar
                  filter={filter}
                  onFilterChange={setFilter}
                  totalCount={listMemos.length}
                  activeCount={activeCount}
                  completedCount={completedCount}
                  onClearCompleted={clearCompleted}
                />
              </motion.div>
            )}

            <div className="flex flex-col" onDrop={handleListDrop} onDragOver={e => e.preventDefault()}>
              {/* Drop indicator at top */}
              {listDropIndex === 0 && listDraggingId && (
                <div className="h-1 bg-primary rounded-full mx-4 mb-1 transition-all" />
              )}
              <AnimatePresence mode="popLayout">
                {filteredMemos.map((memo, idx) => (
                  <div key={memo.id}>
                    <div
                      draggable
                      onDragStart={e => handleListDragStart(e, memo.id)}
                      onDragEnd={handleListDragEnd}
                      onDragOver={e => handleListDragOver(e, idx)}
                      className={`relative cursor-grab active:cursor-grabbing transition-all duration-200 mb-2 group/drag ${
                        listDraggingId === memo.id ? 'opacity-30 scale-[0.98]' : ''
                      }`}
                    >
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 opacity-0 group-hover/drag:opacity-50 transition-opacity">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <MemoCard memo={memo} onToggle={toggleMemo} onDelete={deleteMemo} onUpdate={updateMemo} onSetMarker={setMarkerColor} />
                    </div>
                    {/* Drop indicator after this memo */}
                    {listDropIndex === idx + 1 && listDraggingId && listDraggingId !== memo.id && (
                      <div className="h-1 bg-primary rounded-full mx-4 mb-1 transition-all" />
                    )}
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {listMemos.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-foreground mb-1">{t('emptyTitle')}</h2>
                <p className="text-xs text-muted-foreground max-w-xs">{t('emptyDesc')}</p>
              </motion.div>
            )}

            {filteredMemos.length === 0 && listMemos.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {filter === 'active' ? t('noActive') : t('noCompleted')}
                </p>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <BoardView
              memos={boardMemos} columns={columns} onAddMemo={addMemo} onToggle={toggleMemo}
              onDelete={deleteMemo} onUpdate={updateMemo} onSetMarker={setMarkerColor}
              onMoveMemo={moveMemoToColumn} onAddColumn={addColumn} onRenameColumn={renameColumn} onDeleteColumn={deleteColumn}
            />
          </motion.div>
        )}

        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-12 text-center">
          <p className="text-[10px] text-muted-foreground">{t('footer')}</p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
