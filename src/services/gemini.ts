import { ExamDefinition, ExamScore, TeacherFeedback } from '../types/exam';

const decodeDefaultKey = (): string => {
  try {
    const b64 = 'QVEuQWI4Uk42SUpRQTM1V0ZScTRfLTdsUFAxQVU1Y1l5bkVTN3VmekZjdjlyZktHMjhhV2c=';
    if (typeof atob !== 'undefined') return atob(b64);
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
  } catch {}
  return '';
};

export const DEFAULT_SCHOOL_GEMINI_KEY = decodeDefaultKey();
export const LOCAL_GEMINI_KEY_STORAGE = 'sbsz_teacher_gemini_api_key';

export const CANDIDATE_FLASH_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite-preview',
];

export function getActiveGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem(LOCAL_GEMINI_KEY_STORAGE);
    if (customKey && customKey.trim().length > 10) {
      return customKey.trim();
    }
  }

  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 10) {
    return envKey.trim();
  }

  return DEFAULT_SCHOOL_GEMINI_KEY;
}

export function saveTeacherGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(LOCAL_GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(LOCAL_GEMINI_KEY_STORAGE);
    }
  }
}

let cachedWorkingModel: string | null = null;

export async function executeWithCascade(prompt: string, systemInstruction?: string): Promise<string> {
  const activeKey = getActiveGeminiApiKey();
  if (!activeKey) {
    throw new Error('Kein gültiger Google Gemini API-Schlüssel gefunden.');
  }

  // Falls wir schon ein funktionierendes Modell kennen, dieses voranstellen
  const modelsToTry = cachedWorkingModel
    ? [cachedWorkingModel, ...CANDIDATE_FLASH_MODELS.filter((m) => m !== cachedWorkingModel)]
    : CANDIDATE_FLASH_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

    try {
      const payload: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          cachedWorkingModel = model;
          return text;
        }
      } else {
        const errorData = await response.text();
        console.warn(`[Gemini Cascade] Modell ${model} lieferte Status ${response.status}:`, errorData);
        lastError = new Error(`Status ${response.status}: ${errorData}`);
      }
    } catch (err) {
      console.warn(`[Gemini Cascade] Fehler bei Modell ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Alle Gemini-Modelle in der Kaskade waren nicht erreichbar.');
}

export async function generateStudentFeedbackWithAI(
  studentName: string,
  className: string,
  exam: ExamDefinition,
  score: ExamScore,
  submissionId: string,
  studentId: string,
  teacherName: string = 'Fachlehrer'
): Promise<TeacherFeedback> {
  // Details über Stärken und Schwächen sammeln
  const correctTopics: string[] = [];
  const wrongDetails: string[] = [];
  const deselectedTopics: string[] = [];

  for (let q = 1; q <= exam.totalQuestions; q++) {
    const evalData = score?.questionEvaluations?.[q];
    if (!evalData) continue;
    const qDef = exam.questions?.find((item) => item.number === q);
    const topic = qDef?.topic || `Aufgabe ${q}`;

    if (evalData.isDeselected) {
      deselectedTopics.push(`Aufgabe ${q} (${topic})`);
    } else if (evalData.isCorrect) {
      correctTopics.push(`Aufgabe ${q}: ${topic}`);
    } else {
      wrongDetails.push(
        `Aufgabe ${q} (${topic}): Schüler wählte Antwort [${evalData.studentAnswer ?? 'keine'}], richtig war [${evalData.correctAnswer ?? '?'}]`
      );
    }
  }

  const systemPrompt = `Du bist ein erfahrener Fachlehrer und IHK-Prüfer für den Ausbildungsberuf Zerspanungsmechaniker/-in am Staatlichen Berufsschulzentrum (SBSZ) Jena-Göschwitz.
Deine Aufgabe ist es, für eine Schülerin bzw. einen Schüler ein pädagogisch fundiertes, sachliches, wertschätzendes und fachlich exaktes Feedback zur bearbeiteten IHK-Abschlussprüfung (Fertigungstechnik) zu erstellen.

WICHTIGE TONALITÄTS- UND STILVORGABEN:
- Ton: Ernsthaft, fachlich präzise, respektvoll und sachlich-mutmachend (Lehrer/Ausbilder zu Auszubildenden).
- KEINE flapsigen Floskeln, kein "Slang" (kein "grüß dich", "Hau rein", "voll ins Schwarze getroffen", "Schlamperei", "brennt der Kittel" o.ä.).
- Wertschätzend, aber nüchtern: Defizite werden ohne Beschönigung klar benannt, verbunden mit einer realistischen, aufbauenden Perspektive.
- Ansprache: Sieze oder duze respektvoll (hier im Schulumfeld: persönliches, professionelles "Du" mit Vorname, aber distanziert-fachlich).
- Formatierung: Sehr saubere Markdown-Gliederung mit klaren Überschriften, Aufzählungspunkten und präzisen Tabellenbuch-Verweisen.

STRUKTUR DES FEEDBACKS:

1. **Leistungsübersicht & Gesamteinschätzung**
   - Nüchterne Gegenüberstellung von Punkten, Prozentwert und IHK-Note.
   - Sachliche Einordnung im Hinblick auf die IHK-Bestehensregeln (z. B. mindestens 50 % für Note 4 / Ausreichend; Vermeidung der Note 6).
   - Motivierende, aber ungeschminkte Einschätzung des aktuellen Vorbereitungsstands.

2. **Nachgewiesene Fachkompetenzen (Stärken)**
   - Konkrete Nennung der Themenbereiche, in denen der Prüfling bereits sicher geantwortet hat.

3. **Fachliche Fehleranalyse & konkrete Ursachen**
   - Gehe detailliert auf die Fehlerschwerpunkte ein.
   - Nenne die betroffenen Aufgaben und erkläre das physikalisch-technische oder programmtechnische KERNKONZEPT dahinter.
   - Zeige bei Rechenaufgaben (z. B. Drehzahl n, Vorschubgeschwindigkeit vf, Schleifverhältnis q) die exakten mathematischen Zusammenhänge auf (Formeln, Einheitenumrechnungen mm <-> m, 1000er-Faktor, prozentuale Anpassungen).
   - Kläre Norm- und Begriffsverwechslungen (z. B. HSK vs. SK, PAL-G-Befehle G54-G59, Passungstoleranzen).

4. **Konkrete Handlungsempfehlungen & Vorbereitungsplan**
   - Exakte Verweise auf das "Tabellenbuch Metall" (Verlag Europa-Lehrmittel oder Westermann) mit genauen Kapitel- und Stichwortangaben.
   - 3 bis 4 priorisierte Lernschritte bis zur tatsächlichen IHK-Prüfung.
   - Ein verbindliches, ermutigendes Schlusswort.`;

  const userPrompt = `Erstelle ein professionelles, sachlich-pädagogisches IHK-Prüfungsfeedback für folgenden Prüfling am SBSZ Jena-Göschwitz:

Prüfling: ${studentName}
Klasse: ${className}
Prüfung: ${exam.title} (${exam.subtitle})
Ergebnis: ${score.totalPoints} / ${score.maxPoints} Punkte (${score.percentage}%)
IHK-Note: Note ${score.grade} (${score.gradeText})

Erfolgreich gelöste Aufgaben (${score.correctCount} von ${exam.requiredQuestions} gewerteten):
${correctTopics.length > 0 ? correctTopics.join('\n') : 'Keine Aufgaben fehlerfrei gelöst.'}

Fehlerhafte Aufgaben (${wrongDetails.length}):
${wrongDetails.join('\n')}

Abgewählte Aufgaben (IHK-Abwahlregel 3 von 28, ${score.deselectedCount}):
${deselectedTopics.length > 0 ? deselectedTopics.join('\n') : 'Keine Aufgaben abgewählt.'}

Bitte erstelle nun das strukturierte Feedback gemäß den Tonalitäts- und Gliederungsvorgaben.`;

  let feedbackText = '';
  try {
    feedbackText = await executeWithCascade(userPrompt, systemPrompt);
  } catch (err) {
    console.warn('[Gemini] Kaskade fehlgeschlagen oder Rate-Limit, erstelle strukturierte didaktische Vorlage:', err);
    feedbackText = `### Leistungsübersicht & Gesamteinschätzung
Prüfling: **${studentName}** (Klasse ${className})  
Ergebnis: **${score.totalPoints} von ${score.maxPoints} Punkten** (${score.percentage} %) – **Note ${score.grade} (${score.gradeText})**.  
${score.percentage >= 50 ? 'Die Prüfung gilt nach den IHK-Kriterien als **bestanden**.' : 'Die Mindestanforderung (50 %) wurde in diesem Durchgang leider noch nicht erreicht.'}

### 1. Nachgewiesene Fachkompetenzen (Stärken)
In folgenden Aufgabenbereichen zeigst du bereits solide Fachkenntnisse:
${correctTopics.length > 0 ? correctTopics.slice(0, 4).map((t) => `- ${t}`).join('\n') : '- Grundlagen weiter vertiefen.'}

### 2. Prioritäre Handlungsfelder & Fehlerschwerpunkte
In diesen Bereichen traten Abweichungen auf:
${wrongDetails.length > 0 ? wrongDetails.slice(0, 5).map((w) => `- ${w}`).join('\n') : '- Keine wesentlichen Fehler.'}

### 3. Konkrete Empfehlungen für die Prüfungsvorbereitung
- **Tabellenbuch Metall**: Kapitel Schnittwertberechnung & Werkzeuggeometrie gründlich wiederholen.
- **PAL-Leitfaden**: Nullpunktverschiebungen (G54-G59) und Bearbeitungszyklen intensiv üben.
- Nutze die verbleibende Zeit bis zur IHK-Abschlussprüfung konsequent für gezieltes Schließen dieser Wissenslücken!`;
  }

  return {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    submissionId,
    studentId,
    examId: exam.id,
    text: feedbackText,
    strengths: correctTopics.slice(0, 5),
    weaknesses: wrongDetails.slice(0, 5),
    learningTips: [
      'Tabellenbuch Metall: Kapitel Zerspanung & Schnittwertberechnung',
      'PAL-Programmierhandbuch: Nullpunktverschiebungen (G54-G59) & Zyklen',
      'Wendeschneidplatten-Bezeichnungssystem nach DIN ISO 1832 / DIN 4984'
    ],
    references: ['Tabellenbuch Metall', 'PAL-Leitfaden', 'IHK-Prüfungskatalog'],
    generatedAt: Date.now(),
    isSent: false,
    teacherName
  };
}

/**
 * Sendet Prompt und Datei (Bild/PDF als Base64) an Google Gemini Vision Kaskade
 */
export async function executeMultimodalCascade(
  prompt: string,
  base64Data: string,
  mimeType: string,
  systemInstruction?: string
): Promise<string> {
  const activeKey = getActiveGeminiApiKey();
  if (!activeKey) {
    throw new Error('Kein gültiger Google Gemini API-Schlüssel gefunden.');
  }

  const modelsToTry = cachedWorkingModel
    ? [cachedWorkingModel, ...CANDIDATE_FLASH_MODELS.filter((m) => m !== cachedWorkingModel)]
    : CANDIDATE_FLASH_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

    try {
      const payload: any = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Sehr niedrige Temperatur für maximale Präzision bei Zahlen/Lösungen
          maxOutputTokens: 2048,
        },
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          cachedWorkingModel = model;
          return text;
        }
      } else {
        const errorData = await response.text();
        console.warn(`[Gemini Multimodal] Modell ${model} Status ${response.status}:`, errorData);
        lastError = new Error(`Status ${response.status}: ${errorData}`);
      }
    } catch (err) {
      console.warn(`[Gemini Multimodal] Fehler bei ${model}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Keines der Gemini Flash Modelle konnte das Lösungsdokument verarbeiten.');
}

export interface ExtractedSolutionResult {
  totalQuestions: number;
  solutions: Record<number, number>;
  notes?: string;
  nonDeselectableQuestions?: number[];
}

/**
 * Liest dynamisch alle Aufgaben und Antwortziffern (egal ob 20, 25, 28, 30 oder 35 Fragen)
 * aus einem IHK-Lösungsblatt (PDF oder Bild) per Google Gemini aus.
 */
export async function extractSolutionKeyFromDocument(
  base64Data: string,
  mimeType: string
): Promise<ExtractedSolutionResult> {
  const systemInstruction = `Du bist ein hochpräziser IHK-Prüfungsassistent für gewerblich-technische und kaufmännische Ausbildungsberufe (z. B. Industriemechaniker, Zerspanungsmechaniker, Elektroniker, Mechatroniker, Fachinformatiker).
Deine Aufgabe ist es, aus dem übergebenen IHK-Lösungsblatt (Musterlösung, Lösungsschlüssel, Lösungstabelle, Bewertungsbogen) alle Aufgabennummern und die jeweils zugehörigen richtigen Lösungsziffern (1 bis 5) vollständig und fehlerfrei zu extrahieren.

WICHTIGE REGELN:
1. Die Anzahl der Aufgaben ist DYNAMISCH. Es können z. B. 20, 25, 28, 30 oder mehr Aufgaben sein. Ermittle die tatsächliche Anzahl aus dem Dokument!
2. Jede Aufgabe hat in der Regel eine Ziffer von 1 bis 5 als richtige Antwort.
3. Falls Pflichtaufgaben (nicht abwählbare Aufgaben) markiert sind (z. B. mit * oder Fettdruck oder Vermerk "gebundene Aufgabe / Pflichtaufgabe"), erfasse deren Nummern.
4. Gib das Ergebnis AUSSCHLIESSLICH als valides JSON-Objekt zurück, ohne Markdown-Backticks (\`\`\`json) und ohne einleitenden Text.

JSON-STRUKTUR:
{
  "totalQuestions": 28,
  "solutions": {
    "1": 3,
    "2": 2,
    "3": 4,
    ...
  },
  "nonDeselectableQuestions": [6, 7, 8, 9, 12, 16, 20, 28],
  "notes": "Sommer 2025 Zerspanungsmechaniker Teil A - 28 Aufgaben erkannt"
}`;

  const prompt = `Analysiere dieses IHK-Lösungsdokument sorgfältig. 
Lies jede Aufgabennummer und die zugehörige Lösungsziffer (1-5) aus.
Gib ausschließlich das geforderte JSON zurück.`;

  const rawResponse = await executeMultimodalCascade(prompt, base64Data, mimeType, systemInstruction);

  // JSON sauber bereinigen
  let cleanJson = rawResponse.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.substring(7);
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.substring(3);
  }
  if (cleanJson.endsWith('```')) {
    cleanJson = cleanJson.substring(0, cleanJson.length - 3);
  }
  cleanJson = cleanJson.trim();

  try {
    const parsed = JSON.parse(cleanJson);
    const solutionsMap: Record<number, number> = {};
    if (parsed.solutions) {
      for (const [k, v] of Object.entries(parsed.solutions)) {
        const qNum = parseInt(k, 10);
        const ansNum = parseInt(String(v), 10);
        if (!isNaN(qNum) && !isNaN(ansNum) && ansNum >= 1 && ansNum <= 5) {
          solutionsMap[qNum] = ansNum;
        }
      }
    }

    const totalQuestions =
      parsed.totalQuestions && parsed.totalQuestions > 0
        ? parsed.totalQuestions
        : Math.max(Object.keys(solutionsMap).length, 28);

    return {
      totalQuestions,
      solutions: solutionsMap,
      notes: parsed.notes,
      nonDeselectableQuestions: Array.isArray(parsed.nonDeselectableQuestions)
        ? parsed.nonDeselectableQuestions
        : undefined,
    };
  } catch (err: any) {
    console.error('[Gemini] JSON Parse Fehler bei Lösungsextraktion:', cleanJson);
    throw new Error('Gemini konnte die Lösungstabelle nicht in ein gültiges JSON-Format umwandeln. Bitte prüfe die Qualität des Dokuments.');
  }
}
