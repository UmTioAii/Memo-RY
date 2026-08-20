import { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Pause, Play, Check, Trash2, Link2, MapPin, X, Loader2 } from 'lucide-react';
import { saveMedia, MAX_FILE_SIZE_BYTES } from '@/lib/mediaStore';
import { useI18n } from '@/lib/i18n';
import type { NoteAttachment } from '@/lib/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function isMapUrl(url: string): boolean {
  return /google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl|bing\.com\/maps|maps\.apple\.com/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|vimeo\.com/i.test(url);
}

interface NoteAttachmentBarProps {
  onAdd: (attachment: NoteAttachment) => void;
  onError?: (msg: string) => void;
}

export function NoteAttachmentBar({ onAdd, onError }: NoteAttachmentBarProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef<number>(0);

  const [recording, setRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [micError, setMicError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [savingAudio, setSavingAudio] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  // ── Audio recording ─────────────────────────────────────────────────────────

  const startRecording = async () => {
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      elapsedRef.current = 0;
      setElapsed(0);
      setIsPaused(false);
      setRecording(true);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(s => s + 1);
      }, 1000);
    } catch {
      setMicError(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(s => s + 1);
      }, 1000);
    }
  };

  const saveRecording = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      setSavingAudio(true);
      try {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const mediaId = await saveMedia(blob);
        const duration = elapsedRef.current;
        onAdd({
          id: generateId(),
          type: 'audio',
          mediaId,
          duration,
          name: `${t('voiceNote')} (${formatTime(duration)})`,
          size: blob.size,
          mimeType,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error('Failed to save audio:', err);
      } finally {
        setSavingAudio(false);
        resetRecordingState();
      }
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      resetRecordingState();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
    resetRecordingState();
  };

  const resetRecordingState = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    chunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);
    setRecording(false);
    setIsPaused(false);
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
      {/* ── Modern Sleek Audio Recording Panel ─────────────────────────────────── */}
      {recording && (
        <div className="p-3 bg-gradient-to-r from-card to-card/90 border border-primary/40 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`relative flex h-3 w-3 shrink-0`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-destructive'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-destructive'}`} />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground font-mono tracking-wider leading-none">
                {formatTime(elapsed)}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {isPaused ? t('pausedAudio') : t('recordingAudio')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isPaused ? (
              <button
                onClick={resumeRecording}
                title={t('resumeRecording')}
                aria-label={t('resumeRecording')}
                className="h-8 px-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-amber-500/30"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                <span className="text-xs">{t('resumeRecording')}</span>
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                title={t('pauseRecording')}
                aria-label={t('pauseRecording')}
                className="h-8 px-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-amber-500/30"
              >
                <Pause className="h-3.5 w-3.5" fill="currentColor" />
                <span className="text-xs">{t('pauseRecording')}</span>
              </button>
            )}

            <button
              onClick={saveRecording}
              disabled={savingAudio}
              title={t('saveAudio')}
              aria-label={t('saveAudio')}
              className="h-8 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {savingAudio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{t('save')}</span>
            </button>

            <button
              onClick={cancelRecording}
              title={t('discardAudio')}
              aria-label={t('discardAudio')}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Link URL input */}
      {showLinkInput && !recording && (
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

      {/* Error messages */}
      {micError && (
        <p className="text-[11px] text-destructive">{t('micDenied')}</p>
      )}
      {locationError && (
        <p className="text-[11px] text-destructive">{t('locationDenied')}</p>
      )}

      {/* 4 Clean Action Buttons in a Spacious 2x2 or 4-col Grid */}
      {!recording && (
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

          {/* Audio recording */}
          <button
            type="button"
            onClick={startRecording}
            title={t('addAudio')}
            className="h-9 px-2.5 rounded-xl border border-input bg-card/60 hover:bg-accent hover:text-foreground flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-colors shadow-xs"
          >
            <Mic className="h-4 w-4 text-destructive shrink-0" />
            <span className="truncate">{t('addAudio')}</span>
          </button>

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
      )}
    </div>
  );
}
