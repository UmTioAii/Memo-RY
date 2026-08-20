import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Send, ImagePlus, X, Tags, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { MarkerColor, Attachment } from '@/lib/types';
import { useMemos } from '@/hooks/useMemos';
import * as Popover from '@radix-ui/react-popover';
import { RichTextEditor } from './RichTextEditor';

interface MemoInputProps {
  onAdd: (
    text: string,
    color: MarkerColor,
    columnId?: string,
    extraAttachments?: Attachment[],
    customColor?: string,
    tagIds?: string[]
  ) => void;
}

export function MemoInput({ onAdd }: MemoInputProps) {
  const { t } = useI18n();
  const { tags } = useMemos();
  const [text, setText] = useState('');
  const [customColor, setCustomColor] = useState<string | undefined>();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [imageAttachments, setImageAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (text.trim() || imageAttachments.length > 0) {
      onAdd(text.trim(), 'none', undefined, imageAttachments, customColor, tagIds);
      setText('');
      setCustomColor(undefined);
      setTagIds([]);
      setImageAttachments([]);
      setExpanded(false);
    }
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImageAttachments((prev) => [...prev, { type: 'image', url: base64, isBase64: true }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <motion.div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm">{t('addNewMemo')}</span>
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <RichTextEditor
            value={text}
            onChange={setText}
            onSubmit={handleSubmit}
            onCancel={() => {
              setExpanded(false);
              setText('');
              setImageAttachments([]);
            }}
            placeholder={t('placeholder')}
            autoFocus
            minHeight={90}
            maxHeight={400}
            cardColor={customColor}
            onCardColorChange={setCustomColor}
            onPasteImages={handleImageUpload}
          />

          {/* Image previews */}
          {imageAttachments.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imageAttachments.map((att, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
                  <img src={att.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('cancel')}
                    aria-label={t('cancel')}
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Adicionar Tags"
                  >
                    <Tags className="h-4 w-4" />
                    <span>Tags {tagIds.length > 0 && `(${tagIds.length})`}</span>
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
                          const isSelected = tagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() =>
                                setTagIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                                )
                              }
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
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                title={t('attachImage')}
                aria-label={t('attachImage')}
              >
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                title={t('attachImage')}
                aria-label={t('attachImage')}
                onChange={(e) => handleImageUpload(e.target.files)}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setText('');
                  setCustomColor(undefined);
                  setImageAttachments([]);
                }}
                className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim() && imageAttachments.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3 w-3" />
                {t('add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}