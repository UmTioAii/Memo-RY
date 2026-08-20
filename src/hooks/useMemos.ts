import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { MemoItem, MarkerColor, Attachment, BoardColumn, Tag, ListSection } from '@/lib/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function detectAttachments(text: string): Attachment[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  return urls.map(url => {
    const lower = url.toLowerCase();
    if (/youtube\.com\/watch|youtu\.be\/|vimeo\.com/.test(lower)) {
      return { type: 'video' as const, url };
    }
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(lower) ||
        /unsplash\.com\/photos|imgur\.com|i\.imgur|pbs\.twimg|picsum\.photos|images\.unsplash/i.test(lower)) {
      return { type: 'image' as const, url };
    }
    return { type: 'link' as const, url };
  });
}

const MIGRATION_KEY = 'memory-memos-sorted-v1';
const SECTION_MIGRATION_KEY = 'memory-list-sections-migrated-v1';

export function useMemos() {
  const [memos, setMemos] = useLocalStorage<MemoItem[]>('memory-memos', []);

  // Migration 1: sort existing memos oldest → newest (by createdAt)
  const [migrated, setMigrated] = useLocalStorage<boolean>(MIGRATION_KEY, false);
  useEffect(() => {
    if (!migrated && memos.length > 0) {
      const sorted = [...memos].sort((a, b) => a.createdAt - b.createdAt);
      setMemos(sorted);
      setMigrated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [columns, setColumns] = useLocalStorage<BoardColumn[]>('memory-columns', [
    { id: 'urgent', name: 'Urgente', order: 0 },
    { id: 'attention', name: 'Atenção', order: 1 },
    { id: 'done', name: 'Concluído', order: 2 },
  ]);

  const [listSections, setListSections] = useLocalStorage<ListSection[]>('memory-list-sections', [
    { id: 'todo', name: 'A fazer', order: 0 },
    { id: 'done', name: 'Concluído', order: 1 },
  ]);

  const [tags, setTags] = useLocalStorage<Tag[]>('memory-tags', []);
  const [savedColors, setSavedColors] = useLocalStorage<string[]>('memory-saved-colors', []);

  // Migration 2: assign listSectionId to existing list-view memos
  const [sectionMigrated, setSectionMigrated] = useLocalStorage<boolean>(SECTION_MIGRATION_KEY, false);
  useEffect(() => {
    if (!sectionMigrated) {
      setMemos(prev => prev.map(m => {
        if (m.columnId) return m;         // board memo — skip
        if (m.listSectionId) return m;    // already has section — skip
        return { ...m, listSectionId: m.completed ? 'done' : 'todo' };
      }));
      setSectionMigrated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Memo operations ────────────────────────────────────────────────────────

  const addMemo = useCallback((
    text: string,
    markerColor: MarkerColor = 'none',
    columnId?: string,
    extraAttachments?: Attachment[],
    customColor?: string,
    tagIds?: string[],
    listSectionId?: string,
  ) => {
    const attachments = [...detectAttachments(text), ...(extraAttachments || [])];
    const memo: MemoItem = {
      id: generateId(),
      text,
      completed: false,
      markerColor,
      customColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments,
      columnId,
      // list memos get a section; board memos don't
      listSectionId: columnId ? undefined : (listSectionId || 'todo'),
      tagIds: tagIds || [],
    };
    setMemos(prev => [...prev, memo]);
  }, [setMemos]);

  const addMultipleMemos = useCallback((
    items: Array<{
      text: string;
      markerColor?: MarkerColor;
      columnId?: string;
      customColor?: string;
      tagIds?: string[];
      listSectionId?: string;
    }>
  ) => {
    const newMemos: MemoItem[] = items
      .filter(item => item.text.trim().length > 0)
      .map((item, idx) => ({
        id: generateId() + idx,
        text: item.text.trim(),
        completed: false,
        markerColor: item.markerColor || 'none',
        customColor: item.customColor,
        createdAt: Date.now() + idx,
        updatedAt: Date.now() + idx,
        attachments: detectAttachments(item.text),
        columnId: item.columnId,
        listSectionId: item.columnId ? undefined : (item.listSectionId || 'todo'),
        tagIds: item.tagIds || [],
      }));

    if (newMemos.length > 0) {
      setMemos(prev => [...prev, ...newMemos]);
    }
  }, [setMemos]);

  const deleteMultipleMemos = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setMemos(prev => prev.filter(m => !set.has(m.id)));
  }, [setMemos]);

  const toggleMemo = useCallback((id: string) => {
    setMemos(prev => prev.map(m => {
      if (m.id !== id) return m;
      const isNowCompleted = !m.completed;

      // Board view memo: keep existing columnId-based behavior
      if (m.columnId) {
        if (isNowCompleted) {
          return { ...m, completed: true, previousColumnId: m.columnId, columnId: 'done', updatedAt: Date.now() };
        } else {
          return { ...m, completed: false, columnId: m.previousColumnId, updatedAt: Date.now() };
        }
      }

      // List view memo: move between list sections instead of disappearing
      return {
        ...m,
        completed: isNowCompleted,
        listSectionId: isNowCompleted ? 'done' : 'todo',
        updatedAt: Date.now(),
      };
    }));
  }, [setMemos]);

  const deleteMemo = useCallback((id: string) => {
    setMemos(prev => prev.filter(m => m.id !== id));
  }, [setMemos]);

  const updateMemo = useCallback((id: string, text: string) => {
    const attachments = detectAttachments(text);
    setMemos(prev => prev.map(m =>
      m.id === id ? {
        ...m,
        text,
        attachments: [...attachments, ...m.attachments.filter(a => a.isBase64)],
        updatedAt: Date.now()
      } : m
    ));
  }, [setMemos]);

  const setMarkerColor = useCallback((id: string, color: MarkerColor) => {
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, markerColor: color, customColor: undefined, updatedAt: Date.now() } : m
    ));
  }, [setMemos]);

  const setCustomColor = useCallback((id: string, color?: string) => {
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, customColor: color, markerColor: color ? 'none' : m.markerColor, updatedAt: Date.now() } : m
    ));
  }, [setMemos]);

  const setMemoTags = useCallback((id: string, tagIds: string[]) => {
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, tagIds, updatedAt: Date.now() } : m
    ));
  }, [setMemos]);

  // ─── Board: move memo to column (kanban drag-drop) ───────────────────────────

  const moveMemoToColumn = useCallback((id: string, columnId: string, targetIndex?: number) => {
    setMemos(prev => {
      const memo = prev.find(m => m.id === id);
      if (!memo) return prev;

      const isNowDone = columnId === 'done';
      const without = prev.filter(m => m.id !== id);

      const updated: MemoItem = {
        ...memo,
        columnId,
        completed: isNowDone,
        previousColumnId: isNowDone && memo.columnId !== 'done' ? memo.columnId : memo.previousColumnId,
        updatedAt: Date.now()
      };

      if (targetIndex !== undefined) {
        const colMemos = without.filter(m => m.columnId === columnId);
        const clampedIndex = Math.min(targetIndex, colMemos.length);
        if (clampedIndex >= colMemos.length) {
          const lastColMemo = colMemos[colMemos.length - 1];
          const globalIndex = lastColMemo ? without.indexOf(lastColMemo) + 1 : without.length;
          without.splice(globalIndex, 0, updated);
        } else {
          const targetMemo = colMemos[clampedIndex];
          const globalIndex = without.indexOf(targetMemo);
          without.splice(globalIndex, 0, updated);
        }
        return without;
      }

      return without.map(m => m.id === id ? updated : m).length === without.length
        ? [updated, ...without]
        : without;
    });
  }, [setMemos]);

  // ─── List: reorder within same section ──────────────────────────────────────

  const reorderInSection = useCallback((memoId: string, sectionId: string, targetIndex: number) => {
    setMemos(prev => {
      const listMemos = prev.filter(m => !m.columnId);
      const boardMemos = prev.filter(m => m.columnId);
      const sectionMemos = listMemos.filter(m => (m.listSectionId || 'todo') === sectionId);
      const dragged = sectionMemos.find(m => m.id === memoId);
      if (!dragged) return prev;
      const withoutDragged = sectionMemos.filter(m => m.id !== memoId);
      const clamped = Math.min(targetIndex, withoutDragged.length);
      withoutDragged.splice(clamped, 0, dragged);
      let sectionIdx = 0;
      const newList = listMemos.map(m =>
        (m.listSectionId || 'todo') === sectionId ? withoutDragged[sectionIdx++] : m
      );
      return [...newList, ...boardMemos];
    });
  }, [setMemos]);

  // ─── List: move memo to a different section ──────────────────────────────────

  const moveMemoToListSection = useCallback((memoId: string, sectionId: string, targetIndex?: number) => {
    setMemos(prev => {
      const memo = prev.find(m => m.id === memoId);
      if (!memo) return prev;
      const isNowDone = sectionId === 'done';
      const updated: MemoItem = {
        ...memo,
        listSectionId: sectionId,
        completed: isNowDone,
        updatedAt: Date.now(),
      };
      const without = prev.filter(m => m.id !== memoId);

      if (targetIndex !== undefined) {
        const sectionMemos = without.filter(m => !m.columnId && (m.listSectionId || 'todo') === sectionId);
        const clamped = Math.min(targetIndex, sectionMemos.length);
        if (clamped >= sectionMemos.length) {
          const lastMemo = sectionMemos[sectionMemos.length - 1];
          const globalIdx = lastMemo ? without.indexOf(lastMemo) + 1 : without.length;
          without.splice(globalIdx, 0, updated);
        } else {
          const targetMemo = sectionMemos[clamped];
          const globalIdx = without.indexOf(targetMemo);
          without.splice(globalIdx, 0, updated);
        }
        return without;
      }

      return [...without, updated];
    });
  }, [setMemos]);

  // Legacy: kept for compatibility with board reorder
  const reorderListMemo = useCallback((id: string, targetIndex: number) => {
    setMemos(prev => {
      const memo = prev.find(m => m.id === id);
      if (!memo) return prev;
      const listMemos = prev.filter(m => !m.columnId);
      const boardMemos = prev.filter(m => m.columnId);
      const withoutDragged = listMemos.filter(m => m.id !== id);
      const clamped = Math.min(targetIndex, withoutDragged.length);
      withoutDragged.splice(clamped, 0, memo);
      return [...withoutDragged, ...boardMemos];
    });
  }, [setMemos]);

  // ─── Board: reorder columns ──────────────────────────────────────────────────

  const reorderColumns = useCallback((activeId: string, overId: string) => {
    setColumns(prev => {
      const oldIndex = prev.findIndex(c => c.id === activeId);
      const newIndex = prev.findIndex(c => c.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newCols = [...prev];
      const [moved] = newCols.splice(oldIndex, 1);
      newCols.splice(newIndex, 0, moved);
      return newCols.map((col, idx) => ({ ...col, order: idx }));
    });
  }, [setColumns]);

  const clearCompleted = useCallback(() => {
    setMemos(prev => prev.filter(m => !m.completed));
  }, [setMemos]);

  // ─── Board: column management ────────────────────────────────────────────────

  const addColumn = useCallback((name: string) => {
    const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order)) : -1;
    setColumns(prev => [...prev, { id: generateId(), name, order: maxOrder + 1 }]);
  }, [columns, setColumns]);

  const renameColumn = useCallback((id: string, name: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  }, [setColumns]);

  const deleteColumn = useCallback((id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id));
    setMemos(prev => prev.map(m => m.columnId === id ? { ...m, columnId: undefined } : m));
  }, [setColumns, setMemos]);

  // ─── List: section management ────────────────────────────────────────────────

  const addListSection = useCallback((name: string) => {
    const maxOrder = listSections.length > 0 ? Math.max(...listSections.map(s => s.order)) : -1;
    setListSections(prev => [...prev, { id: generateId(), name, order: maxOrder + 1 }]);
  }, [listSections, setListSections]);

  const renameListSection = useCallback((id: string, name: string) => {
    setListSections(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  }, [setListSections]);

  const deleteListSection = useCallback((id: string) => {
    // Protect default sections
    if (id === 'todo' || id === 'done') return;
    setListSections(prev => prev.filter(s => s.id !== id));
    // Move orphaned memos to 'todo'
    setMemos(prev => prev.map(m => m.listSectionId === id ? { ...m, listSectionId: 'todo' } : m));
  }, [setListSections, setMemos]);

  const toggleListSectionCollapsed = useCallback((id: string) => {
    setListSections(prev => prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
  }, [setListSections]);

  // ─── Tag management ──────────────────────────────────────────────────────────

  const addTag = useCallback((name: string, color: string) => {
    setTags(prev => [...prev, { id: generateId(), name, color }]);
  }, [setTags]);

  const updateTag = useCallback((id: string, name: string, color: string) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, name, color } : t));
  }, [setTags]);

  const deleteTag = useCallback((id: string) => {
    setTags(prev => prev.filter(t => t.id !== id));
    setMemos(prev => prev.map(m => ({
      ...m,
      tagIds: m.tagIds?.filter(tId => tId !== id)
    })));
  }, [setTags, setMemos]);

  // ─── Saved Custom Colors ─────────────────────────────────────────────────────

  const saveColor = useCallback((color: string) => {
    setSavedColors(prev => {
      if (prev.includes(color)) return prev;
      return [...prev, color];
    });
  }, [setSavedColors]);

  const removeSavedColor = useCallback((color: string) => {
    setSavedColors(prev => prev.filter(c => c !== color));
  }, [setSavedColors]);

  return {
    memos, addMemo, addMultipleMemos, deleteMultipleMemos, toggleMemo, deleteMemo, updateMemo, setMarkerColor, setCustomColor, setMemoTags,
    clearCompleted, moveMemoToColumn, reorderListMemo, reorderInSection, moveMemoToListSection,
    columns, addColumn, renameColumn, deleteColumn, reorderColumns,
    listSections, addListSection, renameListSection, deleteListSection, toggleListSectionCollapsed,
    tags, addTag, updateTag, deleteTag,
    savedColors, saveColor, removeSavedColor,
  };
}
