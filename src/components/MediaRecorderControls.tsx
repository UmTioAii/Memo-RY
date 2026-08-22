import { useCallback, useEffect, useRef, useState } from 'react';
import { useRecording, formatRecordingTime } from '@/hooks/useRecording';
import { AlertTriangle, ExternalLink, Mic, Pause, Play, Save, StopCircle, Trash2, Video, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { NoteAttachment } from '@/lib/types';
import { getFloatingRecorderMarkup } from './floatingRecorderMarkup';

interface MediaRecorderControlsProps {
  onRecorded?: (blob: Blob, type: 'audio' | 'video') => NoteAttachment | null | void | Promise<NoteAttachment | null | void>;
  onDeleteRecorded?: (attachment: NoteAttachment) => void;
  compact?: boolean;
}

type DocumentPictureInPictureWindow = Window & typeof globalThis & {
  documentPictureInPicture?: {
    requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
    window?: Window | null;
  };
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getRecordedType = (blob: Blob): 'audio' | 'video' => (
  blob.type.startsWith('audio/') ? 'audio' : 'video'
);

const getRecordedFileName = (blob: Blob) => {
  const type = getRecordedType(blob);
  return `${type}-${new Date().toISOString().slice(0, 10)}.webm`;
};

export function MediaRecorderControls({ onRecorded, onDeleteRecorded, compact = false }: MediaRecorderControlsProps) {
  const { t } = useI18n();
  const {
    isRecording,
    isPaused,
    recordingType,
    recordedBlob,
    recordingTime,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    saveToFileSystem,
    clearRecording,
  } = useRecording();
  const [recordedAttachment, setRecordedAttachment] = useState<NoteAttachment | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const persistedBlobRef = useRef<Blob | null>(null);
  const onRecordedRef = useRef(onRecorded);
  const floatingWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  useEffect(() => {
    if (!recordedBlob || persistedBlobRef.current === recordedBlob) return;

    persistedBlobRef.current = recordedBlob;
    setRecordedAttachment(null);

    const saveRecorded = onRecordedRef.current;
    if (!saveRecorded) return;

    let cancelled = false;
    const type = getRecordedType(recordedBlob);
    setIsPersisting(true);

    Promise.resolve(saveRecorded(recordedBlob, type))
      .then(attachment => {
        if (!cancelled && attachment) {
          setRecordedAttachment(attachment);
        }
      })
      .catch(saveError => {
        console.error('Failed to save recording locally:', saveError);
      })
      .finally(() => {
        if (!cancelled) setIsPersisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recordedBlob]);

  const handleSaveToDisk = useCallback(async () => {
    if (!recordedBlob) return;

    await saveToFileSystem(getRecordedFileName(recordedBlob));
  }, [recordedBlob, saveToFileSystem]);

  const handleDeleteRecorded = useCallback(() => {
    if (recordedAttachment && onDeleteRecorded) {
      onDeleteRecorded(recordedAttachment);
    }
    clearRecording();
    setRecordedAttachment(null);
    persistedBlobRef.current = null;
  }, [clearRecording, onDeleteRecorded, recordedAttachment]);

  const handleCloseRecordedActions = useCallback(() => {
    clearRecording();
    setRecordedAttachment(null);
    persistedBlobRef.current = null;
  }, [clearRecording]);

  const closeFloatingWindow = useCallback(() => {
    const floatingWindow = floatingWindowRef.current;
    if (floatingWindow && !floatingWindow.closed) {
      floatingWindow.close();
    }
    floatingWindowRef.current = null;
  }, []);

  const renderFloatingControls = useCallback((floatingWindow: Window) => {
    const doc = floatingWindow.document;
    const isAudio = recordedBlob
      ? recordedBlob.type.startsWith('audio/')
      : recordingType === 'audio';
    const title = isAudio ? t('recordAudio') : t('recordScreen');
    const status = recordedBlob
      ? (isAudio ? t('audioRecorded') : t('videoRecorded'))
      : isPaused
        ? t('pausedAudio')
        : recordingType === 'video'
          ? t('recordingScreen')
          : t('recordingAudio');
    const canSaveOrDelete = Boolean(recordedBlob) && !isPersisting;

    doc.title = 'Memo-RY Recorder';
    doc.body.innerHTML = getFloatingRecorderMarkup({
      mode: recordedBlob ? 'done' : isPaused ? 'paused' : 'recording',
      title,
      status,
      elapsed: formatRecordingTime(recordingTime),
      canSaveOrDelete,
      isAudio,
      labels: {
        pause: t('pauseRecording'),
        resume: t('resumeRecording'),
        stop: t('stop'),
        save: t('save'),
        delete: t('delete'),
        close: t('close'),
      },
    });

    doc.getElementById('togglePause')?.addEventListener('click', () => {
      if (isPaused) resumeRecording();
      else pauseRecording();
    });
    doc.getElementById('stop')?.addEventListener('click', stopRecording);
    doc.getElementById('save')?.addEventListener('click', handleSaveToDisk);
    doc.getElementById('delete')?.addEventListener('click', handleDeleteRecorded);
    doc.getElementById('close')?.addEventListener('click', () => {
      if (recordedBlob) handleCloseRecordedActions();
      closeFloatingWindow();
    });
  }, [
    closeFloatingWindow,
    handleCloseRecordedActions,
    handleDeleteRecorded,
    handleSaveToDisk,
    isPaused,
    isPersisting,
    pauseRecording,
    recordedBlob,
    recordingTime,
    recordingType,
    resumeRecording,
    stopRecording,
    t,
  ]);

  const openFloatingWindow = useCallback(async () => {
    if (!isRecording && !recordedBlob) return;

    const existingWindow = floatingWindowRef.current;
    if (existingWindow && !existingWindow.closed) {
      renderFloatingControls(existingWindow);
      existingWindow.focus();
      return;
    }

    const currentWindow = window as DocumentPictureInPictureWindow;
    let floatingWindow: Window | null = null;

    try {
      if (currentWindow.documentPictureInPicture?.requestWindow) {
        floatingWindow = await currentWindow.documentPictureInPicture.requestWindow({
          width: 340,
          height: 162,
        });
      } else {
        floatingWindow = window.open('', 'memo-ry-recorder', 'popup,width=340,height=170');
      }
    } catch (floatingError) {
      console.warn('Could not open floating recorder controls:', floatingError);
      return;
    }

    if (!floatingWindow) return;

    floatingWindowRef.current = floatingWindow;
    floatingWindow.addEventListener('pagehide', () => {
      if (floatingWindowRef.current === floatingWindow) {
        floatingWindowRef.current = null;
      }
    });
    renderFloatingControls(floatingWindow);
  }, [isRecording, recordedBlob, renderFloatingControls]);

  useEffect(() => {
    const floatingWindow = floatingWindowRef.current;
    if (!floatingWindow || floatingWindow.closed) return;

    if (!isRecording && !recordedBlob) {
      closeFloatingWindow();
      return;
    }

    renderFloatingControls(floatingWindow);
  }, [closeFloatingWindow, isRecording, recordedBlob, renderFloatingControls]);

  useEffect(() => {
    if (!isRecording && !recordedBlob) return;

    const handleLeaveMemoRy = () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        openFloatingWindow();
      }
    };

    window.addEventListener('blur', handleLeaveMemoRy);
    document.addEventListener('visibilitychange', handleLeaveMemoRy);

    return () => {
      window.removeEventListener('blur', handleLeaveMemoRy);
      document.removeEventListener('visibilitychange', handleLeaveMemoRy);
    };
  }, [isRecording, openFloatingWindow, recordedBlob]);

  useEffect(() => {
    return closeFloatingWindow;
  }, [closeFloatingWindow]);

  return (
    <div className={`space-y-3 ${compact ? 'space-y-2' : ''}`}>
      {/* Botões de início de gravação */}
      {!isRecording && !recordedBlob && (
        <div className={`flex gap-2 ${compact ? 'flex-col sm:flex-row' : ''}`}>
          <button
            onClick={() => startRecording('audio')}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            title={t('recordAudio')}
            aria-label={t('recordAudio')}
          >
            <Mic className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
            <span className={`text-sm ${compact ? 'text-xs' : ''}`}>{t('recordAudio')}</span>
          </button>
          <button
            onClick={() => startRecording('video')}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            title={t('recordScreen')}
            aria-label={t('recordScreen')}
          >
            <Video className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
            <span className={`text-sm ${compact ? 'text-xs' : ''}`}>{t('recordScreen')}</span>
          </button>
        </div>
      )}

      {/* Indicador de gravação em andamento */}
      {isRecording && (
        <div className={`flex items-center gap-3 p-3 bg-card border border-border rounded-lg ${compact ? 'p-2' : ''}`}>
          <div className={`h-8 w-8 rounded-full bg-red-500 flex items-center justify-center ${isPaused ? '' : 'animate-pulse'} ${compact ? 'h-6 w-6' : ''}`}>
            {recordingType === 'audio' ? (
              <Mic className={`h-4 w-4 text-white ${compact ? 'h-3 w-3' : ''}`} />
            ) : (
              <Video className={`h-4 w-4 text-white ${compact ? 'h-3 w-3' : ''}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              {isPaused ? t('pausedAudio') : (recordingType === 'audio' ? t('recordingAudio') : t('recordingScreen'))}
            </p>
            <p className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {formatRecordingTime(recordingTime)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={openFloatingWindow}
              className={`h-8 rounded-lg border border-input bg-background px-2 text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1.5 ${compact ? 'h-7 px-2 text-xs' : 'text-sm'}`}
              title={t('floatingRecorder')}
              aria-label={t('floatingRecorder')}
            >
              <ExternalLink className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
              <span>{t('floatingRecorderShort')}</span>
            </button>
            <button
              type="button"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className={`h-8 rounded-lg border border-input bg-background px-2 text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-1.5 ${compact ? 'h-7 px-2 text-xs' : 'text-sm'}`}
              title={isPaused ? t('resumeRecording') : t('pauseRecording')}
              aria-label={isPaused ? t('resumeRecording') : t('pauseRecording')}
            >
              {isPaused ? (
                <Play className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
              ) : (
                <Pause className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
              )}
              <span>{isPaused ? t('resumeRecording') : t('pauseRecording')}</span>
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className={`h-8 rounded-lg bg-destructive px-2 text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1.5 ${compact ? 'h-7 px-2 text-xs' : 'text-sm'}`}
              title={t('stopRecording')}
              aria-label={t('stopRecording')}
            >
              <StopCircle className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
              <span>{t('stop')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Controles para gravação concluída */}
      {recordedBlob && (
        <div className={`flex items-center gap-3 p-3 bg-card border border-border rounded-lg ${compact ? 'p-2' : ''}`}>
          <div className={`h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center ${compact ? 'h-6 w-6' : ''}`}>
            {recordedBlob.type.startsWith('audio/') ? (
              <Mic className={`h-4 w-4 text-white ${compact ? 'h-3 w-3' : ''}`} />
            ) : (
              <Video className={`h-4 w-4 text-white ${compact ? 'h-3 w-3' : ''}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
              {recordedBlob.type.startsWith('audio/') ? t('audioRecorded') : t('videoRecorded')}
            </p>
            <p className={`text-muted-foreground ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {isPersisting ? t('savingRecording') : formatFileSize(recordedBlob.size)}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSaveToDisk}
              disabled={isPersisting}
              className={`h-8 rounded-lg bg-primary px-2 text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 ${compact ? 'h-7 px-2 text-xs' : 'text-sm'}`}
              title={t('saveToDisk')}
              aria-label={t('saveToDisk')}
            >
              <Save className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleDeleteRecorded}
              disabled={isPersisting}
              className={`h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center ${compact ? 'h-6 w-6' : ''}`}
              title={t('discard')}
              aria-label={t('discard')}
            >
              <Trash2 className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleCloseRecordedActions}
              disabled={isPersisting}
              className={`h-8 w-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center ${compact ? 'h-6 w-6' : ''}`}
              title={t('close')}
              aria-label={t('close')}
            >
              <X className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Mensagens de erro */}
      {error && (
        <div className={`p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2 ${compact ? 'p-2 text-xs' : ''}`}>
          <AlertTriangle className={`h-4 w-4 ${compact ? 'h-3 w-3' : ''}`} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
