import React, { useState, useEffect, useRef } from 'react';
import {
  X, Play, Pause, Maximize2, Navigation, Copy, Check, ExternalLink, Mic,
  Download, Share2, FileText, FileArchive, FileCode, FileSpreadsheet, File, Video, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMediaUrl, downloadMediaFile, shareMediaFile, formatFileSize } from '@/lib/mediaStore';
import { AttachmentPreview } from './AttachmentPreview';
import { useI18n } from '@/lib/i18n';
import type { NoteAttachment } from '@/lib/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function getMapCoords(url: string): { lat: number; lng: number } | null {
  const m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  const q = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  return null;
}

function getMapEmbedUrl(url: string): string {
  const coords = getMapCoords(url);
  if (coords) {
    return `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&output=embed&z=15`;
  }
  const placeMatch = url.match(/place\/([^/@?]+)/);
  if (placeMatch) {
    const place = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&output=embed`;
  }
  const cleaned = url.replace(/[?&]output=[^&]*/g, '');
  return cleaned + (cleaned.includes('?') ? '&' : '?') + 'output=embed';
}

function getFileIcon(name?: string, mime?: string) {
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  if (mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return ImageIcon;
  }
  if (mime?.startsWith('video/') || ['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) {
    return Video;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return FileArchive;
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'java', 'cpp', 'c', 'rs', 'go'].includes(ext)) {
    return FileCode;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return FileSpreadsheet;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) {
    return FileText;
  }
  return File;
}

// ─── Photo item ───────────────────────────────────────────────────────────────

const PhotoItem = React.memo(function PhotoItem({ att, onRemove }: { att: NoteAttachment; onRemove: () => void }) {
  const { t } = useI18n();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!att.mediaId) return;
    let isCurrent = true;
    let url = '';
    getMediaUrl(att.mediaId).then(u => {
      if (u && isCurrent) {
        url = u;
        setObjectUrl(u);
      }
    }).catch(console.error);
    return () => {
      isCurrent = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [att.mediaId]);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (att.mediaId) downloadMediaFile(att.mediaId, att.name || 'foto.jpg');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (att.mediaId) shareMediaFile(att.mediaId, att.name || 'foto.jpg', att.mimeType);
  };

  return (
    <>
      <div
        className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted cursor-pointer group shrink-0"
        onClick={() => setExpanded(true)}
      >
        {objectUrl ? (
          <img src={objectUrl} alt={att.name || 'foto'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full animate-pulse bg-muted" />
        )}

        {/* Hover overlay with action buttons */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
          <button
            title={t('preview')}
            aria-label={t('preview')}
            className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {att.mediaId && (
            <>
              <button
                onClick={handleDownload}
                title={t('download')}
                aria-label={t('download')}
                className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleShare}
                title={t('share')}
                aria-label={t('share')}
                className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Delete button */}
        <button
          aria-label="Remover foto"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {expanded && objectUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setExpanded(false)}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {att.mediaId && (
                <>
                  <button
                    onClick={handleDownload}
                    title={t('download')}
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors text-white"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleShare}
                    title={t('share')}
                    className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors text-white"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                aria-label="Fechar"
                onClick={() => setExpanded(false)}
                className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/25 transition-colors text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <motion.img
              initial={{ scale: 0.88 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.88 }}
              src={objectUrl}
              alt={att.name || 'foto'}
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// ─── Audio item ───────────────────────────────────────────────────────────────

const AudioItem = React.memo(function AudioItem({ att, onRemove }: { att: NoteAttachment; onRemove: () => void }) {
  const { t } = useI18n();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(att.duration && isFinite(att.duration) ? att.duration : 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!att.mediaId) return;
    let isCurrent = true;
    let url = '';
    getMediaUrl(att.mediaId).then(u => {
      if (u && isCurrent) {
        url = u;
        setObjectUrl(u);
      }
    }).catch(console.error);
    return () => {
      isCurrent = false;
      audioRef.current?.pause();
      if (url) URL.revokeObjectURL(url);
    };
  }, [att.mediaId]);

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (isFinite(dur) && !isNaN(dur) && dur > 0) {
      setAudioDuration(dur);
    } else if (att.duration && isFinite(att.duration)) {
      setAudioDuration(att.duration);
    } else {
      audioRef.current.currentTime = 1e10;
      setTimeout(() => {
        if (!audioRef.current) return;
        const calcDur = audioRef.current.duration;
        if (isFinite(calcDur) && !isNaN(calcDur)) {
          setAudioDuration(calcDur);
        }
        audioRef.current.currentTime = 0;
      }, 50);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(p => !p);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (att.mediaId) downloadMediaFile(att.mediaId, `${att.name || 'audio'}.webm`);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (att.mediaId) shareMediaFile(att.mediaId, `${att.name || 'audio'}.webm`, att.mimeType || 'audio/webm');
  };

  const safeDuration = audioDuration > 0 ? audioDuration : (att.duration || 0);
  const progress = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border/80 rounded-xl group relative shadow-xs hover:border-primary/40 transition-colors">
      <audio
        ref={audioRef}
        src={objectUrl ?? undefined}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setPlaying(false); setCurrentTime(0); if (audioRef.current) audioRef.current.currentTime = 0; }}
      />

      <button
        onClick={togglePlay}
        disabled={!objectUrl}
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
        className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-40 shadow-sm"
      >
        {playing
          ? <Pause className="h-4.5 w-4.5 text-primary-foreground" fill="currentColor" />
          : <Play className="h-4.5 w-4.5 text-primary-foreground ml-0.5" fill="currentColor" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
            <Mic className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{att.name || t('voiceNote')}</span>
          </span>
          <span className="text-[11px] text-muted-foreground font-mono font-medium shrink-0 ml-1">
            {formatTime(currentTime)} / {formatTime(safeDuration)}
          </span>
        </div>

        {/* Progress seek bar */}
        <div
          className="h-2 bg-muted rounded-full overflow-hidden cursor-pointer relative group/bar"
          onClick={e => {
            if (!audioRef.current || safeDuration === 0) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = ratio * safeDuration;
          }}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-75 relative"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      </div>

      {/* Quick Action Icons */}
      <div className="flex items-center gap-1 shrink-0">
        {att.mediaId && (
          <>
            <button
              onClick={handleDownload}
              title={t('download')}
              aria-label={t('download')}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleShare}
              title={t('share')}
              aria-label={t('share')}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          aria-label="Remover áudio"
          onClick={onRemove}
          title={t('delete')}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

// ─── Generic File Item (Document, PDF, ZIP, any file up to 250MB) ─────────────

const GenericFileItem = React.memo(function GenericFileItem({ att, onRemove }: { att: NoteAttachment; onRemove: () => void }) {
  const { t } = useI18n();
  const Icon = getFileIcon(att.name, att.mimeType);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (att.mediaId) downloadMediaFile(att.mediaId, att.name || 'arquivo');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (att.mediaId) shareMediaFile(att.mediaId, att.name || 'arquivo', att.mimeType);
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-card border border-border/80 rounded-xl hover:border-primary/40 transition-colors group shadow-xs">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs font-semibold text-foreground truncate" title={att.name}>
            {att.name || 'Arquivo'}
          </span>
          {att.size && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatFileSize(att.size)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {att.mediaId && (
          <>
            <button
              onClick={handleDownload}
              title={t('download')}
              aria-label={t('download')}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleShare}
              title={t('share')}
              aria-label={t('share')}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          onClick={onRemove}
          title={t('delete')}
          aria-label={t('delete')}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
});

// ─── Map item ─────────────────────────────────────────────────────────────────

const MapItem = React.memo(function MapItem({ att, onRemove }: { att: NoteAttachment; onRemove: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = att.url ?? '';
  const embedUrl = getMapEmbedUrl(url);
  const coords = getMapCoords(url);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoute = () => {
    const dest = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(url);
    navigator.geolocation.getCurrentPosition(
      ({ coords: cur }) => {
        window.open(`https://www.google.com/maps/dir/?api=1&origin=${cur.latitude},${cur.longitude}&destination=${dest}`, '_blank');
      },
      () => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
      },
    );
  };

  const label = att.name
    ? att.name
    : coords
      ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      : getDomain(url);

  return (
    <div className="border border-border rounded-xl overflow-hidden group relative">
      {/* Map iframe */}
      <div className="h-44 bg-muted">
        <iframe
          src={embedUrl}
          title="Mapa"
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-card">
        <span className="text-xs text-muted-foreground truncate flex-1">{label}</span>

        <button onClick={handleCopy} title={t('copyLink')} aria-label={t('copyLink')}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        <button onClick={handleRoute} title={t('getRoute')} aria-label={t('getRoute')}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground">
          <Navigation className="h-3.5 w-3.5" />
        </button>

        <a href={url} target="_blank" rel="noopener noreferrer" title={t('openMap')} aria-label={t('openMap')}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <button
        aria-label="Remover mapa"
        onClick={onRemove}
        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
      >
        <X className="h-3.5 w-3.5 text-white" />
      </button>
    </div>
  );
});

