import { ExamQuestion } from '../types/exam';

export interface KnownExamProfile {
  idPrefix: string;
  examCode: string;
  season: string;
  subject: string;
  title: string;
  totalQuestions: number;
  requiredQuestions: number;
  maxDeselections: number;
  nonDeselectableQuestions: number[];
  solutions: Record<number, number>;
  pageCount: number;
  questions?: ExamQuestion[];
}

/**
 * Offizieller IHK-Musterlösungsschlüssel:
 * Abschlussprüfung Teil 2 Winter 2023/24
 * Auftrags- und Funktionsanalyse Teil A, Projekt 1 (W23 4060 K1/P1)
 * Gesamt: 14 gebundene Aufgaben, 11 zu werten, 3 abzuwählen
 * Nicht abwählbar: [2, 5, 6, 12]
 */
export const OFFICIAL_IHK_W23_4060_SOLUTIONS: Record<number, number> = {
  1: 4,
  2: 2,
  3: 3,
  4: 1,
  5: 1,
  6: 1,
  7: 3,
  8: 1,
  9: 1,
  10: 3,
  11: 5,
  12: 2,
  13: 5,
  14: 4,
};

/**
 * Offizieller IHK-Musterlösungsschlüssel:
 * Abschlussprüfung Teil 2 Winter 2024/25
 * Auftrags- und Funktionsanalyse Teil A (W24 4060 K1)
 * Gesamt: 28 gebundene Aufgaben, 25 zu werten, 3 abzuwählen
 * Nicht abwählbar: [4, 6, 7, 8, 9, 12, 18, 22]
 */
export const OFFICIAL_IHK_W24_4060_SOLUTIONS: Record<number, number> = {
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 4,
  8: 2,
  9: 2,
  10: 2,
  11: 2,
  12: 2,
  13: 2,
  14: 2,
  15: 2,
  16: 2,
  17: 2,
  18: 2,
  19: 2,
  20: 5,
  21: 2,
  22: 2,
  23: 3,
  24: 4,
  25: 2,
  26: 2,
  27: 2,
  28: 4,
};

/**
 * Offizieller IHK-Musterlösungsschlüssel:
 * Abschlussprüfung Teil 2 Sommer 2025
 * Fertigungstechnik Teil A (S25 4060 K4)
 * Gesamt: 28 gebundene Aufgaben, 25 zu werten, 3 abzuwählen
 * Nicht abwählbar: [6, 7, 8, 9, 12, 16, 20, 28]
 */
export const OFFICIAL_IHK_S25_4060_SOLUTIONS: Record<number, number> = {
  1: 3,
  2: 2,
  3: 4,
  4: 3,
  5: 1,
  6: 1,
  7: 2,
  8: 4,
  9: 4,
  10: 4,
  11: 4,
  12: 3,
  13: 4,
  14: 5,
  15: 2,
  16: 5,
  17: 2,
  18: 1,
  19: 2,
  20: 3,
  21: 2,
  22: 1,
  23: 3,
  24: 4,
  25: 2,
  26: 2,
  27: 3,
  28: 2,
};

// Rückwärtskompatibilität für bestehende Importe
export const OFFICIAL_IHK_W25_4060_SOLUTIONS = OFFICIAL_IHK_W24_4060_SOLUTIONS;

export const W23_QUESTIONS_CATALOG: ExamQuestion[] = [
  { number: 1, isNonDeselectable: false, pageNumber: 2, topic: 'Fertigungsauftrag & Bauteilanalyse' },
  { number: 2, isNonDeselectable: true, pageNumber: 2, topic: 'Werkzeugauswahl & Schneidstoff (nicht abwählbar)' },
  { number: 3, isNonDeselectable: false, pageNumber: 3, topic: 'Drehoperation & Schnittparameter' },
  { number: 4, isNonDeselectable: false, pageNumber: 3, topic: 'Werkzeugkorrektur & Maßtoleranz' },
  { number: 5, isNonDeselectable: true, pageNumber: 3, topic: 'Frässtrategie & Gleichlauf/Gegenlauf (nicht abwählbar)' },
  { number: 6, isNonDeselectable: true, pageNumber: 4, topic: 'Schnittdatenberechnung & Vorschub (nicht abwählbar)' },
  { number: 7, isNonDeselectable: false, pageNumber: 4, topic: 'CNC-Programmierung & Koordinatensystem' },
  { number: 8, isNonDeselectable: false, pageNumber: 4, topic: 'Nullpunkte & Werkstückkoordinaten' },
  { number: 9, isNonDeselectable: false, pageNumber: 5, topic: 'Spannmittel & Ausrichtung' },
  { number: 10, isNonDeselectable: false, pageNumber: 5, topic: 'Prüfmittel & Messunsicherheit' },
  { number: 11, isNonDeselectable: false, pageNumber: 6, topic: 'Oberflächenbeschaffenheit & Rauheit' },
  { number: 12, isNonDeselectable: true, pageNumber: 6, topic: 'Form- und Lagetoleranzen (nicht abwählbar)' },
  { number: 13, isNonDeselectable: false, pageNumber: 6, topic: 'Arbeitssicherheit & Umweltschutz' },
  { number: 14, isNonDeselectable: false, pageNumber: 7, topic: 'Qualitätskontrolle & Dokumentation' },
];

