import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const DB_NAME = 'sbsz_pdf_store_db';
const STORE_NAME = 'pdf_blobs';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePdfLocally(key: string, file: Blob): Promise<string> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(file, key);
      tx.oncomplete = () => {
        resolve(URL.createObjectURL(file));
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Konnte PDF nicht lokal speichern:', err);
    return URL.createObjectURL(file);
  }
}

export async function getLocalPdfUrl(key: string): Promise<string | null> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) {
          resolve(URL.createObjectURL(req.result));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function uploadExamPdf(
  examId: string,
  file: File,
  type: 'exam' | 'solution' = 'exam'
): Promise<string> {
  const fileKey = `pdf_${examId}_${type}`;

  // 1. Wenn Firebase Storage aktiv ist, in die Cloud hochladen
  if (storage) {
    try {
      const storageRef = ref(storage, `exams/${examId}/${type}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'application/pdf',
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log(`[Firebase Storage] PDF erfolgreich hochgeladen:`, downloadUrl);
      return downloadUrl;
    } catch (err) {
      console.warn('[Firebase Storage] Upload fehlgeschlagen, speichere lokal:', err);
    }
  }

  // 2. Lokaler Fallback in IndexedDB
  const localUrl = await storePdfLocally(fileKey, file);
  return localUrl;
}
