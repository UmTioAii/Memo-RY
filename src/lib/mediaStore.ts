// ─── IndexedDB media store ───────────────────────────────────────────────────
// Stores binary blobs (photos, audio, any files up to 250MB) locally with no size limit.
// Notes in localStorage hold only the IDs that reference these entries.

const DB_NAME = 'memo-ry-media';
const STORE_NAME = 'media';
const DB_VERSION = 1;

export const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024; // 250MB

let dbPromise: Promise<IDBDatabase> | null = null;

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
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      if (!req.result || !req.result.blob) { resolve(null); return; }
      resolve(req.result.blob);
    };
    req.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve a Blob from IndexedDB and return an Object URL.
 * Caller is responsible for calling URL.revokeObjectURL() when done.
 */
export async function getMediaUrl(id: string): Promise<string | null> {
  const blob = await getMediaBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
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