export const DEFAULT_QUESTIONS_CATALOG: ExamQuestion[] = [
  { number: 1, isNonDeselectable: false, pageNumber: 3, topic: 'HSK Kegel-Hohlschaft-Aufnahmen' },
  { number: 2, isNonDeselectable: false, pageNumber: 3, topic: 'Wendeschneidplattenhalter DIN 4984' },
  { number: 3, isNonDeselectable: false, pageNumber: 3, topic: 'Eckenradius re beim Drehen' },
  { number: 4, isNonDeselectable: false, pageNumber: 4, topic: 'Längenkorrektur bei Maßabweichung' },
  { number: 5, isNonDeselectable: false, pageNumber: 4, topic: 'Interpolationsarten Industrieroboter' },
  { number: 6, isNonDeselectable: true, pageNumber: 4, topic: 'Vorschubgeschwindigkeit Gewinde M64x1,5' },
  { number: 7, isNonDeselectable: true, pageNumber: 4, topic: 'Drehzahlberechnung 12% Erhöhung' },
  { number: 8, isNonDeselectable: true, pageNumber: 5, topic: 'Wegmesssysteme Winkelcodierer' },
  { number: 9, isNonDeselectable: true, pageNumber: 5, topic: 'Werkzeugträger-Bezugspunkt Symbol' },
  { number: 10, isNonDeselectable: false, pageNumber: 5, topic: 'CNC-Steuerungsarten Schrägen/Radien' },
  { number: 11, isNonDeselectable: false, pageNumber: 5, topic: 'Passungs- und Toleranzprüfung G6' },
  { number: 12, isNonDeselectable: true, pageNumber: 6, topic: '5-Achs-Bearbeitungszentrum Koordinaten' },
  { number: 13, isNonDeselectable: false, pageNumber: 6, topic: 'Bezugspunkte Fräseraufnahme' },
  { number: 14, isNonDeselectable: false, pageNumber: 6, topic: 'Rundlaufeigenschaften & Wuchtgüte' },
  { number: 15, isNonDeselectable: false, pageNumber: 6, topic: 'Spindelsturz Fräsmaschine' },
  { number: 16, isNonDeselectable: true, pageNumber: 7, topic: 'CNC-G-Befehl G54 Werkstücknullpunkt' },
  { number: 17, isNonDeselectable: false, pageNumber: 7, topic: 'Maschinensteuerung Zyklen' },
  { number: 18, isNonDeselectable: false, pageNumber: 7, topic: 'Einschaltzustand G71, G90, G97' },
  { number: 19, isNonDeselectable: false, pageNumber: 7, topic: 'HPC vs. HSC Zerspanungsverfahren' },
  { number: 20, isNonDeselectable: true, pageNumber: 7, topic: 'Drehmomentberechnung Elektromotor' },
  { number: 21, isNonDeselectable: false, pageNumber: 8, topic: 'Sicherheitsvorrichtungen CNC-Maschinen' },
  { number: 22, isNonDeselectable: false, pageNumber: 8, topic: 'Roboter RRR-Kinematik' },
  { number: 23, isNonDeselectable: false, pageNumber: 8, topic: 'Werkzeugaufnahmen Schaftformen' },
  { number: 24, isNonDeselectable: false, pageNumber: 11, drawingPage: 10, topic: 'Schleifscheiben Klangprobe' },
  { number: 25, isNonDeselectable: false, pageNumber: 11, drawingPage: 10, topic: 'Unwucht bei Schleifbearbeitung' },
  { number: 26, isNonDeselectable: false, pageNumber: 11, drawingPage: 10, topic: 'Schleifscheibengefüge DIN ISO 603' },
  { number: 27, isNonDeselectable: false, pageNumber: 11, drawingPage: 10, topic: 'Weiche Schleifscheiben Einsatz' },
  { number: 28, isNonDeselectable: true, pageNumber: 11, drawingPage: 10, topic: 'Schleifverhältnis q Berechnung' },
];

