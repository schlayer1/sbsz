/**
 * Offizielle Referenzarchitektur für die deterministische Kürzel-Generierung
 * gemäß school-student-auth Standard.
 */

export function generateStudentCode(fullName: string): string {
  if (!fullName || !fullName.trim()) return '';
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  const cleanLast = last
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss')
    .replace(/[^a-zA-Z0-9]/g, '');

  const cleanFirst = first
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss')
    .replace(/[^a-zA-Z0-9]/g, '');

  if (parts.length === 1) {
    return cleanFirst.slice(0, 4).toUpperCase();
  }

  // Erster Buchstabe Vorname + erste 3 Buchstaben Nachname (z. B. Lukas Müller -> LMUE)
  const code = (cleanFirst.slice(0, 1) + cleanLast.slice(0, 3)).toUpperCase();
  return code || 'SCHUELER';
}

export function formatStudentCode(code: string): string {
  return (code || '').trim().toUpperCase();
}
