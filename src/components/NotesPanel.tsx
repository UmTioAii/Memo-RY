import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotebookPen, X, Plus, ArrowLeft, Trash2, Clock, Image, Mic, Link2, MapPin, Check, Palette, UploadCloud, Paperclip } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useNotes } from '@/hooks/useNotes';
import { useMemos } from '@/hooks/useMemos';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useI18n } from '@/lib/i18n';
import { saveMedia, MAX_FILE_SIZE_BYTES } from '@/lib/mediaStore';
import { NoteAttachmentBar } from './NoteAttachmentBar';
import { NoteMediaViewer } from './NoteMediaViewer';
import { RichTextEditor } from './RichTextEditor';
import { UnifiedColorPicker } from './UnifiedColorPicker';
import type { Note, MarkerColor, NoteAttachment } from '@/lib/types';
import './MarkerPicker.css';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isMapUrl(url: string): boolean {
  return /google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|bing\.com\/maps|maps\.apple\.com/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com/i.test(url);
}

const markerClasses: Record<MarkerColor, string> = {
  none: '',
  red: 'marker-red',
  orange: 'marker-orange',
  yellow: 'marker-yellow',
  blue: 'marker-blue',
  white: 'marker-white',
};

// ─── Time helper ──────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (min < 1)  return 'agora';
  if (min < 60) return `${min}min`;
  if (h   < 24) return `${h}h`;
  if (d   < 30) return `${d}d`;
  return new Date(ts).toLocaleDateString();
}

// ─── Attachment count badges for NoteCard ────────────────────────────────────

function AttachmentBadges({ attachments }: { attachments: NoteAttachment[] }) {
  const photos  = attachments.filter(a => a.type === 'photo').length;
  const audios  = attachments.filter(a => a.type === 'audio').length;
  const files   = attachments.filter(a => a.type === 'file').length;
  const links   = attachments.filter(a => a.type === 'link' || a.type === 'video').length;
  const maps    = attachments.filter(a => a.type === 'map').length;

  const badges = [
    { count: photos, Icon: Image },
    { count: audios, Icon: Mic },
    { count: files,  Icon: Paperclip },
    { count: links,  Icon: Link2 },
    { count: maps,   Icon: MapPin },
  ].filter(b => b.count > 0);

  if (badges.length === 0) return null;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {badges.map(({ count, Icon }, i) => (
        <span key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
          <Icon className="h-3 w-3" />
          {count}
        </span>
      ))}
    </div>
  );
}

// ─── Note card (list view) ────────────────────────────────────────────────────

