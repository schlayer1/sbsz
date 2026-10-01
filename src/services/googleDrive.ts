/**
 * Google Drive Synchronisation Service für SBSZ Jena-Göschwitz
 * 
 * Liest automatisch Dateien aus einem freigegebenen Google Drive-Ordner
 * über die Google Drive REST API v3 aus und gruppiert Aufgaben-PDFs
 * mit ihren zugehörigen Lösungs-PDFs.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface DiscoveredExamBundle {
  id: string;
  title: string;
  examCode: string;
  season?: string;
  subject?: string;
  taskPdfFile: GoogleDriveFile;
  solutionPdfFile?: GoogleDriveFile;
  previewUrl: string;
  solutionPreviewUrl?: string;
}

export const LOCAL_DRIVE_FOLDER_ID_KEY = 'sbsz_google_drive_folder_id';
export const LOCAL_DRIVE_API_KEY_KEY = 'sbsz_google_drive_api_key';

export function getActiveDriveFolderId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(LOCAL_DRIVE_FOLDER_ID_KEY);
    if (custom && custom.trim()) return custom.trim();
  }
  return (import.meta as any).env?.VITE_GOOGLE_DRIVE_FOLDER_ID || '';
}

export function saveActiveDriveFolderId(folderId: string): void {
  if (typeof window !== 'undefined') {
    if (folderId.trim()) {
      localStorage.setItem(LOCAL_DRIVE_FOLDER_ID_KEY, folderId.trim());
    } else {
      localStorage.removeItem(LOCAL_DRIVE_FOLDER_ID_KEY);
    }
  }
}

export function getActiveDriveApiKey(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(LOCAL_DRIVE_API_KEY_KEY);
    if (custom && custom.trim()) return custom.trim();
  }
  return (
    (import.meta as any).env?.VITE_GOOGLE_DRIVE_API_KEY ||
    (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
    ''
  );
}

export function saveActiveDriveApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(LOCAL_DRIVE_API_KEY_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_DRIVE_API_KEY_KEY);
    }
  }
}

/**
 * Ruft alle PDF-Dateien aus dem konfigurierten Google Drive Ordner ab
 */
export async function fetchDriveFolderFiles(
  folderId?: string,
  apiKey?: string
): Promise<GoogleDriveFile[]> {
  const fId = folderId || getActiveDriveFolderId();
  const key = apiKey || getActiveDriveApiKey();

  if (!fId) {
    throw new Error('Keine Google Drive Ordner-ID konfiguriert.');
  }

  if (!key) {
    throw new Error('Kein Google API-Schlüssel konfiguriert.');
  }

  // Google Drive REST API v3 Query
  // Filtert nach PDF-Dateien im angegebenen Ordner, die nicht im Papierkorb liegen
  const q = `'${fId}' in parents and mimeType = 'application/pdf' and trashed = false`;
  const fields = 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)';
  const endpoint = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}&key=${key}&orderBy=name`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Google Drive API Fehler: ${message}`);
  }

  const data = await response.json();
  return (data.files || []) as GoogleDriveFile[];
}

/**
 * Gruppiert gefundene PDF-Dateien automatisch in Prüfungs- und Lösungshefte.
 * Erkennt Namensmuster wie "..._Aufgaben.pdf" und "..._Loesung.pdf"
 */
export function pairExamFiles(files: GoogleDriveFile[]): DiscoveredExamBundle[] {
  const bundles: DiscoveredExamBundle[] = [];
  const solutionFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes('loesung') ||
      f.name.toLowerCase().includes('lösung') ||
      f.name.toLowerCase().includes('solution') ||
      f.name.toLowerCase().includes('_l_') ||
      f.name.toLowerCase().endsWith('_l.pdf')
  );

  const taskFiles = files.filter((f) => !solutionFiles.includes(f));

  taskFiles.forEach((taskFile) => {
    // Versuche das passende Lösungsdokument anhand des Namensstamms zu finden
    const baseName = taskFile.name
      .replace(/\.pdf$/i, '')
      .replace(/[_ -]?(aufgaben|pruefung|prüfung|teil[_ -]?[ab]|k4)/i, '')
      .trim()
      .toLowerCase();

    const matchingSolution = solutionFiles.find((s) => {
      const solClean = s.name.toLowerCase().replace(/\.pdf$/i, '');
      return solClean.includes(baseName) || baseName.includes(solClean.replace(/[_ -]?(loesung|lösung)/i, ''));
    });

    // Sauberen Titel generieren
    const cleanTitle = taskFile.name
      .replace(/\.pdf$/i, '')
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    bundles.push({
      id: `drive-${taskFile.id}`,
      title: cleanTitle,
      examCode: cleanTitle.length > 20 ? cleanTitle.substring(0, 18) + '...' : cleanTitle,
      taskPdfFile: taskFile,
      solutionPdfFile: matchingSolution,
      previewUrl: `https://drive.google.com/file/d/${taskFile.id}/preview`,
      solutionPreviewUrl: matchingSolution
        ? `https://drive.google.com/file/d/${matchingSolution.id}/preview`
        : undefined,
    });
  });

  return bundles;
}
