import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Note, NoteColor, NoteAttachment } from '@/lib/types';
import { deleteMedia } from '@/lib/mediaStore';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useNotes() {
  const [notes, setNotes] = useLocalStorage<Note[]>('memory-notes', []);

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  const addNote = useCallback((): Note => {
    const note: Note = {
      id: generateId(),
      title: '',
      content: '',
      color: 'none',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes(prev => [note, ...prev]);
    return note;
  }, [setNotes]);

  const updateNote = useCallback((id: string, changes: Partial<Pick<Note, 'title' | 'content' | 'color' | 'customColor'>>) => {
    setNotes(prev =>
      prev.map(n =>
        n.id === id ? { ...n, ...changes, updatedAt: Date.now() } : n
      )
    );
  }, [setNotes]);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const note = prev.find(n => n.id === id);
      // Clean up IndexedDB blobs (fire-and-forget is safe here)
      if (note?.noteAttachments) {
        note.noteAttachments.forEach(att => {
          if (att.mediaId) deleteMedia(att.mediaId).catch(console.error);
        });
      }
      return prev.filter(n => n.id !== id);
    });
  }, [setNotes]);

  const addAttachment = useCallback((noteId: string, attachment: NoteAttachment) => {
    setNotes(prev => prev.map(n =>
      n.id === noteId
        ? { ...n, noteAttachments: [...(n.noteAttachments || []), attachment], updatedAt: Date.now() }
        : n
    ));
  }, [setNotes]);

  const removeAttachment = useCallback((noteId: string, attachmentId: string, mediaId?: string) => {
    if (mediaId) deleteMedia(mediaId).catch(console.error);
    setNotes(prev => prev.map(n =>
      n.id === noteId
        ? { ...n, noteAttachments: (n.noteAttachments || []).filter(a => a.id !== attachmentId), updatedAt: Date.now() }
        : n
    ));
  }, [setNotes]);

  const setNoteColor = useCallback((id: string, color: NoteColor) => {
    setNotes(prev =>
      prev.map(n => n.id === id ? { ...n, color, updatedAt: Date.now() } : n)
    );
  }, [setNotes]);

  // ─── Sorted: most-recently-updated first ─────────────────────────────────────
  const sortedNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  return { notes: sortedNotes, addNote, updateNote, deleteNote, setNoteColor, addAttachment, removeAttachment };
}
