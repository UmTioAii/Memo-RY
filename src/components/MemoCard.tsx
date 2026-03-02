import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Trash2, Pencil, X, Save } from 'lucide-react';
import type { MemoItem, MarkerColor } from '@/lib/types';
import { MarkerPicker } from './MarkerPicker';
import { AttachmentPreview } from './AttachmentPreview';
import { useI18n } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';

const markerClasses: Record<MarkerColor, string> = {
  none: '',
  yellow: 'marker-yellow',
  green: 'marker-green',
  blue: 'marker-blue',
  pink: 'marker-pink',
  orange: 'marker-orange',
  purple: 'marker-purple',
};

const dateLocales = { pt: ptBR, en: enUS, es };

interface MemoCardProps {
  memo: MemoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onSetMarker: (id: string, color: MarkerColor) => void;
  compact?: boolean;
}

export function MemoCard({ memo, onToggle, onDelete, onUpdate, onSetMarker, compact }: MemoCardProps) {
  const { t, locale } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(memo.text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(memo.id, editText.trim());
      setEditing(false);
    }
  };

  const renderText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
            onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md ${
        memo.markerColor !== 'none' ? 'border-l-4' : ''
      }`}
      style={
        memo.markerColor !== 'none'
          ? { borderLeftColor: `hsl(var(--marker-${memo.markerColor}))` }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(memo.id)}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
            memo.completed ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary'
          }`}
        >
          {memo.completed && <Check className="h-3 w-3 text-primary-foreground" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Save className="h-3 w-3" /> {t('save')}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                  <X className="h-3 w-3" /> {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                memo.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              } ${markerClasses[memo.markerColor] ? `${markerClasses[memo.markerColor]} px-1 -mx-1 rounded` : ''}`}>
                {renderText(memo.text)}
              </p>

              {memo.attachments.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {memo.attachments.map((att, i) => (
                    <AttachmentPreview key={i} attachment={att} compact={compact} />
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                {formatDistanceToNow(memo.createdAt, { addSuffix: true, locale: dateLocales[locale] })}
              </p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <MarkerPicker selected={memo.markerColor} onSelect={(c) => onSetMarker(memo.id, c)} compact />
            <button
              onClick={() => { setEditText(memo.text); setEditing(true); }}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => onDelete(memo.id)}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
