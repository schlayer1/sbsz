/**
 * Google Drive Synchronisation Service für Prüfungsportal
 * 
 * Synchronisiert automatisch Aufgaben- und Lösungshefte über die
 * Google Apps Script Web-App, ohne von der Google Drive API blockiert zu werden.
 */

import { getExamProfileForFile } from '../data/knownExams';

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
 * Analysiert den Dateinamen einer IHK-Prüfungsdatei und erzeugt
 * einen didaktisch sauberen Titel, das IHK-Kürzel und die Semesterbezeichnung.
 * 
 * Erkennt z. B.:
 * - ZM_WS23_FT_Teil_A.pdf -> Winter 2022/23: Fertigungstechnik Teil A (ZM 4060) [W23 4060]
 * - ZM_WS24_FT_Teil_A.pdf -> Winter 2023/24: Fertigungstechnik Teil A (ZM 4060) [W24 4060]
 * - ZM_WS25_FT_Teil_A.pdf -> Winter 2024/25: Fertigungstechnik Teil A (ZM 4060) [W25 4060]
 * - ZM_So24_FT_Teil_A.pdf -> Sommer 2024: Fertigungstechnik Teil A (ZM 4060) [S24 4060]
 * - ZM_So25_FT_Teil_A.pdf -> Sommer 2025: Fertigungstechnik Teil A (ZM 4060) [S25 4060]
 */
export function parseExamFileName(fileName: string): {
  title: string;
  examCode: string;
  season: string;
  subject: string;
} {
  // 1. Zuerst prüfen, ob ein offizielles IHK-Prüfungsprofil existiert
  const profile = getExamProfileForFile(fileName);
  if (profile) {
    return {
      title: profile.title,
      examCode: profile.examCode,
      season: profile.season,
      subject: profile.subject,
    };
  }

  const cleanName = fileName.replace(/\.pdf$/i, '').trim();

  // 2. Semester & Jahrgang ermitteln (z. B. WS23, Wi24, W25, So24, S25)
  // IHK-Nomenklatur: W23 = Winter 2023/24, W24 = Winter 2024/25, S25 = Sommer 2025
  const seasonMatch = cleanName.match(/(WS|Wi|Winter|So|Sommer|S)(\d{2})/i);
  let seasonStr = 'Aktuell';
  let examCode = '';

  if (seasonMatch) {
    const rawPrefix = seasonMatch[1].toLowerCase();
    const yearNum = parseInt(seasonMatch[2], 10);
    const isWinter = rawPrefix.startsWith('w');

    if (isWinter) {
      const startYear = 2000 + yearNum;
      const endYear = yearNum + 1;
      seasonStr = `Winter ${startYear}/${endYear}`;
      examCode = `W${yearNum} 4060`;
    } else {
      seasonStr = `Sommer 20${yearNum}`;
      examCode = `S${yearNum} 4060`;
    }
  }

  // 3. Fach & Modul ermitteln
  let subject = 'Fertigungstechnik Teil A';
  if (/auftrag|funktionsanalyse|afa|ufa/i.test(cleanName)) {
    subject = 'Auftrags- und Funktionsanalyse Teil A';
  } else if (/teil[ _-]?b/i.test(cleanName) || /_ft_b/i.test(cleanName)) {
    subject = 'Fertigungstechnik Teil B';
  } else if (/wiso/i.test(cleanName)) {
    subject = 'Wirtschafts- und Sozialkunde';
  }

  const profession = 'ZM 4060';
  let title = '';
  if (seasonStr !== 'Aktuell') {
    title = `${seasonStr}: ${subject} (${profession})`;
  } else {
    // Generischer Fallback bei abweichenden Dateinamen
    title = cleanName.replace(/[_]+/g, ' ');
  }

  if (!examCode) {
    examCode = cleanName.substring(0, 15).replace(/[_]+/g, ' ');
  }

  return {
    title,
    examCode,
    season: seasonStr,
    subject,
  };
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

    // Sauberen, sprechenden Titel & Metadaten generieren
    const parsed = parseExamFileName(taskFile.name);

    bundles.push({
      id: `drive-${taskFile.id}`,
      title: parsed.title,
      examCode: parsed.examCode,
      season: parsed.season,
      subject: parsed.subject,
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