const NoteCard = React.memo(function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
  const { t } = useI18n();
  const rawText = note.content ? note.content.replace(/<[^>]*>/g, ' ') : '';
  const preview = rawText ? rawText.split('\n').find(l => l.trim()) : '';
  const markerClass = markerClasses[note.color || 'none'];

  const customStyle: React.CSSProperties = note.customColor
    ? { backgroundColor: `${note.customColor}18`, borderColor: `${note.customColor}60` }
    : {};

  return (
    <button
      onClick={onClick}
      style={customStyle}
      className={`w-full text-left p-3.5 rounded-xl border border-border bg-card hover:bg-accent/40 transition-all duration-150 group shadow-xs ${
        !note.customColor && markerClass ? markerClass : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {note.title || t('untitled')}
          </p>
          {preview && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {preview}
            </p>
          )}
          {note.noteAttachments && note.noteAttachments.length > 0 && (
            <AttachmentBadges attachments={note.noteAttachments} />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <Clock className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/70 font-mono">{relativeTime(note.updatedAt)}</span>
        </div>
      </div>
    </button>
  );
});

// ─── Note editor ──────────────────────────────────────────────────────────────

interface NoteEditorProps {
  note: Note;
  onBack: () => void;
  onDelete: () => void;
  onChange: (changes: Partial<Pick<Note, 'title' | 'content' | 'color' | 'customColor'>>) => void;
  onAddAttachment: (att: NoteAttachment) => void;
  onRemoveAttachment: (id: string, mediaId?: string) => void;
}

function NoteEditor({ note, onBack, onDelete, onChange, onAddAttachment, onRemoveAttachment }: NoteEditorProps) {
  const { t } = useI18n();
  const { savedColors, saveColor, removeSavedColor } = useMemos();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isEditorDragging, setIsEditorDragging] = useState(false);

  // Local state to completely prevent typing lag
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState<MarkerColor>(note.color || 'none');
  const [customColor, setCustomColor] = useState<string | undefined>(note.customColor);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync to parent debounced
  const syncChanges = useCallback((updates: Partial<Pick<Note, 'title' | 'content' | 'color' | 'customColor'>>) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onChange(updates);
    }, 200);
  }, [onChange]);

  // Cleanup & flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        onChange({ title, content, color, customColor });
      }
    };
  }, [title, content, color, customColor, onChange]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    syncChanges({ title: val, content, color, customColor });
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    syncChanges({ title, content: val, color, customColor });
  };

  const handleColorChange = (c: MarkerColor) => {
    setColor(c);
    setCustomColor(undefined);
    onChange({ color: c, customColor: undefined });
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex);
    setColor('none');
    onChange({ customColor: hex, color: 'none' });
  };

  const handleConfirm = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    onChange({ title, content, color, customColor });
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onBack();
    }, 300);
  };

  // Drag & drop on note editor body
  const handleEditorDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditorDragging) setIsEditorDragging(true);
  };

  const handleEditorDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsEditorDragging(false);
    }
  };

  const handleEditorDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditorDragging(false);

    // Files (Any file type up to 250MB)
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          alert(t('fileTooLarge'));
          continue;
        }

        try {
          const mediaId = await saveMedia(file);
          let type: NoteAttachment['type'] = 'file';
          if (file.type.startsWith('image/')) type = 'photo';
          else if (file.type.startsWith('audio/')) type = 'audio';
          else if (file.type.startsWith('video/')) type = 'video';

          onAddAttachment({
            id: generateId(),
            type,
            mediaId,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            createdAt: Date.now(),
          });
        } catch (err) {
          console.error('Failed to save dropped file:', err);
        }
      }
      return;
    }

    // Links & Text
    const textData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
    if (textData && textData.trim()) {
      const url = textData.trim();
      const isUrl = /^https?:\/\//i.test(url);
      if (isUrl) {
        let type: NoteAttachment['type'] = 'link';
        if (isMapUrl(url)) type = 'map';
        else if (isVideoUrl(url)) type = 'video';
        onAddAttachment({ id: generateId(), type, url, name: url, createdAt: Date.now() });
      } else {
        const newText = content ? `${content}\n${url}` : url;
        setContent(newText);
        syncChanges({ title, content: newText, color, customColor });
      }
    }
  };

  // Paste image or link directly on textarea
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          if (file.size > MAX_FILE_SIZE_BYTES) {
            alert(t('fileTooLarge'));
            return;
          }
          try {
            const mediaId = await saveMedia(file);
            let type: NoteAttachment['type'] = 'file';
            if (file.type.startsWith('image/')) type = 'photo';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else if (file.type.startsWith('video/')) type = 'video';

            onAddAttachment({
              id: generateId(),
              type,
              mediaId,
              name: file.name || 'clipboard-file',
              size: file.size,
              mimeType: file.type,
              createdAt: Date.now(),
            });
          } catch (err) {
            console.error('Failed to save pasted file:', err);
          }
        }
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full relative"
      onDragOver={handleEditorDragOver}
      onDragLeave={handleEditorDragLeave}
      onDrop={handleEditorDrop}
    >
      {/* Drop zone overlay */}
      {isEditorDragging && (
        <div className="absolute inset-0 bg-primary/90 text-primary-foreground backdrop-blur-xs rounded-xl z-50 flex flex-col items-center justify-center p-4 text-center pointer-events-none animate-in fade-in-50 duration-150">
          <UploadCloud className="h-10 w-10 mb-2 animate-bounce" />
          <p className="text-sm font-bold">{t('dropFilesHere')}</p>
          <p className="text-xs opacity-80 mt-1">Imagens, vídeos e links são anexados automaticamente</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0 gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToNotes')}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
              confirmed
                ? 'bg-emerald-500 text-white scale-95'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            {confirmed ? '✓' : t('confirmNote')}
          </button>

          <button
            onClick={onDelete}
            title={t('delete')}
            aria-label={t('delete')}
            className="flex items-center justify-center h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-2 pr-1">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder={t('noteTitle')}
          className="w-full text-base font-semibold bg-transparent border-0 border-b border-border pb-2 focus:outline-none focus:border-primary placeholder:text-muted-foreground/50 transition-colors"
        />

        {/* Content Rich Text Editor */}
        <RichTextEditor
          value={content}
          onChange={handleContentChange}
          placeholder={t('noteContent')}
          submitOnEnter={false}
          minHeight={220}
          maxHeight={550}
          toolbarPosition="top"
          onPasteImages={async (files) => {
            for (const file of Array.from(files)) {
              if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(t('fileTooLarge'));
                continue;
              }
              try {
                const mediaId = await saveMedia(file);
                let type: NoteAttachment['type'] = 'file';
                if (file.type.startsWith('image/')) type = 'photo';
                else if (file.type.startsWith('audio/')) type = 'audio';
                else if (file.type.startsWith('video/')) type = 'video';

                onAddAttachment({
                  id: generateId(),
                  type,
                  mediaId,
                  name: file.name,
                  size: file.size,
                  mimeType: file.type,
                  createdAt: Date.now(),
                });
              } catch (err) {
                console.error('Failed to save pasted file:', err);
              }
            }
          }}
        />

        {/* Media Attachments */}
        {note.noteAttachments && note.noteAttachments.length > 0 && (
          <NoteMediaViewer
            attachments={note.noteAttachments}
            onRemove={onRemoveAttachment}
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="shrink-0 pt-3 border-t border-border space-y-3 mt-1 bg-background pb-3">
        {/* Attachment Action Bar */}
        <NoteAttachmentBar onAdd={onAddAttachment} />

        {/* Unified Color Picker matching MemoInput / MarkerPicker with elevated margin */}
        <div className="flex items-center justify-between pt-1 pb-1.5 px-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t('cardColor')}:</span>
            
            {/* Unified Color Picker Popover */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 hover:bg-accent transition-colors border border-border text-xs text-muted-foreground hover:text-foreground"
                  title={t('cardColor')}
                  aria-label={t('cardColor')}
                >
                  <Palette
                    className="h-3.5 w-3.5"
                    style={customColor ? { color: customColor } : undefined}
                  />
                  {customColor && (
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-border"
                      style={{ backgroundColor: customColor }}
                    />
                  )}
                  <span>{customColor ? 'Customizada' : 'Cor do card'}</span>
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50" sideOffset={5}>
                  <UnifiedColorPicker
                    mode="card"
                    color={customColor}
                    onChange={handleCustomColorChange}
                  />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notes List ───────────────────────────────────────────────────────────────

function NotesList({ notes, onSelect, onNew }: { notes: Note[]; onSelect: (n: Note) => void; onNew: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onNew}
        className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors text-sm font-medium mb-4 shrink-0 shadow-xs"
      >
        <Plus className="h-4 w-4" />
        {t('newNote')}
      </button>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <NotebookPen className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{t('noteEmpty')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('noteEmptyDesc')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 pb-1">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} onClick={() => onSelect(note)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main NotesPanel ──────────────────────────────────────────────────────────

export function NotesPanel() {
  const { t } = useI18n();
  const { notes, addNote, updateNote, deleteNote, addAttachment, removeAttachment } = useNotes();
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Resizable drawer width (Default 480px, Min 380px)
  const [drawerWidth, setDrawerWidth] = useLocalStorage<number>('memory-notes-width', 480);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const newWidth = window.innerWidth - clientX;
      // Enforce bounds: min 380px, max 900px or 92vw
      const boundedWidth = Math.max(380, Math.min(newWidth, Math.min(window.innerWidth - 30, 900)));
      setDrawerWidth(boundedWidth);
    };

    const handleEnd = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
  }, [setDrawerWidth]);

  const handleNew = () => {
    const note = addNote();
    setEditingNote(note);
  };

  const handleSelect = (note: Note) => setEditingNote(note);

  const handleChange = useCallback((changes: Partial<Pick<Note, 'title' | 'content' | 'color' | 'customColor'>>) => {
    if (!editingNote) return;
    updateNote(editingNote.id, changes);
    setEditingNote(prev => prev ? { ...prev, ...changes, updatedAt: Date.now() } : null);
  }, [editingNote, updateNote]);

  const handleDelete = () => {
    if (!editingNote) return;
    deleteNote(editingNote.id);
    setEditingNote(null);
  };

  const handleAddAttachment = useCallback((att: NoteAttachment) => {
    if (!editingNote) return;
    addAttachment(editingNote.id, att);
    setEditingNote(prev => prev
      ? { ...prev, noteAttachments: [...(prev.noteAttachments || []), att], updatedAt: Date.now() }
      : null
    );
  }, [editingNote, addAttachment]);

  const handleRemoveAttachment = useCallback((attachmentId: string, mediaId?: string) => {
    if (!editingNote) return;
    removeAttachment(editingNote.id, attachmentId, mediaId);
    setEditingNote(prev => prev
      ? { ...prev, noteAttachments: (prev.noteAttachments || []).filter(a => a.id !== attachmentId), updatedAt: Date.now() }
      : null
    );
  }, [editingNote, removeAttachment]);

  const handleBack = () => setEditingNote(null);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setEditingNote(null);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button className="h-9 px-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-sm font-medium transition-colors">
          <NotebookPen className="h-4 w-4" />
          <span className="hidden sm:inline">{t('notes')}</span>
          {notes.length > 0 && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {notes.length}
            </span>
          )}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Drawer Content */}
        <Dialog.Content
          style={{ width: `${drawerWidth}px` }}
          className={`fixed right-0 top-0 bottom-0 w-full max-w-[100vw] sm:max-w-[92vw] bg-background border-l border-border shadow-2xl z-50 flex flex-col p-5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200 ${
            isResizing ? 'select-none transition-none' : ''
          }`}
          aria-describedby={undefined}
        >
          {/* Left-edge Resize Handle */}
          <div
            onMouseDown={startResizing}
            onTouchStart={startResizing}
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/30 active:bg-primary transition-colors flex items-center justify-center group z-50 -translate-x-1/2"
            title="Arraste para redimensionar"
          >
            <div className="h-8 w-1 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
          </div>

          {/* Drawer Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <Dialog.Title className="flex items-center gap-2 font-bold text-base">
              <NotebookPen className="h-5 w-5 text-primary" />
              {t('notes')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                aria-label="Fechar"
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {editingNote ? (
              <NoteEditor
                key={editingNote.id}
                note={editingNote}
                onBack={handleBack}
                onDelete={handleDelete}
                onChange={handleChange}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={handleRemoveAttachment}
              />
            ) : (
              <NotesList
                key="list"
                notes={notes}
                onSelect={handleSelect}
                onNew={handleNew}
              />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
