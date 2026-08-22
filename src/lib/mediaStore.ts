// ─── IndexedDB media store ───────────────────────────────────────────────────
// Stores binary blobs (photos, audio, any files up to 250MB) locally with no size limit.
// Notes in localStorage hold only the IDs that reference these entries.

const DB_NAME = 'memo-ry-media';
const STORE_NAME = 'media';
const DB_VERSION = 1;

export const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250MB

let dbPromise: Promise<IDBDatabase> | null = null;

// Cache for object URLs to avoid memory leaks and improve performance
const urlCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Save a Blob to IndexedDB. Returns the generated ID. */
export async function saveMedia(blob: Blob): Promise<string> {
  // Validate file size
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
  }

  // Compress audio files before saving
  if (blob.type.startsWith('audio/')) {
    try {
      const compressedBlob = await compressAudio(blob);
      if (compressedBlob.size < blob.size) {
        blob = compressedBlob;
      }
    } catch (err) {
      console.warn('Audio compression failed, saving original:', err);
    }
  }

  const db = await openDB();
  const id = genId();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, blob });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a raw Blob from IndexedDB. */
export async function getMediaBlob(id: string): Promise<Blob | null> {
  // Check blob cache first
  if (blobCache.has(id)) {
    return blobCache.get(id);
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      if (!req.result || !req.result.blob) { resolve(null); return; }
      const blob = req.result.blob;
      // Cache the blob for future use
      blobCache.set(id, blob);
      resolve(blob);
    };
    req.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve a Blob from IndexedDB and return an Object URL.
 * Uses caching to avoid creating multiple object URLs for the same blob.
 * Caller is responsible for calling URL.revokeObjectURL() when done.
 */
export async function getMediaUrl(id: string): Promise<string | null> {
  // Check URL cache first
  if (urlCache.has(id)) {
    return urlCache.get(id);
  }

  const blob = await getMediaBlob(id);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

/**
 * Retrieve multiple media URLs in a single batch operation.
 * More efficient than calling getMediaUrl multiple times.
 */
export async function getMultipleMediaUrls(ids: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // First check cache for all IDs
  ids.forEach(id => {
    if (urlCache.has(id)) {
      result.set(id, urlCache.get(id)!);
    }
  });

  // Fetch remaining IDs from IndexedDB
  const idsToFetch = ids.filter(id => !result.has(id));

  if (idsToFetch.length > 0) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      let completed = 0;
      idsToFetch.forEach(id => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result?.blob) {
            const blob = req.result.blob;
            const url = URL.createObjectURL(blob);
            urlCache.set(id, url);
            blobCache.set(id, blob);
            result.set(id, url);
          }
          completed++;
          if (completed === idsToFetch.length) resolve(null);
        };
        req.onerror = () => reject(tx.error);
      });
    });
  }

  return result;
}

/**
 * Clear all cached object URLs and blobs.
 * Should be called when media is no longer needed to prevent memory leaks.
 */
export function clearMediaCache(): void {
  urlCache.forEach(url => {
    URL.revokeObjectURL(url);
  });
  urlCache.clear();
  blobCache.clear();
}

/**
 * Remove a specific media entry from cache.
 */
export function removeFromCache(id: string): void {
  if (urlCache.has(id)) {
    URL.revokeObjectURL(urlCache.get(id)!);
    urlCache.delete(id);
  }
  blobCache.delete(id);
}

/** Delete a media entry from IndexedDB. */
export async function deleteMedia(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Trigger download of a media file. */
export async function downloadMediaFile(id: string, fileName: string): Promise<boolean> {
  try {
    const blob = await getMediaBlob(id);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'arquivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (err) {
    console.error('Failed to download media file:', err);
    return false;
  }
}

/** Share a media file using Web Share API with fallback to copy/alert. */
export async function shareMediaFile(id: string, fileName: string, mimeType?: string): Promise<boolean> {
  try {
    const blob = await getMediaBlob(id);
    if (!blob) return false;

    const file = new File([blob], fileName || 'arquivo', {
      type: mimeType || blob.type || 'application/octet-stream',
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: fileName || 'Arquivo',
      });
      return true;
    } else if (navigator.share) {
      await navigator.share({
        title: fileName || 'Arquivo',
        text: `Arquivo: ${fileName}`,
      });
      return true;
    } else {
      // Fallback: trigger download
      return downloadMediaFile(id, fileName);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return true; // User cancelled share dialog
    console.error('Failed to share file:', err);
    return false;
  }
}

/** Format file size in human readable format (KB, MB, GB). */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Compress audio using Web Audio API and WebM encoding.
 * Reduces file size while maintaining quality.
 */
export async function compressAudio(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create a new AudioBuffer with reduced sample rate
        const newSampleRate = Math.min(audioBuffer.sampleRate, 22050); // 22.05kHz
        const newLength = Math.floor(audioBuffer.length * newSampleRate / audioBuffer.sampleRate);
        const newAudioBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          newLength,
          newSampleRate
        );

        // Copy audio data with resampling
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const oldData = audioBuffer.getChannelData(channel);
          const newData = newAudioBuffer.getChannelData(channel);
          for (let i = 0; i < newLength; i++) {
            const oldIndex = Math.floor(i * audioBuffer.sampleRate / newSampleRate);
            newData[i] = oldData[oldIndex];
          }
        }

        // Encode to WebM
        const destination = audioContext.createMediaStreamDestination();
        const encoder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm;codecs=opus' });

        const chunks: BlobPart[] = [];
        encoder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        encoder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'audio/webm' });
          resolve(compressedBlob);
        };

        encoder.start();
        const source = audioContext.createBufferSource();
        source.buffer = newAudioBuffer;
        source.connect(destination);
        source.connect(audioContext.destination);
        source.start();
        source.onended = () => {
          encoder.stop();
          audioContext.close();
        };

        // Stop after duration
        setTimeout(() => {
          try {
            source.stop();
          } catch {}
        }, (audioBuffer.duration * 1000) + 100);

      } catch (err) {
        reject(err);
      }
    };

    fileReader.onerror = () => reject(fileReader.error);
    fileReader.readAsArrayBuffer(blob);
  });
}
