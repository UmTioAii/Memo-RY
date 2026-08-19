import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Trash2, Pencil, X, Save, Palette, Tags, Plus } from 'lucide-react';
import type { MemoItem, MarkerColor } from '@/lib/types';
import { MarkerPicker } from './MarkerPicker';
import { AttachmentPreview } from './AttachmentPreview';
import { useI18n } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, es, enUS } from 'date-fns/locale';
import { useMemos } from '@/hooks/useMemos';
import { HexColorPicker } from 'react-colorful';
import * as Popover from '@radix-ui/react-popover';
import { getContrastYIQ } from '@/lib/utils';

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

export function MemoCard({ memo, onToggle, onDelete, onUpdate, onSetMarker, compact }: MemoCardProps) {
  const { t, locale } = useI18n();
  const { tags, setCustomColor, setMemoTags, savedColors, saveColor, removeSavedColor } = useMemos();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(memo.text);

  const memoTags = tags.filter(t => memo.tagIds?.includes(t.id));

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

  const toggleTag = (tagId: string) => {
    const newTags = memo.tagIds?.includes(tagId)
      ? memo.tagIds.filter(id => id !== tagId)
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
        (memo.completed || memo.markerColor !== 'none' || memo.customColor) ? 'border-l-4' : 'border border-border'
      } ${memo.completed ? 'bg-green-100/60 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-card border-border'}`}
      style={
        memo.completed
          ? { borderLeftColor: 'rgb(34 197 94)' }
          : {
              ...(memo.customColor
                ? { borderLeftColor: memo.customColor }
                : (memo.markerColor !== 'none' ? { borderLeftColor: `hsl(var(--marker-${memo.markerColor}))` } : {})
              )
            }
      }
    >
      {/* Topo: checkbox + conteúdo */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(memo.id)}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
            memo.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground/30 hover:border-primary'
          }`}
        >
          {memo.completed && <Check className="h-3 w-3 text-white" />}
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
              {memoTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {memoTags.map(tag => (
                    <span
                      key={tag.id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm"
                      style={{ backgroundColor: tag.color, color: getContrastYIQ(tag.color) }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <p
                className={`text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground px-1 -mx-1 rounded ${
                  memo.completed
                    ? 'bg-green-500/20 dark:bg-green-500/20'
                    : (!memo.customColor && markerClasses[memo.markerColor] ? markerClasses[memo.markerColor] : '')
                }`}
                style={
                  memo.completed
                    ? {}
                    : (memo.customColor ? { backgroundColor: `color-mix(in srgb, ${memo.customColor} 30%, transparent)` } : {})
                }
              >
                {renderText(memo.text)}
              </p>

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
        <div className="flex items-center justify-between mt-2 pt-1 ml-7 sm:ml-8 gap-1">
          <p className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(memo.createdAt, { addSuffix: true, locale: dateLocales[locale] })}
          </p>
          <div className="flex items-center flex-wrap gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <MarkerPicker selected={memo.markerColor} onSelect={(c) => onSetMarker(memo.id, c)} compact />

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
                    {memo.customColor && (
                      <button onClick={() => setCustomColor(memo.id, undefined)} className="text-[10px] text-muted-foreground hover:underline">
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <HexColorPicker color={memo.customColor || '#ffffff'} onChange={(c) => setCustomColor(memo.id, c)} />
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Cores Salvas</span>
                      <button
                        onClick={() => saveColor(memo.customColor || '#ffffff')}
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
                              onClick={() => setCustomColor(memo.id, color)}
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
                        const isSelected = memo.tagIds?.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
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
        </div>
      )}
    </motion.div>
  );
}