// ─── Link / Video wrapper ─────────────────────────────────────────────────────

const LinkOrVideoItem = React.memo(function LinkOrVideoItem({ att, onRemove }: { att: NoteAttachment; onRemove: () => void }) {
  return (
    <div className="relative group">
      <AttachmentPreview
        attachment={{ type: att.type as 'link' | 'video', url: att.url ?? '' }}
        compact
      />
      <button
        aria-label="Remover link"
        onClick={onRemove}
        className="absolute top-3 right-2 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
      >
        <X className="h-3 w-3 text-white" />
      </button>
    </div>
  );
});

// ─── Main NoteMediaViewer ─────────────────────────────────────────────────────

interface NoteMediaViewerProps {
  attachments: NoteAttachment[];
  onRemove: (id: string, mediaId?: string) => void;
}

export function NoteMediaViewer({ attachments, onRemove }: NoteMediaViewerProps) {
  const photos = attachments.filter(a => a.type === 'photo');
  const audios = attachments.filter(a => a.type === 'audio');
  const files  = attachments.filter(a => a.type === 'file');
  const maps   = attachments.filter(a => a.type === 'map');
  const links  = attachments.filter(a => a.type === 'link' || a.type === 'video');

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence initial={false}>
            {photos.map(att => (
              <motion.div
                key={att.id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
              >
                <PhotoItem att={att} onRemove={() => onRemove(att.id, att.mediaId)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Audio cards */}
      <AnimatePresence initial={false}>
        {audios.map(att => (
          <motion.div
            key={att.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <AudioItem att={att} onRemove={() => onRemove(att.id, att.mediaId)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Generic File cards */}
      <AnimatePresence initial={false}>
        {files.map(att => (
          <motion.div
            key={att.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <GenericFileItem att={att} onRemove={() => onRemove(att.id, att.mediaId)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Link / Video cards */}
      <AnimatePresence initial={false}>
        {links.map(att => (
          <motion.div
            key={att.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <LinkOrVideoItem att={att} onRemove={() => onRemove(att.id)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Map cards */}
      <AnimatePresence initial={false}>
        {maps.map(att => (
          <motion.div
            key={att.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <MapItem att={att} onRemove={() => onRemove(att.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
