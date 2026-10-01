export interface ExamQuestion {
  number: number;
  isNonDeselectable: boolean; // 8 Aufgaben dürfen nicht abgewählt werden
  pageNumber: number; // PDF-Seitenzahl für Schnellnavigation
  topic?: string; // z. B. "Werkzeughalter DIN 4984"
  drawingPage?: number; // z. B. Seite 10 (Bild a)
}

export interface ExamDefinition {
  id: string;
  title: string;
  subtitle: string;
  examCode: string; // z. B. "S25 4060 K4"
  profession: string; // z. B. "Zerspanungsmechaniker/-in"
  subject: string; // z. B. "Fertigungstechnik Teil A"
  season: string; // z. B. "Sommer 2025"
  totalQuestions: number; // 28
  requiredQuestions: number; // 25
  maxDeselections: number; // 3
  nonDeselectableQuestions: number[]; // [6, 7, 8, 9, 12, 16, 20, 28]
  questions: ExamQuestion[];
  solutions: Record<number, number>; // Aufgabe -> Richtige Antwort (1-5)
  pdfUrl: string; // Relativer Pfad oder Cloud Storage URL
  solutionPdfUrl?: string;
  pageCount: number;
  assignedClasses: string[]; // ["ZM22", "ZM23", "Alle"]
  assignedStudents: string[]; // Schüler-IDs oder leer für Klassenfreigabe
  isActive: boolean;
  createdAt: number;
  createdBy: string;
}

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface QuestionEvaluation {
  studentAnswer: number | null;
  correctAnswer: number;
  isDeselected: boolean;
  isCorrect: boolean;
  points: number; // 1 oder 0
}

export interface ExamScore {
  totalPoints: number; // von 25
  maxPoints: number; // 25
  percentage: number; // 0 - 100
  grade: number; // 1 bis 6 (IHK Schlüssel)
  gradeText: string; // "sehr gut", "gut", etc.
  answeredCount: number;
  deselectedCount: number;
  correctCount: number;
  errorCount: number;
  questionEvaluations: Record<number, QuestionEvaluation>;
}

export interface TeacherFeedback {
  id: string;
  submissionId: string;
  studentId: string;
  examId: string;
  text: string;
  strengths: string[];
  weaknesses: string[];
  learningTips: string[];
  references: string[];
  generatedAt: number;
  sentAt?: number;
  isSent: boolean;
  teacherName: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  answers: Record<number, number>; // Aufgabe -> Ausgewählte Option (1-5)
  deselected: number[]; // Abgewählte Aufgaben
  status: 'in_bearbeitung' | 'abgegeben';
  startedAt: number;
  updatedAt: number;
  submittedAt?: number;
  score?: ExamScore;
  feedback?: TeacherFeedback;
}

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
