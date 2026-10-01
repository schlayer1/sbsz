import { ExamDefinition } from '../types/exam';

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

export const OFFICIAL_IHK_W25_4060_SOLUTIONS: Record<number, number> = {
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

export const DEFAULT_QUESTIONS_CATALOG = [
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
 * Ermittelt automatisch bekannte IHK-Musterlösungen anhand des Dateinamens
 */
export function getKnownSolutionsForFile(filename: string): Record<number, number> | null {
  const clean = filename.toLowerCase();
  if (clean.includes('so25') || clean.includes('sommer_2025') || clean.includes('s25')) {
    return { ...OFFICIAL_IHK_S25_4060_SOLUTIONS };
  }
  if (clean.includes('ws25') || clean.includes('wi25') || clean.includes('winter_2025') || clean.includes('w25')) {
    return { ...OFFICIAL_IHK_W25_4060_SOLUTIONS };
  }
  return null;
}
