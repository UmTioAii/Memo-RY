import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MemoInput } from '@/components/MemoInput';
import { ListSectionView } from '@/components/ListSectionView';
import { BoardView } from '@/components/BoardView';
import { ViewToggle } from '@/components/ViewToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { TagManager } from '@/components/TagManager';
import { useTheme } from '@/hooks/useTheme';
import { useMemos } from '@/hooks/useMemos';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useI18n } from '@/lib/i18n';
import type { ViewMode } from '@/lib/types';
import './Index.css';

const Index = () => {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const {
    memos,
    addMemo, toggleMemo, deleteMemo, updateMemo, setMarkerColor,
    moveMemoToColumn, reorderInSection, moveMemoToListSection,
    columns, addColumn, renameColumn, deleteColumn, reorderColumns,
    listSections, addListSection, renameListSection, deleteListSection, toggleListSectionCollapsed,
  } = useMemos();

  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('memory-view', 'list');

  // List view: memos without columnId
  const listMemos = useMemo(() => memos.filter(m => !m.columnId), [memos]);
  // Board view: memos with columnId
  const boardMemos = useMemo(() => memos.filter(m => m.columnId), [memos]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none memo-grid-overlay" />

      <div className="relative w-full px-4 md:px-8 py-6 md:py-10">
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8 w-full"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
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
            <TagManager />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <LanguageSwitcher />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </motion.header>

        {/* ── List View ───────────────────────────────────────────────────────── */}
        {viewMode === 'list' ? (
          <div className="max-w-xl mx-auto">
            {/* Main input — always adds to 'todo' section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <MemoInput
                onAdd={(text, color, _colId, att, custColor, tagIds) =>
                  addMemo(text, color, undefined, att, custColor, tagIds, 'todo')
                }
              />
            </motion.div>

            {/* Sectioned list */}
            {listMemos.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <ListSectionView
                  memos={listMemos}
                  listSections={listSections}
                  onAddMemo={addMemo}
                  onToggle={toggleMemo}
                  onDelete={deleteMemo}
                  onUpdate={updateMemo}
                  onSetMarker={setMarkerColor}
                  onAddSection={addListSection}
                  onRenameSection={renameListSection}
                  onDeleteSection={deleteListSection}
                  onToggleCollapsed={toggleListSectionCollapsed}
                  onMoveMemoToSection={moveMemoToListSection}
                  onReorderInSection={reorderInSection}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-foreground mb-1">{t('emptyTitle')}</h2>
                <p className="text-xs text-muted-foreground max-w-xs">{t('emptyDesc')}</p>
              </motion.div>
            )}
          </div>
        ) : (
          /* ── Board View ─────────────────────────────────────────────────────── */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <BoardView
              memos={boardMemos}
              columns={columns}
              onAddMemo={addMemo}
              onToggle={toggleMemo}
              onDelete={deleteMemo}
              onUpdate={updateMemo}
              onSetMarker={setMarkerColor}
              onMoveMemo={moveMemoToColumn}
              onAddColumn={addColumn}
              onRenameColumn={renameColumn}
              onDeleteColumn={deleteColumn}
              onReorderColumns={reorderColumns}
            />
          </motion.div>
        )}

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-[10px] text-muted-foreground">{t('footer')}</p>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
