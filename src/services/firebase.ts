import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
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

// Offizielle Firebase-Konfiguration des SBSZ Projekts
export const DEFAULT_FIREBASE_CONFIG: FirebaseCustomConfig = {
  apiKey: "AIzaSyAaBXjIB7IOqSb0oIEBxrNPriKMibmemuw",
  authDomain: "sbsz-ihk-pruefungen.firebaseapp.com",
  projectId: "sbsz-ihk-pruefungen",
  storageBucket: "sbsz-ihk-pruefungen.firebasestorage.app",
  messagingSenderId: "517996225971",
  appId: "1:517996225971:web:775fd950e65dce648c17c6",
};

export function initFirebase(): void {
  const customConfig = getCustomFirebaseConfig();

  // 1. Priorität: Im Lehrer-Dashboard manuell hinterlegte Konfiguration (localStorage)
  if (customConfig && customConfig.projectId && customConfig.apiKey) {
    try {
      if (getApps().length > 0) {
        // App neu initialisieren
        const currentApp = getApp();
      }
      appInstance = initializeApp(customConfig, `sbsz_${Date.now()}`);
      db = getFirestore(appInstance);
      if (customConfig.storageBucket) {
        storage = getStorage(appInstance);
      }
      console.log('[Firebase] Erfolgreich initialisiert mit Dashboard-Konfiguration:', customConfig.projectId);
      return;
    } catch (err) {
      console.warn('[Firebase] Konnte benutzerdefinierte Konfiguration nicht laden:', err);
    }
  }

  // 2. Priorität: Vite Environment-Variablen (z. B. auf Vercel)
  const envProjectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
  const envApiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  if (envProjectId && envApiKey) {
    try {
      const envConfig = {
        apiKey: envApiKey,
        authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
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

  // 3. Priorität: Hinterlegte Standard-Projektkonfiguration (sbsz-ihk-pruefungen)
  if (DEFAULT_FIREBASE_CONFIG.projectId && DEFAULT_FIREBASE_CONFIG.apiKey) {
    try {
      appInstance = getApps().length === 0 ? initializeApp(DEFAULT_FIREBASE_CONFIG) : getApp();
      db = getFirestore(appInstance);
      storage = getStorage(appInstance);
      console.log('[Firebase] Initialisiert über hinterlegtes SBSZ Firebase-Projekt:', DEFAULT_FIREBASE_CONFIG.projectId);
      return;
    } catch (err) {
      console.warn('[Firebase] Fehler bei Initialisierung der Standard-Konfiguration:', err);
    }
  }

  // Fallback: Offline-/Local-First Modus
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

export async function deactivateAllExams(): Promise<ExamDefinition[]> {
  const local = getLocalExams();
  const updatedList = local.map((e) => ({ ...e, isActive: false }));
  localStorage.setItem(LOCAL_EXAMS_CACHE_KEY, JSON.stringify(updatedList));

  if (db) {
    try {
      const colRef = collection(db, EXAMS_COLLECTION);
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.update(docSnap.ref, { isActive: false });
      });
      await batch.commit();
      console.log('[Firebase] Alle Prüfungen in Firestore erfolgreich deaktiviert.');
    } catch (err) {
      console.warn('[Firebase] Fehler beim Deaktivieren aller Prüfungen in Firestore:', err);
    }
  }

  return updatedList;
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

/**
 * Entfernt rekursiv alle 'undefined' Werte aus Objekten & Arrays,
 * da Firestore setDoc/updateDoc mit undefined strikt abbricht.
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((v) => v !== undefined)
      .map((v) => deepSanitize(v)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = deepSanitize(value);
      }
    }
    return clean as T;
  }
  return obj;
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

  // 2. In Firestore suchen (mit 4s Timeout, um bei WebKit/Safari Netzwerk-Hangs nicht einzufrieren)
  if (db) {
    try {
      const colRef = collection(db, STUDENTS_COLLECTION);
      const q = query(colRef, where('studentCode', '==', code));
      
      const firestorePromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore Timeout')), 4000)
      );

      const snap = (await Promise.race([firestorePromise, timeoutPromise])) as any;

      if (snap && !snap.empty) {
        student = snap.docs[0].data() as StudentProfile;
      }
    } catch (err) {
      console.warn('[Firebase] Kürzelsuche in Firestore fehlgeschlagen oder Timeout:', err);
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

    const map = new Map<string, StudentProfile>();
    localList.forEach((s) => map.set(s.id, s));
    cloudStudents.forEach((s) => map.set(s.id, s));

    const merged = Array.from(map.values()).sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
    localStorage.setItem(LOCAL_STUDENTS_CACHE_KEY, JSON.stringify(merged));
    return merged;
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
  
  // 1. Lokale Suche: exakte ID oder studentId match
  let localSub = localSubs.find((s) => s.id === submissionId || (s.examId === examId && (s.studentId === studentId || s.studentCode === studentId)));

  if (!db) return localSub || null;

  try {
    const mergeWithLocal = (cloudData: Partial<ExamSubmission>): ExamSubmission => {
      // Falls cloudData nur ein partielles Update war (z. B. { feedback }),
      // behalten wir Antworten und Metadaten aus dem lokalen Cache bei.
      const merged: ExamSubmission = {
        id: submissionId,
        examId,
        studentId,
        studentCode: '',
        studentName: '',
        className: '',
        answers: {},
        deselected: [],
        status: 'in_bearbeitung',
        startedAt: Date.now(),
        updatedAt: Date.now(),
        ...localSub,
        ...cloudData,
      };

      // Wenn cloudData keine answers hat, aber localSub schon:
      if ((!cloudData.answers || Object.keys(cloudData.answers).length === 0) && localSub?.answers) {
        merged.answers = localSub.answers;
      }
      if ((!cloudData.deselected || cloudData.deselected.length === 0) && localSub?.deselected) {
        merged.deselected = localSub.deselected;
      }
      if (!cloudData.score && localSub?.score) {
        merged.score = localSub.score;
      }
      if (!cloudData.studentName && localSub?.studentName) {
        merged.studentName = localSub.studentName;
      }
      if (!cloudData.className && localSub?.className) {
        merged.className = localSub.className;
      }
      return merged;
    };

    // 2. Firestore Direkt-Abfrage
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = mergeWithLocal(snap.data() as ExamSubmission);
      saveSubmissionToLocal(data);
      return data;
    }

    // 3. Fallback: Query nach studentId oder studentCode
    const q1 = query(collection(db, SUBMISSIONS_COLLECTION), where('examId', '==', examId), where('studentId', '==', studentId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const data = mergeWithLocal(snap1.docs[0].data() as ExamSubmission);
      saveSubmissionToLocal(data);
      return data;
    }

    const q2 = query(collection(db, SUBMISSIONS_COLLECTION), where('examId', '==', examId), where('studentCode', '==', studentId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const data = mergeWithLocal(snap2.docs[0].data() as ExamSubmission);
      saveSubmissionToLocal(data);
      return data;
    }
  } catch (err) {
    console.warn('[Firebase] Fehler beim Laden der Abgabe:', err);
  }

  return localSub || null;
}

export const OFFLINE_QUEUE_KEY = 'sbsz_offline_sync_queue_v1';

export function getOfflineSyncQueue(): ExamSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToOfflineSyncQueue(submission: ExamSubmission): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineSyncQueue().filter((s) => s.id !== submission.id);
    queue.push(submission);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[Offline-Queue] Fehler beim Hinzufügen:', err);
  }
}

export function removeFromOfflineSyncQueue(submissionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineSyncQueue().filter((s) => s.id !== submissionId);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[Offline-Queue] Fehler beim Entfernen:', err);
  }
}

export async function flushOfflineSyncQueue(): Promise<number> {
  if (!db || typeof window === 'undefined' || !navigator.onLine) return 0;
  const queue = getOfflineSyncQueue();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  for (const sub of queue) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, sub.id);
      await setDoc(docRef, sub, { merge: true });
      removeFromOfflineSyncQueue(sub.id);
      syncedCount++;
    } catch (err) {
      console.warn(`[Offline-Queue] Sync fehlgeschlagen für ${sub.id}:`, err);
    }
  }
  if (syncedCount > 0) {
    console.log(`[Offline-Queue] ${syncedCount} Offline-Abgaben synchronisiert.`);
  }
  return syncedCount;
}

// Global Network Event Listener für verzögerungsfreien Sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Netzwerk] Wieder online! Synchronisiere Offline-Warteschlange...');
    flushOfflineSyncQueue();
  });
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine && db) {
      flushOfflineSyncQueue();
    }
  }, 15000);
}

export async function saveExamSubmission(submission: ExamSubmission): Promise<void> {
  const cleanSubmission = deepSanitize(submission);
  saveSubmissionToLocal(cleanSubmission);

  // Falls offline, direkt in sichere lokale Warteschlange
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    addToOfflineSyncQueue(cleanSubmission);
    return;
  }

  if (db) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, cleanSubmission.id);
      await setDoc(docRef, cleanSubmission, { merge: true });
      removeFromOfflineSyncQueue(cleanSubmission.id);
    } catch (err) {
      console.warn('[Firebase] Konnte Abgabe nicht in Firestore speichern; puffere in Offline-Queue:', err);
      addToOfflineSyncQueue(cleanSubmission);
    }
  } else {
    addToOfflineSyncQueue(cleanSubmission);
  }
}

export async function deleteExamSubmission(submissionId: string): Promise<void> {
  const local = getLocalSubmissions().filter((s) => s.id !== submissionId);
  localStorage.setItem(LOCAL_SUBMISSIONS_CACHE_KEY, JSON.stringify(local));

  if (db) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      await deleteDoc(docRef);
      console.log(`[Firebase] Abgabe ${submissionId} erfolgreich gelöscht.`);
    } catch (err) {
      console.warn('[Firebase] Konnte Abgabe nicht aus Firestore löschen:', err);
    }
  }
}

export async function deleteMultipleExamSubmissions(submissionIds: string[]): Promise<void> {
  const idSet = new Set(submissionIds);
  const local = getLocalSubmissions().filter((s) => !idSet.has(s.id));
  localStorage.setItem(LOCAL_SUBMISSIONS_CACHE_KEY, JSON.stringify(local));

  if (db) {
    const firestore = db;
    try {
      const deletePromises = submissionIds.map((id) => {
        const docRef = doc(firestore, SUBMISSIONS_COLLECTION, id);
        return deleteDoc(docRef);
      });
      await Promise.all(deletePromises);
      console.log(`[Firebase] ${submissionIds.length} Abgaben erfolgreich gelöscht.`);
    } catch (err) {
      console.warn('[Firebase] Konnte Abgaben nicht aus Firestore löschen:', err);
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

    // Merge: Firestore ist führend, aber lokale neue Einträge nicht verlieren
    const map = new Map<string, ExamSubmission>();
    localList.forEach((s) => map.set(s.id, s));
    cloudSubs.forEach((s) => {
      const existing = map.get(s.id);
      if (existing) {
        // Deep merge, sodass lokale Details erhalten bleiben
        map.set(s.id, { ...existing, ...s });
      } else {
        map.set(s.id, s);
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    localStorage.setItem(LOCAL_SUBMISSIONS_CACHE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('[Firebase] Fehler beim Laden aller Abgaben:', err);
  }

  return localList;
}

export async function getAllSubmissionsForStudent(studentId: string, studentCode?: string): Promise<ExamSubmission[]> {
  const all = await getAllSubmissions();
  const normalizedCode = studentCode ? studentCode.toUpperCase() : '';
  return all.filter((s) => {
    if (s.studentId === studentId) return true;
    if (normalizedCode && (s.studentCode?.toUpperCase() === normalizedCode || s.studentId.toUpperCase() === normalizedCode)) {
      return true;
    }
    return false;
  }).sort((a, b) => (b.submittedAt || b.updatedAt || 0) - (a.submittedAt || a.updatedAt || 0));
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
  const cleanFeedback = deepSanitize({
    ...feedback,
    isSent: true,
    sentAt: Date.now(),
  });

  const localSubs = getLocalSubmissions();
  const sub = localSubs.find((s) => s.id === submissionId);
  if (sub) {
    sub.feedback = cleanFeedback;
    saveSubmissionToLocal(sub);
  }

  if (db) {
    try {
      const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
      // Beim Senden des Feedbacks auch Metadaten sicherstellen, falls das Dokument in Firestore noch unvollständig war
      const updatePayload: Record<string, any> = { feedback: cleanFeedback };
      if (sub) {
        if (sub.examId) updatePayload.examId = sub.examId;
        if (sub.studentId) updatePayload.studentId = sub.studentId;
        if (sub.studentCode) updatePayload.studentCode = sub.studentCode;
        if (sub.studentName) updatePayload.studentName = sub.studentName;
        if (sub.className) updatePayload.className = sub.className;
        if (sub.status) updatePayload.status = sub.status;
        if (sub.score) updatePayload.score = deepSanitize(sub.score);
        if (sub.answers) updatePayload.answers = sub.answers;
        if (sub.deselected) updatePayload.deselected = sub.deselected;
        if (sub.submittedAt) updatePayload.submittedAt = sub.submittedAt;
        if (sub.startedAt) updatePayload.startedAt = sub.startedAt;
        updatePayload.updatedAt = Date.now();
      }
      await setDoc(docRef, updatePayload, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Konnte Feedback nicht in Firestore sichern:', err);
    }
  }
}
