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
    const evalData = score.questionEvaluations[q];
    const qDef = exam.questions.find((item) => item.number === q);
    const topic = qDef?.topic || `Aufgabe ${q}`;

    if (evalData.isDeselected) {
      deselectedTopics.push(`Aufgabe ${q} (${topic})`);
    } else if (evalData.isCorrect) {
      correctTopics.push(`Aufgabe ${q}: ${topic}`);
    } else {
      wrongDetails.push(
        `Aufgabe ${q} (${topic}): Schüler wählte Antwort [${evalData.studentAnswer ?? 'keine'}], richtig war [${evalData.correctAnswer}]`
      );
    }
  }

  const systemPrompt = `Du bist ein erfahrener Fachlehrer und IHK-Prüfungscoach im Bereich Fertigungstechnik / Metalltechnik für Auszubildende zum Zerspanungsmechaniker / Feinwerkmechaniker am SBSZ.
Deine Aufgabe ist es, für eine Schülerin bzw. einen Schüler ein individuelles, didaktisch fundiertes, ermutigendes und zugleich präzises Lern-Feedback zu einer bearbeiteten IHK-Abschlussprüfung zu verfassen.

Formatiere die Antwort übersichtlich mit Abschnitten:
1. Persönliche Einschätzung & Gesamteindruck (Note, Punkte, IHK-Bestehensgrenze)
2. Fachliche Stärken (Was saß schon sehr sicher?)
3. Konkrete Fehlerschwerpunkte (Warum lagen hier Fehler vor und was ist das Kernkonzept?)
4. Gezielte Lerntipps & Anlaufstellen für die Prüfungsvorbereitung (z. B. Tabellenbuch Metall Abschnitte Fertigungstechnik/CNC, DIN-Normen für Wendeschneidplatten DIN 4984, Formelsammlung Schnittwerte/Vorschub, PAL-Befehle G54/G90).

Schreibe in einem wertschätzenden, motivierenden Lehrer-Ton (duzt den Prüfling).`;

  const userPrompt = `Erstelle ein detailliertes IHK-Prüfungsfeedback für folgenden Prüfling:

Name: ${studentName}
Klasse: ${className}
Prüfung: ${exam.title} (${exam.subtitle})
Erreichte Punkte: ${score.totalPoints} von ${score.maxPoints} Punkten (${score.percentage}%)
IHK-Note: ${score.grade} (${score.gradeText})

Richtig gelöste Aufgaben (${score.correctCount}):
${correctTopics.slice(0, 15).join('\n')}

Fehlerhafte Aufgaben (${score.errorCount}):
${wrongDetails.join('\n')}

Abgewählte Aufgaben (IHK-Abwahlregel, ${score.deselectedCount}):
${deselectedTopics.join('\n')}

Bitte erstelle ein professionelles, motivierendes Feedback!`;

  const feedbackText = await executeWithCascade(userPrompt, systemPrompt);

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
