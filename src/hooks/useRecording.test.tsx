import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRecording } from './useRecording';

const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const secureContextDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext');

afterEach(() => {
  if (mediaDevicesDescriptor) {
    Object.defineProperty(navigator, 'mediaDevices', mediaDevicesDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'mediaDevices');
  }

  if (secureContextDescriptor) {
    Object.defineProperty(window, 'isSecureContext', secureContextDescriptor);
  } else {
    Reflect.deleteProperty(window, 'isSecureContext');
  }

  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useRecording', () => {
  it.each(['audio', 'video'] as const)('reports unsupported %s capture without accessing an undefined mediaDevices object', async type => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording(type);
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toContain('gravação');
    expect(result.current.error).not.toContain('Cannot read properties');
  });

  it('records screen video with audio and supports pause and resume', async () => {
    const createTrack = (kind: 'audio' | 'video') => ({
      kind,
      stop: vi.fn(),
      addEventListener: vi.fn(),
    }) as unknown as MediaStreamTrack;
    const displayVideoTrack = createTrack('video');
    const displayAudioTrack = createTrack('audio');
    const micAudioTrack = createTrack('audio');
    const mixedAudioTrack = createTrack('audio');
    const sourceStreams: MediaStream[] = [];
    let recordedStream: MediaStream | null = null;

    class MockMediaStream {
      private tracks: MediaStreamTrack[];

      constructor(tracks: MediaStreamTrack[] = []) {
        this.tracks = tracks;
      }

      getTracks() {
        return this.tracks;
      }

      getVideoTracks() {
        return this.tracks.filter(track => track.kind === 'video');
      }

      getAudioTracks() {
        return this.tracks.filter(track => track.kind === 'audio');
      }
    }

    const displayStream = new MockMediaStream([displayVideoTrack, displayAudioTrack]) as unknown as MediaStream;
    const micStream = new MockMediaStream([micAudioTrack]) as unknown as MediaStream;
    const getDisplayMedia = vi.fn().mockResolvedValue(displayStream);
    const getUserMedia = vi.fn().mockResolvedValue(micStream);
    const closeAudioContext = vi.fn().mockResolvedValue(undefined);
    const disconnect = vi.fn();

    class MockAudioContext {
      createMediaStreamDestination() {
        return {
          stream: new MockMediaStream([mixedAudioTrack]) as unknown as MediaStream,
        };
      }

      createMediaStreamSource(stream: MediaStream) {
        sourceStreams.push(stream);
        return {
          connect: vi.fn(),
          disconnect,
        };
      }

      close() {
        return closeAudioContext();
      }
    }

    class MockMediaRecorder {
      static isTypeSupported = vi.fn(() => true);

      mimeType: string;
      state: RecordingState = 'inactive';
      stream: MediaStream;
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor(mediaStream: MediaStream, options?: MediaRecorderOptions) {
        this.stream = mediaStream;
        recordedStream = mediaStream;
        this.mimeType = options?.mimeType ?? 'video/webm';
      }

      start() {
        this.state = 'recording';
      }

      pause() {
        this.state = 'paused';
      }

      resume() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({
          data: new Blob(['recorded'], { type: this.mimeType }),
        } as BlobEvent);
        this.onstop?.();
      }
    }

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getDisplayMedia,
        getUserMedia,
      },
    });
    vi.stubGlobal('MediaStream', MockMediaStream);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);

    const { result } = renderHook(() => useRecording());

    await act(async () => {
      await result.current.startRecording('video');
    });

    expect(getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: true });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    expect(sourceStreams).toEqual([displayStream, micStream]);
    expect(recordedStream?.getVideoTracks()).toEqual([displayVideoTrack]);
    expect(recordedStream?.getAudioTracks()).toEqual([mixedAudioTrack]);
    expect(result.current.isRecording).toBe(true);
    expect(result.current.isPaused).toBe(false);

    act(() => {
      result.current.pauseRecording();
    });

    expect(result.current.isPaused).toBe(true);

    act(() => {
      result.current.resumeRecording();
    });

    expect(result.current.isPaused).toBe(false);

    act(() => {
      result.current.stopRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordedBlob).toBeInstanceOf(Blob);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(closeAudioContext).toHaveBeenCalled();
  });
});