/**
 * Erzeugt dynamisch einen Standard-Fragenkatalog für beliebige Aufgabenanzahl
 */
export function generateDefaultQuestions(
  totalQuestions: number,
  nonDeselectable: number[] = [],
  pageCount: number = 10
): ExamQuestion[] {
  const nonSet = new Set(nonDeselectable);
  return Array.from({ length: totalQuestions }, (_, i) => {
    const qNum = i + 1;
    const pageNum = Math.min(
      pageCount,
      Math.max(2, Math.floor(2 + (i / Math.max(1, totalQuestions)) * (pageCount - 2)))
    );
    const isLocked = nonSet.has(qNum);
    return {
      number: qNum,
      isNonDeselectable: isLocked,
      pageNumber: pageNum,
      topic: `Aufgabe ${qNum}${isLocked ? ' (nicht abwählbar)' : ''}`,
    };
  });
}

/**
 * Ermittelt das vollständige IHK-Prüfungsprofil anhand des Dateinamens oder Titels.
 */
export function getExamProfileForFile(filename: string): KnownExamProfile | null {
  const clean = filename.toLowerCase();

  // 1. Winter 2023/24 (W23 4060 K1/P1) - 14 Aufgaben
  if (
    clean.includes('ws23') ||
    clean.includes('wi23') ||
    clean.includes('w23') ||
    clean.includes('winter_2023') ||
    clean.includes('winter 2023') ||
    clean.includes('winter 2022/23') // Abfangen alter Bezeichnungen
  ) {
    return {
      idPrefix: 'w23-4060',
      examCode: 'W23 4060 K1/P1',
      season: 'Winter 2023/24',
      subject: 'Auftrags- und Funktionsanalyse Teil A',
      title: 'Winter 2023/24: Auftrags- und Funktionsanalyse Teil A (ZM 4060)',
      totalQuestions: 14,
      requiredQuestions: 11,
      maxDeselections: 3,
      nonDeselectableQuestions: [2, 5, 6, 12],
      solutions: { ...OFFICIAL_IHK_W23_4060_SOLUTIONS },
      pageCount: 7,
      questions: [...W23_QUESTIONS_CATALOG],
    };
  }

  // 2. Winter 2024/25 (W24 4060 K1) - 28 Aufgaben
  if (
    clean.includes('ws24') ||
    clean.includes('wi24') ||
    clean.includes('w24') ||
    clean.includes('winter_2024') ||
    clean.includes('winter 2024')
  ) {
    return {
      idPrefix: 'w24-4060',
      examCode: 'W24 4060 K1',
      season: 'Winter 2024/25',
      subject: 'Auftrags- und Funktionsanalyse Teil A',
      title: 'Winter 2024/25: Auftrags- und Funktionsanalyse Teil A (ZM 4060)',
      totalQuestions: 28,
      requiredQuestions: 25,
      maxDeselections: 3,
      nonDeselectableQuestions: [4, 6, 7, 8, 9, 12, 18, 22],
      solutions: { ...OFFICIAL_IHK_W24_4060_SOLUTIONS },
      pageCount: 11,
      questions: generateDefaultQuestions(28, [4, 6, 7, 8, 9, 12, 18, 22], 11),
    };
  }

  // 3. Sommer 2025 (S25 4060 K4) - 28 Aufgaben
  if (
    clean.includes('so25') ||
    clean.includes('s25') ||
    clean.includes('sommer_2025') ||
    clean.includes('sommer 2025')
  ) {
    return {
      idPrefix: 's25-4060',
      examCode: 'S25 4060 K4',
      season: 'Sommer 2025',
      subject: 'Fertigungstechnik Teil A',
      title: 'Sommer 2025: Fertigungstechnik Teil A (ZM 4060)',
      totalQuestions: 28,
      requiredQuestions: 25,
      maxDeselections: 3,
      nonDeselectableQuestions: [6, 7, 8, 9, 12, 16, 20, 28],
      solutions: { ...OFFICIAL_IHK_S25_4060_SOLUTIONS },
      pageCount: 12,
      questions: [...DEFAULT_QUESTIONS_CATALOG],
    };
  }

  return null;
}

/**
 * Ermittelt automatisch bekannte IHK-Musterlösungen anhand des Dateinamens
 */
export function getKnownSolutionsForFile(filename: string): Record<number, number> | null {
  const profile = getExamProfileForFile(filename);
  if (profile) {
    return { ...profile.solutions };
  }
  return null;
}
