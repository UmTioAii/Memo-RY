import { useState } from 'react';
import { ExternalLink, Play, X, Maximize2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Attachment } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s#]+)/);
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/** Fullscreen modal for video/link preview */
function PreviewModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-foreground/80 backdrop-blur-sm flex items-center justify-center p-6 md:p-12"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/90 flex items-center justify-center hover:bg-background transition-colors z-10"
      >
        <X className="h-5 w-5 text-foreground" />
      </button>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Smart link preview - tries to detect if a link is actually an image */
function LinkPreview({ attachment, compact }: { attachment: Attachment; compact?: boolean }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <>
      {/* Try loading as image in background */}
      <img
        src={attachment.url}
        alt=""
        className="hidden"
        onLoad={() => { setIsImage(true); setImageLoaded(true); }}
        onError={() => setIsImage(false)}
      />

      {isImage && imageLoaded ? (
        // Render as image preview
        <>
          <div
            onClick={() => setExpanded(true)}
            className={`mt-2 rounded-lg overflow-hidden border border-border bg-card cursor-pointer group/img ${
              compact ? 'max-w-full' : 'max-w-sm'
            }`}
          >
            <div className="relative aspect-video bg-muted">
              <img src={attachment.url} alt="Preview" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover/img:bg-foreground/20 transition-colors">
                <div className="h-10 w-10 rounded-full bg-background/80 flex items-center justify-center shadow-lg opacity-0 group-hover/img:opacity-100 group-hover/img:scale-110 transition-all">
                  <Maximize2 className="h-4 w-4 text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
              <ImageIcon className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[11px] font-medium text-foreground truncate flex-1">{getDomain(attachment.url)}</span>
              <span className="text-[10px] text-muted-foreground">{t('preview')}</span>
            </div>
          </div>
          <AnimatePresence>
            {expanded && (
              <PreviewModal onClose={() => setExpanded(false)}>
                <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
                  <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[75vh]">
                    <img src={attachment.url} alt="Full preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-t border-border">
                    <span className="text-xs text-muted-foreground truncate">{attachment.url}</span>
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" /> {t('open')}
                    </a>
                  </div>
                </div>
              </PreviewModal>
            )}
          </AnimatePresence>
        </>
      ) : (
        // Generic link card with iframe modal
        <>
          <div
            onClick={() => setExpanded(true)}
            className={`mt-2 flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer ${
              compact ? 'max-w-full' : 'max-w-sm'
            }`}
          >
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{getDomain(attachment.url)}</p>
              <p className="text-[10px] text-muted-foreground truncate">{attachment.url}</p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">{t('preview')}</span>
          </div>
          <AnimatePresence>
            {expanded && (
              <PreviewModal onClose={() => setExpanded(false)}>
                <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
                    <span className="text-xs text-foreground font-medium truncate">{getDomain(attachment.url)}</span>
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" /> {t('openNewTab')}
                    </a>
                  </div>
                  <div className="h-[70vh]">
                    <iframe src={attachment.url} title="Link preview" className="w-full h-full" sandbox="allow-scripts allow-same-origin" />
                  </div>
                </div>
              </PreviewModal>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

interface AttachmentPreviewProps {
  attachment: Attachment;
  compact?: boolean;
}

export function AttachmentPreview({ attachment, compact }: AttachmentPreviewProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (attachment.type === 'video') {
    const ytId = getYouTubeId(attachment.url);
    const vimeoId = getVimeoId(attachment.url);
    const embedUrl = ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1`
      : vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
        : null;
    const thumbUrl = ytId
      ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
      : null;

    return (
      <>
        <div
          onClick={() => setExpanded(true)}
          className={`mt-2 rounded-lg overflow-hidden border border-border bg-card cursor-pointer group/vid ${
            compact ? 'max-w-full' : 'max-w-sm'
          }`}
        >
          <div className="relative aspect-video bg-muted">
            {thumbUrl ? (
              <img src={thumbUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 group-hover/vid:bg-foreground/30 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
            <Play className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate flex-1">
              {ytId ? 'YouTube' : 'Vimeo'} · {getDomain(attachment.url)}
            </span>
            <span className="text-[10px] text-muted-foreground">{t('clickToPlay')}</span>
          </div>
        </div>

        <AnimatePresence>
          {expanded && embedUrl && (
            <PreviewModal onClose={() => setExpanded(false)}>
              <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
                <div className="aspect-video">
                  <iframe src={embedUrl} title="Video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen className="w-full h-full" />
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50">
                  <span className="text-xs text-muted-foreground truncate">{attachment.url}</span>
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="h-3 w-3" /> {t('open')}
                  </a>
                </div>
              </div>
            </PreviewModal>
          )}
          {expanded && !embedUrl && (
            <PreviewModal onClose={() => setExpanded(false)}>
              <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
                <div className="aspect-video">
                  <iframe src={attachment.url} title="Video" className="w-full h-full" allowFullScreen />
                </div>
              </div>
            </PreviewModal>
          )}
        </AnimatePresence>
      </>
    );
  }

  if (attachment.type === 'image') {
    const isBase64 = attachment.isBase64;
    return (
      <>
        <div
          onClick={() => setExpanded(true)}
          className={`mt-2 rounded-lg overflow-hidden border border-border bg-card cursor-pointer group/img ${
            compact ? 'max-w-full' : 'max-w-sm'
          }`}
        >
          <div className="relative aspect-video bg-muted">
            <img src={attachment.url} alt="Attachment" className="w-full h-full object-cover" loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover/img:bg-foreground/20 transition-colors">
              <div className="h-10 w-10 rounded-full bg-background/80 flex items-center justify-center shadow-lg opacity-0 group-hover/img:opacity-100 group-hover/img:scale-110 transition-all">
                <Maximize2 className="h-4 w-4 text-foreground" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
            <ImageIcon className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate flex-1">
              {isBase64 ? 'Imagem anexada' : getDomain(attachment.url)}
            </span>
            <span className="text-[10px] text-muted-foreground">{t('preview')}</span>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <PreviewModal onClose={() => setExpanded(false)}>
              <div className="rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
                <div className="flex items-center justify-center bg-muted/30 p-4 max-h-[75vh]">
                  <img src={attachment.url} alt="Full preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                </div>
                {!isBase64 && (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-t border-border">
                    <span className="text-xs text-muted-foreground truncate">{attachment.url}</span>
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 ml-3"
                      onClick={e => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" /> {t('open')}
                    </a>
                  </div>
                )}
              </div>
            </PreviewModal>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Link preview — smart detection (tries image first, falls back to link card)
  return <LinkPreview attachment={attachment} compact={compact} />;
}