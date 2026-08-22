import { useEffect, useRef, useState } from 'react';
import { saveFileToDisk } from '@/lib/fileSystem';

type RecordingType = 'audio' | 'video';
type RecordingStreamResult = {
  stream: MediaStream;
  cleanup: () => void;
};
type AudioContextConstructor = typeof AudioContext;
type WindowWithWebkitAudioContext = Window & typeof globalThis & {
  webkitAudioContext?: AudioContextConstructor;
};

const RECORDING_UNSUPPORTED = 'A gravação não é compatível com este navegador.';
const SECURE_CONTEXT_REQUIRED = 'Para gravar, abra o aplicativo por HTTPS ou em localhost.';

function getRecordingSupportError(type: RecordingType): string | null {
  // MediaDevices is intentionally unavailable in non-secure contexts in most browsers.
  // Checking it before accessing its methods prevents "Cannot read properties of undefined".
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return RECORDING_UNSUPPORTED;
  }

  if (window.isSecureContext === false) {
    return SECURE_CONTEXT_REQUIRED;
  }

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices) {
    return `${RECORDING_UNSUPPORTED} ${SECURE_CONTEXT_REQUIRED}`;
  }

  if (typeof mediaDevices.getUserMedia !== 'function') {
    return type === 'audio'
      ? 'A gravação de áudio não é compatível com este navegador.'
      : 'A gravação de tela com microfone não é compatível com este navegador.';
  }

  if (type === 'video' && typeof mediaDevices.getDisplayMedia !== 'function') {
    return 'A gravação de tela não é compatível com este navegador.';
  }

  if (typeof MediaRecorder === 'undefined') {
    return RECORDING_UNSUPPORTED;
  }

  return null;
}

function getSupportedMimeType(type: RecordingType): string | undefined {
  const candidates = type === 'audio'
    ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

  return candidates.find(candidate => MediaRecorder.isTypeSupported(candidate));
}

function getStartErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'Permissão negada. Permita o acesso solicitado e tente novamente.';
    }
    if (error.name === 'NotFoundError') {
      return 'Nenhum dispositivo de áudio foi encontrado.';
    }
  }

  return error instanceof Error ? error.message : 'Não foi possível iniciar a gravação.';
}

function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach(track => track.stop());
}

function getAudioContextConstructor(): AudioContextConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as WindowWithWebkitAudioContext).webkitAudioContext;
}

function createMixedAudioStream(streams: MediaStream[]): { stream: MediaStream; cleanup: () => void } {
  const audioStreams = streams.filter(stream => stream.getAudioTracks().length > 0);
  if (audioStreams.length === 0) {
    return { stream: new MediaStream(), cleanup: () => undefined };
  }

  const AudioContextCtor = getAudioContextConstructor();
  if (!AudioContextCtor) {
    return {
      stream: new MediaStream(audioStreams.flatMap(stream => stream.getAudioTracks())),
      cleanup: () => undefined,
    };
  }

  const audioContext = new AudioContextCtor();
  const destination = audioContext.createMediaStreamDestination();
  const sources = audioStreams.map(stream => {
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(destination);
    return source;
  });

  return {
    stream: destination.stream,
    cleanup: () => {
      sources.forEach(source => source.disconnect());
      stopStream(destination.stream);
      audioContext.close().catch(console.error);
    },
  };
}

async function createAudioRecordingStream(mediaDevices: MediaDevices): Promise<RecordingStreamResult> {
  const stream = await mediaDevices.getUserMedia({ audio: true });
  return {
    stream,
    cleanup: () => stopStream(stream),
  };
}

async function createVideoRecordingStream(mediaDevices: MediaDevices): Promise<RecordingStreamResult> {
  let displayStream: MediaStream | null = null;
  let micStream: MediaStream | null = null;
  let mixedAudio: { stream: MediaStream; cleanup: () => void } | null = null;

  try {
    displayStream = await mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    micStream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    mixedAudio = createMixedAudioStream([displayStream, micStream]);

    const stream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...mixedAudio.stream.getAudioTracks(),
    ]);

    return {
      stream,
      cleanup: () => {
        stopStream(stream);
        mixedAudio?.cleanup();
        stopStream(displayStream);
        stopStream(micStream);
      },
    };
  } catch (error) {
    mixedAudio?.cleanup();
    stopStream(displayStream);
    stopStream(micStream);
    throw error;
  }
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingType | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCleanupRef = useRef<(() => void) | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setRecordingTime(previous => previous + 1);
    }, 1000);
  };

  const startRecording = async (type: RecordingType) => {
    setError(null);

    const supportError = getRecordingSupportError(type);
    if (supportError) {
      setError(supportError);
      return;
    }

    let recordingStream: RecordingStreamResult | null = null;

    try {
      const mediaDevices = navigator.mediaDevices;
      recordingStream = type === 'audio'
        ? await createAudioRecordingStream(mediaDevices)
        : await createVideoRecordingStream(mediaDevices);
      const stream = recordingStream.stream;

      const mimeType = getSupportedMimeType(type);
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      recordingCleanupRef.current = recordingStream.cleanup;

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedBlob(blob);
        setIsPaused(false);
        recordingCleanupRef.current?.();
        recordingCleanupRef.current = null;
      };

      mediaRecorder.onerror = () => {
        setError('Ocorreu um erro durante a gravação.');
        setIsRecording(false);
        setIsPaused(false);
        clearTimer();
        recordingCleanupRef.current?.();
        recordingCleanupRef.current = null;
      };

      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
            setIsPaused(false);
            clearTimer();
          }
        }, { once: true });
      });

      mediaRecorder.start();
      setRecordingType(type);
      setRecordedBlob(null);
      setRecordingTime(0);
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
    } catch (startError) {
      recordingStream?.cleanup();
      recordingCleanupRef.current = null;
      setError(getStartErrorMessage(startError));
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    mediaRecorder.pause();
    setIsPaused(true);
    clearTimer();
  };

  const resumeRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state !== 'paused') return;

    mediaRecorder.resume();
    setIsPaused(false);
    startTimer();
  };

  const stopRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    mediaRecorder.stop();
    setIsRecording(false);
    setIsPaused(false);
    clearTimer();
  };

  const saveToFileSystem = async (fileName: string) => {
    if (!recordedBlob) return false;

    try {
      const saved = await saveFileToDisk(recordedBlob, fileName);
      if (saved) return true;

      const url = URL.createObjectURL(recordedBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (saveError) {
      console.error('Failed to save file:', saveError);
      return false;
    }
  };

  const clearRecording = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setError(null);
    setIsPaused(false);
  };

  useEffect(() => {
    return () => {
      clearTimer();
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
      }
      recordingCleanupRef.current?.();
      recordingCleanupRef.current = null;
    };
  }, []);

  return {
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
  };
}

/** Format time in MM:SS format. */
export function formatRecordingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
