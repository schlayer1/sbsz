import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Firestore,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { ExamDefinition, StudentProfile, ExamSubmission, FirebaseCustomConfig, TeacherFeedback } from '../types/exam';
import { SAMPLE_IHK_EXAM } from '../data/sampleExam';

export const LOCAL_FIREBASE_CONFIG_KEY = 'sbsz_custom_firebase_config_v1';
export const LOCAL_EXAMS_CACHE_KEY = 'sbsz_exams_cache_v1';
export const LOCAL_STUDENTS_CACHE_KEY = 'sbsz_students_cache_v1';
export const LOCAL_SUBMISSIONS_CACHE_KEY = 'sbsz_submissions_cache_v1';
export const CURRENT_STUDENT_SESSION_KEY = 'sbsz_current_student_session';

export const EXAMS_COLLECTION = 'sbsz_exams';
export const STUDENTS_COLLECTION = 'sbsz_students';
export const SUBMISSIONS_COLLECTION = 'sbsz_submissions';

export const DEFAULT_TEACHER_PIN = '1234';

let appInstance: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let storage: FirebaseStorage | null = null;

export function getCustomFirebaseConfig(): FirebaseCustomConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_FIREBASE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomFirebaseConfig(config: FirebaseCustomConfig | null): void {
  if (typeof window === 'undefined') return;
  if (config) {
    localStorage.setItem(LOCAL_FIREBASE_CONFIG_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(LOCAL_FIREBASE_CONFIG_KEY);
  }
  // Re-initialize
  initFirebase();
}

export function initFirebase(): void {
  const customConfig = getCustomFirebaseConfig();

  // Falls benutzerdefinierte Konfiguration existiert
  if (customConfig && customConfig.projectId && customConfig.apiKey) {
    try {
      if (getApps().length > 0) {
        // App neu initialisieren
        const currentApp = getApp();
        // Firebase erlaubt kein einfaches Neukonfigurieren ohne Neuerstellung
      }
      appInstance = initializeApp(customConfig, `sbsz_${Date.now()}`);
      db = getFirestore(appInstance);
      if (customConfig.storageBucket) {
        storage = getStorage(appInstance);
      }
      console.log('[Firebase] Erfolgreich initialisiert mit Projekt:', customConfig.projectId);
      return;
    } catch (err) {
      console.warn('[Firebase] Konnte benutzerdefinierte Konfiguration nicht laden:', err);
    }
  }

  // Fallback: Prüfen ob Vite Environment-Variablen gesetzt sind
  const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
  const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  if (envProjectId && envApiKey) {
    try {
      const envConfig = {
        apiKey: envApiKey,
        authDomain: `${envProjectId}.firebaseapp.com`,
        projectId: envProjectId,
        storageBucket:
          (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET ||
          `${envProjectId}.firebasestorage.app`,
        messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
      };
      appInstance = getApps().length === 0 ? initializeApp(envConfig) : getApp();
      db = getFirestore(appInstance);
      storage = getStorage(appInstance);
      console.log('[Firebase] Initialisiert über Vite .env Variablen:', envProjectId);
      return;
    } catch (err) {
      console.warn('[Firebase] Fehler bei .env Konfiguration:', err);
    }
  }

  // Kein Firebase konfiguriert -> Läuft reibungslos im integrierten Offline-/Local-First Modus!
  db = null;
  storage = null;
}

// Initialer Startaufruf
initFirebase();

// ==========================================
// PRÜFUNGSBÖGEN (EXAMS) CRUD
// ==========================================

export async function getExams(): Promise<ExamDefinition[]> {
  const localList = getLocalExams();

  if (!db) {
    if (localList.length === 0) {
      saveExamToLocal(SAMPLE_IHK_EXAM);
      return [SAMPLE_IHK_EXAM];
    }
    return localList;
  }

  try {
    const colRef = collection(db, EXAMS_COLLECTION);
    const snap = await getDocs(colRef);
    const cloudExams: ExamDefinition[] = [];
    snap.forEach((docSnap) => {
      cloudExams.push(docSnap.data() as ExamDefinition);
    });

    if (cloudExams.length > 0) {
      localStorage.setItem(LOCAL_EXAMS_CACHE_KEY, JSON.stringify(cloudExams));
      return cloudExams;
    } else {
      // Wenn in Firestore noch keine Bögen liegen, Beispielbogen hochladen
      await saveExam(SAMPLE_IHK_EXAM);
      return [SAMPLE_IHK_EXAM];
    }
  } catch (err) {
    console.warn('[Firebase] Fehler beim Laden der Prüfungen aus Firestore, nutze Cache:', err);
    if (localList.length === 0) {
      saveExamToLocal(SAMPLE_IHK_EXAM);
      return [SAMPLE_IHK_EXAM];
    }
    return localList;
  }
}

export async function saveExam(exam: ExamDefinition): Promise<void> {
  saveExamToLocal(exam);

  if (db) {
    try {
      const docRef = doc(db, EXAMS_COLLECTION, exam.id);
      await setDoc(docRef, exam, { merge: true });
      console.log(`[Firebase] Prüfung ${exam.id} in Firestore gespeichert.`);
    } catch (err) {
      console.warn('[Firebase] Konnte Prüfung nicht in Firestore speichern:', err);
    }
  }
}

export async function deleteExam(examId: string): Promise<void> {
  const local = getLocalExams().filter((e) => e.id !== examId);
  localStorage.setItem(LOCAL_EXAMS_CACHE_KEY, JSON.stringify(local));

  if (db) {
    try {
      const docRef = doc(db, EXAMS_COLLECTION, examId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('[Firebase] Konnte Prüfung nicht aus Firestore löschen:', err);
    }
  }
}

function getLocalExams(): ExamDefinition[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAMS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExamToLocal(exam: ExamDefinition): void {
  try {
    const list = getLocalExams();
    const filtered = list.filter((e) => e.id !== exam.id);
    localStorage.setItem(LOCAL_EXAMS_CACHE_KEY, JSON.stringify([exam, ...filtered]));
  } catch {}
}

import { generateStudentCode, formatStudentCode } from '../utils/studentCode';

// ==========================================
// SCHÜLER (STUDENTS) CRUD & AUTH (school-student-auth Standard)
// ==========================================

export async function loginWithStudentCode(rawCode: string): Promise<StudentProfile> {
  const code = formatStudentCode(rawCode);
  if (!code) {
    throw new Error('Bitte ein gültiges Kürzel eingeben.');
  }

  // 1. Zuerst im lokalen Cache prüfen
  const localStudents = getLocalStudents();
  let student = localStudents.find(
    (s) => formatStudentCode(s.studentCode) === code || s.id.toUpperCase() === code
  );

  // 2. In Firestore suchen
  if (db) {
    try {
      const colRef = collection(db, STUDENTS_COLLECTION);
      const q = query(colRef, where('studentCode', '==', code));
      const snap = await getDocs(q);

      if (!snap.empty) {
        student = snap.docs[0].data() as StudentProfile;
      }
    } catch (err) {
      console.warn('[Firebase] Fehler bei der Kürzelsuche in Firestore:', err);
    }
  }

  if (!student) {
    throw new Error(`Das Kürzel "${code}" wurde nicht gefunden. Bitte prüfe die Schreibweise oder lege ein neues Kürzel an.`);
  }

  const now = Date.now();
  student = { ...student, lastLoginAt: now };

  saveStudentToLocal(student);
  localStorage.setItem(CURRENT_STUDENT_SESSION_KEY, JSON.stringify(student));

  if (db) {
    try {
      await setDoc(doc(db, STUDENTS_COLLECTION, student.id), student, { merge: true });
    } catch {}
  }

  return student;
}

export async function loginOrCreateStudent(
  firstName: string,
  lastName: string,
  className: string
): Promise<StudentProfile> {
  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();
  const cleanClass = className.trim().toUpperCase();
  const fullName = `${cleanFirst} ${cleanLast}`.trim();

  // Deterministisches 4-stelliges Kürzel nach school-student-auth Standard (z. B. LMUE)
  const studentCode = generateStudentCode(fullName);

  // Eindeutige ID
  const studentId = `s_${cleanLast.toLowerCase().replace(/[^a-z0-9]/g, '')}_${cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}_${cleanClass.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const now = Date.now();
  let student: StudentProfile = {
    id: studentId,
    studentCode,
    firstName: cleanFirst,
    lastName: cleanLast,
    fullName,
    className: cleanClass,
    createdAt: now,
    lastLoginAt: now,
  };

  // Lokal prüfen
  const localStudents = getLocalStudents();
  const existingLocal = localStudents.find(
    (s) => s.id === studentId || formatStudentCode(s.studentCode) === studentCode
  );
  if (existingLocal) {
    student = { ...existingLocal, lastLoginAt: now };
  }

  saveStudentToLocal(student);
  localStorage.setItem(CURRENT_STUDENT_SESSION_KEY, JSON.stringify(student));

  // In Firestore sichern
  if (db) {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, studentId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cloudData = snap.data() as StudentProfile;
        student = { ...cloudData, lastLoginAt: now };
      }
      await setDoc(docRef, student, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Konnte Schüler nicht in Firestore aktualisieren:', err);
    }
  }

  return student;
}

export function getCurrentStudentSession(): StudentProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_STUDENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logoutCurrentStudent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_STUDENT_SESSION_KEY);
}

export async function getAllStudents(): Promise<StudentProfile[]> {
  const localList = getLocalStudents();
  if (!db) return localList;

  try {
    const snap = await getDocs(collection(db, STUDENTS_COLLECTION));
    const cloudStudents: StudentProfile[] = [];
    snap.forEach((docSnap) => cloudStudents.push(docSnap.data() as StudentProfile));
    if (cloudStudents.length > 0) {
      localStorage.setItem(LOCAL_STUDENTS_CACHE_KEY, JSON.stringify(cloudStudents));
      return cloudStudents;
    }
  } catch (err) {
    console.warn('[Firebase] Fehler beim Laden der Schüler:', err);
  }
  return localList;
}

function getLocalStudents(): StudentProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStudentToLocal(student: StudentProfile): void {
  try {
    const list = getLocalStudents().filter((s) => s.id !== student.id);
    localStorage.setItem(LOCAL_STUDENTS_CACHE_KEY, JSON.stringify([student, ...list]));
  } catch {}
}

// ==========================================
// EINREICHUNGEN (SUBMISSIONS) CRUD
// ==========================================

export async function getStudentSubmission(examId: string, studentId: string): Promise<ExamSubmission | null> {
  const submissionId = `sub_${examId}_${studentId}`;
  const localSubs = getLocalSubmissions();
  const localSub = localSubs.find((s) => s.id === submissionId);

  if (!db) return localSub || null;

  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as ExamSubmission;
      saveSubmissionToLocal(data);
      return data;
    }
  } catch (err) {
    console.warn('[Firebase] Fehler beim Laden der Abgabe:', err);
  }

  return localSub || null;
}

export async function saveExamSubmission(submission: ExamSubmission): Promise<void> {
  saveSubmissionToLocal(submission);

  if (db) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submission.id);
      await setDoc(docRef, submission, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Konnte Abgabe nicht in Firestore speichern:', err);
    }
  }
}

export async function getAllSubmissions(): Promise<ExamSubmission[]> {
  const localList = getLocalSubmissions();
  if (!db) return localList;

  try {
    const snap = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    const cloudSubs: ExamSubmission[] = [];
    snap.forEach((docSnap) => cloudSubs.push(docSnap.data() as ExamSubmission));
    if (cloudSubs.length > 0) {
      localStorage.setItem(LOCAL_SUBMISSIONS_CACHE_KEY, JSON.stringify(cloudSubs));
      return cloudSubs;
    }
  } catch (err) {
    console.warn('[Firebase] Fehler beim Laden aller Abgaben:', err);
  }

  return localList;
}

function getLocalSubmissions(): ExamSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSubmissionToLocal(submission: ExamSubmission): void {
  try {
    const list = getLocalSubmissions().filter((s) => s.id !== submission.id);
    localStorage.setItem(LOCAL_SUBMISSIONS_CACHE_KEY, JSON.stringify([submission, ...list]));
  } catch {}
}

export async function sendFeedbackToStudent(submissionId: string, feedback: TeacherFeedback): Promise<void> {
  feedback.isSent = true;
  feedback.sentAt = Date.now();

  const localSubs = getLocalSubmissions();
  const sub = localSubs.find((s) => s.id === submissionId);
  if (sub) {
    sub.feedback = feedback;
    saveSubmissionToLocal(sub);
  }

  if (db) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      await setDoc(docRef, { feedback }, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Konnte Feedback nicht in Firestore sichern:', err);
    }
  }
}
