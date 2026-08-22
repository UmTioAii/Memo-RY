/** File System Access API utilities */

/**
 * Save a file to disk using File System Access API with fallback to download.
 * Returns true if saved successfully, false otherwise.
 */
export async function saveFileToDisk(blob: Blob, suggestedName: string): Promise<boolean> {
  try {
    // Check if File System Access API is available
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Files',
          accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'video/*': ['.webm', '.mp4', '.mov'],
            'audio/*': ['.webm', '.mp3', '.wav'],
            'application/*': ['.pdf', '.zip'],
          },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }
    return false;
  } catch (err) {
    console.error('File system access error:', err);
    return false;
  }
}

/**
 * Open a file from disk using File System Access API.
 * Returns the File object or null if cancelled or not supported.
 */
export async function openFileFromDisk(): Promise<File | null> {
  try {
    if ('showOpenFilePicker' in window) {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Files',
          accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'video/*': ['.webm', '.mp4', '.mov'],
            'audio/*': ['.webm', '.mp3', '.wav'],
            'application/*': ['.pdf', '.zip'],
          },
        }],
        multiple: false,
      });
      const file = await handle.getFile();
      return file;
    }
    return null;
  } catch (err) {
    console.error('File open error:', err);
    return null;
  }
}

/**
 * Check if File System Access API is supported.
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}