import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { MemoItem, MarkerColor, Attachment, BoardColumn } from '@/lib/types';

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

export function useMemos() {
  const [memos, setMemos] = useLocalStorage<MemoItem[]>('memory-memos', []);
  const [columns, setColumns] = useLocalStorage<BoardColumn[]>('memory-columns', [
    { id: 'urgent', name: 'Urgente', order: 0 },
    { id: 'attention', name: 'Atenção', order: 1 },
    { id: 'done', name: 'Concluído', order: 2 },
  ]);

  const addMemo = useCallback((text: string, markerColor: MarkerColor = 'none', columnId?: string, extraAttachments?: Attachment[]) => {
    const attachments = [...detectAttachments(text), ...(extraAttachments || [])];
    const memo: MemoItem = {
      id: generateId(),
      text,
      completed: false,
      markerColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments,
      columnId,
    };
    setMemos(prev => [memo, ...prev]);
  }, [setMemos]);

  const toggleMemo = useCallback((id: string) => {
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, completed: !m.completed, updatedAt: Date.now() } : m
    ));
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
      m.id === id ? { ...m, markerColor: color, updatedAt: Date.now() } : m
    ));
  }, [setMemos]);

  const moveMemoToColumn = useCallback((id: string, columnId: string, targetIndex?: number) => {
    setMemos(prev => {
      const memo = prev.find(m => m.id === id);
      if (!memo) return prev;
      // Remove memo from current position
      const without = prev.filter(m => m.id !== id);
      const updated = { ...memo, columnId, updatedAt: Date.now() };
      
      if (targetIndex !== undefined) {
        // Find memos in the target column to calculate insertion point
        const colMemos = without.filter(m => m.columnId === columnId);
        const clampedIndex = Math.min(targetIndex, colMemos.length);
        
        if (clampedIndex >= colMemos.length) {
          // Insert after last memo in column
          const lastColMemo = colMemos[colMemos.length - 1];
          const globalIndex = lastColMemo ? without.indexOf(lastColMemo) + 1 : without.length;
          without.splice(globalIndex, 0, updated);
        } else {
          // Insert before the memo at targetIndex
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

  const clearCompleted = useCallback(() => {
    setMemos(prev => prev.filter(m => !m.completed));
  }, [setMemos]);

  // Column management
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

  return {
    memos, addMemo, toggleMemo, deleteMemo, updateMemo, setMarkerColor, clearCompleted, moveMemoToColumn, reorderListMemo,
    columns, addColumn, renameColumn, deleteColumn,
  };
}
