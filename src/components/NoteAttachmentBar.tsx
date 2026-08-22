import { useState, useRef } from 'react';
import { Paperclip, Link2, MapPin, Loader2, X } from 'lucide-react';
import { saveMedia, MAX_FILE_SIZE_BYTES } from '@/lib/mediaStore';
import { useI18n } from '@/lib/i18n';
import type { NoteAttachment } from '@/lib/types';
import { MediaRecorderControls } from './MediaRecorderControls';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isMapUrl(url: string): boolean {
  return /google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|bing\.com\/maps|maps\.apple\.com/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com/i.test(url);
}

interface NoteAttachmentBarProps {
  onAdd: (attachment: NoteAttachment) => void;
  onRemove?: (id: string, mediaId?: string) => void;
  onError?: (msg: string) => void;
}

export function NoteAttachmentBar({ onAdd, onRemove, onError }: NoteAttachmentBarProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Universal File Upload (up to 250MB) ──────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        if (onError) onError(t('fileTooLarge'));
        continue;
      }

      try {
        const mediaId = await saveMedia(file);
        let type: NoteAttachment['type'] = 'file';
        if (file.type.startsWith('image/')) type = 'photo';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else if (file.type.startsWith('video/')) type = 'video';

        onAdd({
          id: generateId(),
          type,
          mediaId,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error('Failed to save file:', err);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Handle recording save ─────────────────────────────────────────────────

  const handleRecordingSave = async (blob: Blob, type: 'audio' | 'video') => {
    try {
      const mediaId = await saveMedia(blob);
      const attachment: NoteAttachment = {
        id: generateId(),
        type,
        mediaId,
        name: `${type}-${new Date().toISOString().slice(0, 10)}.webm`,
        size: blob.size,
        mimeType: blob.type,
        createdAt: Date.now(),
      };
      onAdd(attachment);
      return attachment;
    } catch (err) {
      console.error('Failed to save recording:', err);
      if (onError) onError(t('failedToSaveRecording'));
      return null;
    }
  };

  // ── Link input ──────────────────────────────────────────────────────────────

  const handleAddLink = () => {
    const raw = linkValue.trim();
    if (!raw) return;

    // Extract URL if they pasted text containing a URL (e.g. address + link from Google Maps share)
    const urlMatch = raw.match(/(https?:\/\/[^\s]+)/);
    let url = urlMatch ? urlMatch[1] : raw;

    // Ensure it has a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    let type: NoteAttachment['type'];
    if (isMapUrl(url)) type = 'map';
    else if (isVideoUrl(url)) type = 'video';
    else type = 'link';

    onAdd({ id: generateId(), type, url, name: url, createdAt: Date.now() });
    setLinkValue('');
    setShowLinkInput(false);
  };

  // ── Current location ────────────────────────────────────────────────────────

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocationError(false);
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        onAdd({
          id: generateId(),
          type: 'map',
          url,
          name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          createdAt: Date.now(),
        });
        setLocationLoading(false);
      },
      () => {
        setLocationError(true);
        setLocationLoading(false);
      },
    );
  };

  return (
    <div className="shrink-0 space-y-2.5">
      {/* Link URL input */}
      {showLinkInput && (
        <div className="flex gap-1.5 animate-in fade-in-50 duration-150">
          <input
            autoFocus
            type="url"
            value={linkValue}
            onChange={e => setLinkValue(e.target.value)}
            placeholder={t('pasteUrl')}
            className="flex-1 h-8 px-2.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddLink();
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkValue(''); }
            }}
          />
          <button
            onClick={handleAddLink}
            className="h-8 px-3 bg-primary text-primary-foreground text-xs rounded-lg font-medium"
          >
            {t('addUrlBtn')}
          </button>
          <button
            onClick={() => { setShowLinkInput(false); setLinkValue(''); }}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Media Recorder Controls - Audio and Screen Recording */}
      <MediaRecorderControls
        onRecorded={handleRecordingSave}
        onDeleteRecorded={attachment => onRemove?.(attachment.id, attachment.mediaId)}
        compact={true}
      />

      {/* Error messages */}
      {locationError && (
        <p className="text-[11px] text-destructive">{t('locationDenied')}</p>
      )}

      {/* 4 Clean Action Buttons in a Spacious 2x2 or 4-col Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
        {/* Universal File / Photo Upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title={t('addFile')}
          className="h-9 px-2.5 rounded-xl border border-input bg-card/60 hover:bg-accent hover:text-foreground flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-colors shadow-xs"
        >
          <Paperclip className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">{t('addFile')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          aria-label={t('addFile')}
          onChange={e => handleFileUpload(e.target.files)}
        />

        {/* Link / URL */}
        <button
          type="button"
          onClick={() => setShowLinkInput(v => !v)}
          title={t('addLink')}
          className={`h-9 px-2.5 rounded-xl border border-input bg-card/60 hover:bg-accent hover:text-foreground flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-colors shadow-xs ${
            showLinkInput ? 'bg-accent text-foreground border-primary/40' : ''
          }`}
        >
          <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="truncate">{t('addLink')}</span>
        </button>

        {/* Location */}
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={locationLoading}
          title={t('addLocation')}
          className="h-9 px-2.5 rounded-xl border border-input bg-card/60 hover:bg-accent hover:text-foreground flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-colors shadow-xs disabled:opacity-50"
        >
          {locationLoading ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-emerald-500" />
          ) : (
            <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
          <span className="truncate">{t('addLocation')}</span>
        </button>
      </div>
    </div>
  );
}
