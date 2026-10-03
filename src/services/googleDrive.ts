/**
 * Google Drive Synchronisation Service für Prüfungsportal
 * 
 * Synchronisiert automatisch Aufgaben- und Lösungshefte über die
 * Google Apps Script Web-App, ohne von der Google Drive API blockiert zu werden.
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  size?: number | string;
  url?: string;
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

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyO_EsvmizfJh-0AtDfWgNqWqgcsBZeKwtZa8vW1FdlcC7WH16JSbrkTj9pD00K-GHOxA/exec';

export const LOCAL_APPS_SCRIPT_URL_KEY = 'sbsz_google_drive_script_url';
export const LOCAL_DRIVE_FOLDER_ID_KEY = 'sbsz_google_drive_folder_id';

export function getActiveAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(LOCAL_APPS_SCRIPT_URL_KEY);
    if (custom && custom.trim()) return custom.trim();
  }
  return (
    (import.meta as any).env?.VITE_GOOGLE_DRIVE_SCRIPT_URL ||
    DEFAULT_APPS_SCRIPT_URL
  );
}

export function saveActiveAppsScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem(LOCAL_APPS_SCRIPT_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(LOCAL_APPS_SCRIPT_URL_KEY);
    }
  }
}

export function getActiveDriveFolderId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(LOCAL_DRIVE_FOLDER_ID_KEY);
    if (custom && custom.trim()) return custom.trim();
  }
  return (import.meta as any).env?.VITE_GOOGLE_DRIVE_FOLDER_ID || '13BZyRvoznEnBV7kXiLXUhyFOfxcYRXCA';
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

/**
 * Ruft alle PDF-Dateien aus dem konfigurierten Google Drive Ordner ab
 */
export async function fetchDriveFolderFiles(
  scriptUrl?: string,
  folderId?: string
): Promise<GoogleDriveFile[]> {
  const url = scriptUrl || getActiveAppsScriptUrl();
  const fId = folderId || getActiveDriveFolderId();

  if (!url) {
    throw new Error('Keine Google Apps Script Web-App URL konfiguriert.');
  }

  const endpoint = fId ? `${url}?folderId=${encodeURIComponent(fId)}` : url;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Google Apps Script HTTP Fehler: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data && data.error) {
    throw new Error(`Google Drive Fehler: ${data.error}`);
  }

  return (Array.isArray(data) ? data : []) as GoogleDriveFile[];
}

/**
 * Gruppiert gefundene PDF-Dateien automatisch in Prüfungs- und Lösungshefte.
 * Erkennt Namensmuster wie "..._Aufgaben.pdf" und "..._Loesung.pdf"
 */
export function pairExamFiles(files: GoogleDriveFile[]): DiscoveredExamBundle[] {
  const bundles: DiscoveredExamBundle[] = [];

  // Erkennt Lösungsdateien (z. B. "ZM_So25_FT_Teil_A_LÖSUNG.pdf" oder "..._LOESUNG.pdf")
  const solutionFiles = files.filter((f) => {
    const n = f.name.toLowerCase();
    return (
      n.includes('loesung') ||
      n.includes('lösung') ||
      n.includes('lösung') || // NFD Unicode Unterstützung
      n.includes('solution') ||
      n.includes('_l_') ||
      n.endsWith('_l.pdf')
    );
  });

  const taskFiles = files.filter((f) => !solutionFiles.includes(f));

  taskFiles.forEach((taskFile) => {
    // Normalisierter Basisname (z. B. "zm_so25_ft_teil_a")
    const baseName = taskFile.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\.pdf$/i, '')
      .replace(/[_ -]?(aufgaben|pruefung|prüfung|k4)/i, '')
      .trim()
      .toLowerCase();

    const matchingSolution = solutionFiles.find((s) => {
      const solClean = s.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\.pdf$/i, '')
        .replace(/[_ -]?(loesung|losung|solution)/i, '')
        .trim()
        .toLowerCase();
      return solClean === baseName || solClean.includes(baseName) || baseName.includes(solClean);
    });

    // Sauberen, sprechenden Titel generieren
    let displayTitle = taskFile.name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ');
    if (taskFile.name.includes('So25')) {
      displayTitle = 'Sommer 2025: Fertigungstechnik Teil A (ZM 4060)';
    } else if (taskFile.name.includes('WS25') || taskFile.name.includes('Wi25')) {
      displayTitle = 'Winter 2024/25: Fertigungstechnik Teil A (ZM 4060)';
    }

    const examCode = taskFile.name.includes('So25')
      ? 'S25 4060'
      : taskFile.name.includes('WS25')
      ? 'W25 4060'
      : taskFile.name.replace(/\.pdf$/i, '').substring(0, 15);

    bundles.push({
      id: `drive-${taskFile.id}`,
      title: displayTitle,
      examCode: examCode,
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
