import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Trash2, Pencil, X, Save, Palette, Tags } from 'lucide-react';
import type { MemoItem, MarkerColor } from '@/lib/types';
import { AttachmentPreview } from './AttachmentPreview';
import { useI18n } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { useMemos } from '@/hooks/useMemos';
import * as Popover from '@radix-ui/react-popover';
import { getContrastYIQ } from '@/lib/utils';
import { RichContent } from './RichContent';
import { RichTextEditor } from './RichTextEditor';
import { UnifiedColorPicker } from './UnifiedColorPicker';

const markerClasses: Record<MarkerColor, string> = {
  none: '',
  red: 'marker-red',
  orange: 'marker-orange',
  yellow: 'marker-yellow',
  blue: 'marker-blue',
  white: 'marker-white',
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

export function MemoCard({ memo, onToggle, onDelete, onUpdate, compact }: MemoCardProps) {
  const { t, locale } = useI18n();
  const { tags, setCustomColor, setMemoTags } = useMemos();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(memo.text);

  const memoTags = tags.filter((tag) => memo.tagIds?.includes(tag.id));

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(memo.id, editText.trim());
      setEditing(false);
    }
  };

  const toggleTag = (tagId: string) => {
    const newTags = memo.tagIds?.includes(tagId)
      ? memo.tagIds.filter((id) => id !== tagId)
      : [...(memo.tagIds || []), tagId];
    setMemoTags(memo.id, newTags);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-xl border p-4 transition-shadow hover:shadow-md ${
        memo.completed || memo.markerColor !== 'none' || memo.customColor ? 'border-l-4' : 'border border-border'
      } ${
        memo.completed
          ? 'bg-green-100/60 dark:bg-green-900/30 border-green-200 dark:border-green-800'
          : 'bg-card border-border'
      }`}
      style={
        memo.completed
          ? { borderLeftColor: 'rgb(34 197 94)' }
          : {
              ...(memo.customColor
                ? { borderLeftColor: memo.customColor }
                : memo.markerColor !== 'none'
                ? { borderLeftColor: `hsl(var(--marker-${memo.markerColor}))` }
                : {}),
            }
      }
    >
      {/* Topo: checkbox + conteúdo */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(memo.id)}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
            memo.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground/30 hover:border-primary'
          }`}
          title={memo.completed ? 'Desmarcar' : 'Concluir'}
          aria-label={memo.completed ? 'Desmarcar' : 'Concluir'}
        >
          {memo.completed && <Check className="h-3 w-3 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <RichTextEditor
                value={editText}
                onChange={setEditText}
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
                autoFocus
                minHeight={80}
                maxHeight={300}
                toolbarPosition="bottom"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <Save className="h-3 w-3" /> {t('save')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                >
                  <X className="h-3 w-3" /> {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {memoTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {memoTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium shadow-xs"
                      style={{ backgroundColor: tag.color, color: getContrastYIQ(tag.color) }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div
                className={`text-sm leading-relaxed text-foreground px-1 -mx-1 rounded ${
                  memo.completed
                    ? 'bg-green-500/20 dark:bg-green-500/20'
                    : !memo.customColor && markerClasses[memo.markerColor]
                    ? markerClasses[memo.markerColor]
                    : ''
                }`}
                style={
                  memo.completed
                    ? {}
                    : memo.customColor
                    ? { backgroundColor: `color-mix(in srgb, ${memo.customColor} 30%, transparent)` }
                    : {}
                }
              >
                <RichContent content={memo.text} />
              </div>

              {memo.attachments.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  {memo.attachments.map((att, i) => (
                    <AttachmentPreview key={i} attachment={att} compact={compact} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rodapé: timestamp + ações (visíveis no hover) */}
      {!editing && (
        <div className="flex items-center justify-between mt-2 pt-1 ml-7 sm:ml-8 min-h-[28px]">
          <p className="text-xs text-muted-foreground truncate mr-1.5 select-none">
            {formatDistanceToNow(memo.createdAt, { addSuffix: true, locale: dateLocales[locale] })}
          </p>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            {/* Unified Color Picker Popover for Card Color */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-accent transition-colors shrink-0"
                  title={t('cardColor')}
                  aria-label={t('cardColor')}
                >
                  <Palette
                    className="h-3.5 w-3.5"
                    style={memo.customColor ? { color: memo.customColor } : undefined}
                  />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50" sideOffset={5}>
                  <UnifiedColorPicker
                    mode="card"
                    color={memo.customColor}
                    onChange={(c) => setCustomColor(memo.id, c)}
                  />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* Tag Selection Popover */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-accent transition-colors shrink-0"
                  title="Adicionar Tags"
                  aria-label="Adicionar Tags"
                >
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
                      {tags.map((tag) => {
                        const isSelected = memo.tagIds?.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
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

            <button
              type="button"
              onClick={() => {
                setEditText(memo.text);
                setEditing(true);
              }}
              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-accent transition-colors shrink-0"
              title={t('rename')}
              aria-label={t('rename')}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(memo.id)}
              className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors shrink-0"
              title={t('delete')}
              aria-label={t('delete')}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
