import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Send, ImagePlus, X } from 'lucide-react';
import { MarkerPicker } from './MarkerPicker';
import { useI18n } from '@/lib/i18n';
import type { MarkerColor, Attachment } from '@/lib/types';

interface MemoInputProps {
  onAdd: (text: string, color: MarkerColor, columnId?: string, extraAttachments?: Attachment[]) => void;
}

export function MemoInput({ onAdd }: MemoInputProps) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [marker, setMarker] = useState<MarkerColor>('none');
  const [expanded, setExpanded] = useState(false);
  const [imageAttachments, setImageAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (text.trim() || imageAttachments.length > 0) {
      onAdd(text.trim(), marker, undefined, imageAttachments);
      setText('');
      setMarker('none');
      setImageAttachments([]);
      setExpanded(false);
    }
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setImageAttachments(prev => [...prev, { type: 'image', url: base64, isBase64: true }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageUpload(new DataTransfer().files.length ? null : (() => { const dt = new DataTransfer(); dt.items.add(file); return dt.files; })());
      }
    }
  };

  const removeImage = (index: number) => {
    setImageAttachments(prev => prev.filter((_, i) => i !== index));
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
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('placeholder')}
            className="w-full rounded-lg bg-background border border-input px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            rows={3}
            autoFocus
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              if (e.key === 'Escape') { setExpanded(false); setText(''); setImageAttachments([]); }
            }}
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
            <div className="flex items-center gap-1">
              <MarkerPicker selected={marker} onSelect={setMarker} />
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
                onClick={() => { setExpanded(false); setText(''); setMarker('none'); setImageAttachments([]); }}
                className="px-3 py-1.5 text-xs rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() && imageAttachments.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3 w-3" />
                {t('add')}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('tip')}</p>
        </div>
      )}
    </motion.div>
  );
}