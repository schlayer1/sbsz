import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { PdfViewer } from './components/PdfViewer';
import { DigitalAnswerSheet } from './components/DigitalAnswerSheet';
import { StudentResultView } from './components/StudentResultView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentAuthModal } from './components/StudentAuthModal';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { StudentFeedbackModal } from './components/StudentFeedbackModal';
import { SAMPLE_IHK_EXAM } from './data/sampleExam';
import {
  ExamDefinition,
  StudentProfile,
  ExamSubmission,
} from './types/exam';
import {
  getCurrentStudentSession,
  loginOrCreateStudent,
  loginWithStudentCode,
  logoutCurrentStudent,
  getExams,
  getStudentSubmission,
  getAllSubmissionsForStudent,
  saveExamSubmission,
  getAllStudents,
} from './services/firebase';
import { calculateIhkScore } from './utils/ihkGrader';
import { FileText, Edit3, User, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';

export function App() {
  // Navigation & Mode
  const [activeView, setActiveView] = useState<'exam' | 'result' | 'teacher'>('exam');
  const [mobileTab, setMobileTab] = useState<'pdf' | 'sheet'>('pdf');
  const [isTeacherMode, setIsTeacherMode] = useState(false);

  // Auth Modals
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);

  // User & Data
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [cachedStudents, setCachedStudents] = useState<StudentProfile[]>([]);
  const [exams, setExams] = useState<ExamDefinition[]>([SAMPLE_IHK_EXAM]);
  const [activeExam, setActiveExam] = useState<ExamDefinition>(SAMPLE_IHK_EXAM);
  const [currentSubmission, setCurrentSubmission] = useState<ExamSubmission | null>(null);
  const [studentSubmissions, setStudentSubmissions] = useState<ExamSubmission[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);

  // Helper to load all submissions for current student (multi-exam feedback support)
  const loadAllStudentSubmissions = async (st: StudentProfile | null) => {
    if (!st) {
      setStudentSubmissions([]);
      return;
    }
    try {
      const allSubs = await getAllSubmissionsForStudent(st.id, st.studentCode);
      setStudentSubmissions(allSubs);
    } catch (err) {
      console.warn('[App] Fehler beim Laden aller Schüler-Abgaben:', err);
    }
  };

  // Student Examination State
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [deselected, setDeselected] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(3); // Start on first question page
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drill-Training State (Feature 2)
  const [drillMode, setDrillMode] = useState<boolean>(false);
  const [drillQuestions, setDrillQuestions] = useState<number[]>([]);

  // Initial load
  useEffect(() => {
    const session = getCurrentStudentSession();
    if (session) {
      setCurrentStudent(session);
    } else {
      setShowStudentModal(true);
    }

    // Load available exams & student list
    getExams().then((loaded) => {
      if (loaded.length > 0) {
        setExams(loaded);
        setActiveExam(loaded[0]);
      }
    });

    getAllStudents().then((stList) => {
      setCachedStudents(stList);
    });
  }, []);

  // When student or active exam changes, load student's submission / progress
  useEffect(() => {
    if (!currentStudent || !activeExam) return;

    let isMounted = true;

    const fetchSubmission = async () => {
      try {
        const sub = await getStudentSubmission(activeExam.id, currentStudent.id);
        if (!isMounted) return;

        if (sub) {
          setCurrentSubmission(sub);
          // Only sync answers & deselected if exam is already submitted OR if user hasn't touched anything locally yet
          if (sub.status === 'abgegeben') {
            setAnswers(sub.answers || {});
            setDeselected(sub.deselected || []);
            setLastSavedAt(sub.updatedAt);
            if (activeView !== 'result') {
              setActiveView('result');
            }
          } else {
            // In progress: populate initial state if not yet loaded
            setAnswers((prev) => (Object.keys(prev).length === 0 ? sub.answers || {} : prev));
            setDeselected((prev) => (prev.length === 0 ? sub.deselected || [] : prev));
            setLastSavedAt(sub.updatedAt);
          }
        } else {
          // Fresh attempt
          setCurrentSubmission(null);
          setAnswers({});
          setDeselected([]);
        }
      } catch (err) {
        console.warn('[App] Fehler beim Laden der Abgabe:', err);
      }
    };

    fetchSubmission();

    // Polling NUR dann aktiv, wenn Prüfung abgegeben wurde und wir auf Lehrer-Feedback warten
    // Das verhindert unnötige Server-Anfragen, UI-Freezes und State-Überschreibungen während der Schüler tippt.
    let interval: any = null;
    if (currentSubmission?.status === 'abgegeben' && !currentSubmission?.feedback?.isSent) {
      interval = setInterval(() => {
        fetchSubmission();
        if (currentStudent) loadAllStudentSubmissions(currentStudent);
      }, 4000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [currentStudent, activeExam, currentSubmission?.status, currentSubmission?.feedback?.isSent]);

  // Load all submissions for student on login / switch
  useEffect(() => {
    loadAllStudentSubmissions(currentStudent);
  }, [currentStudent]);

  // Debounced Auto-Save
  const saveTimeoutRef = useRef<any>(null);

  const triggerAutoSave = (newAnswers: Record<number, number>, newDeselected: number[]) => {
    if (!currentStudent || !activeExam) return;

    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const now = Date.now();
      const subId = `sub_${activeExam.id}_${currentStudent.id}`;
      const updatedSub: ExamSubmission = {
        id: subId,
        examId: activeExam.id,
        studentId: currentStudent.id,
        studentCode: currentStudent.studentCode || '',
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        className: currentStudent.className,
        answers: newAnswers,
        deselected: newDeselected,
        status: currentSubmission?.status === 'abgegeben' ? 'abgegeben' : 'in_bearbeitung',
        startedAt: currentSubmission?.startedAt || now,
        updatedAt: now,
        submittedAt: currentSubmission?.submittedAt,
        score: currentSubmission?.score,
        feedback: currentSubmission?.feedback,
      };

      await saveExamSubmission(updatedSub);
      setCurrentSubmission(updatedSub);
      setLastSavedAt(now);
      setIsSaving(false);
    }, 600);
  };

  // Answer Selection
  const handleSelectAnswer = (questionNum: number, option: number) => {
    if (!currentStudent) {
      setShowStudentModal(true);
      return;
    }

    const newAnswers = { ...answers };
    if (newAnswers[questionNum] === option) {
      delete newAnswers[questionNum]; // Toggle off
    } else {
      newAnswers[questionNum] = option;
    }

    // If deselected, remove from deselected
    const newDeselected = deselected.filter((q) => q !== questionNum);

    setAnswers(newAnswers);
    setDeselected(newDeselected);
    triggerAutoSave(newAnswers, newDeselected);
  };

  // Deselect Toggle
  const handleToggleDeselect = (questionNum: number) => {
    if (!currentStudent) {
      setShowStudentModal(true);
      return;
    }

    let newDeselected = [...deselected];
    const newAnswers = { ...answers };

    if (newDeselected.includes(questionNum)) {
      newDeselected = newDeselected.filter((q) => q !== questionNum);
    } else {
      if (newDeselected.length >= activeExam.maxDeselections) {
        alert(
          `Du hast bereits die maximal erlaubten ${activeExam.maxDeselections} Aufgaben abgewählt. Aktiviere zuerst eine andere abgewählte Aufgabe.`
        );
        return;
      }
      newDeselected.push(questionNum);
      delete newAnswers[questionNum];
    }

    setAnswers(newAnswers);
    setDeselected(newDeselected);
    triggerAutoSave(newAnswers, newDeselected);
  };

  // Submit Exam
  const handleSubmitExam = async () => {
    if (!currentStudent || !activeExam) return;

    const now = Date.now();
    const score = calculateIhkScore(activeExam, answers, deselected);
    const subId = `sub_${activeExam.id}_${currentStudent.id}`;

    const completedSub: ExamSubmission = {
      id: subId,
      examId: activeExam.id,
      studentId: currentStudent.id,
      studentCode: currentStudent.studentCode || '',
      studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
      className: currentStudent.className,
      answers,
      deselected,
      status: 'abgegeben',
      startedAt: currentSubmission?.startedAt || now,
      updatedAt: now,
      submittedAt: now,
      score,
      feedback: currentSubmission?.feedback,
    };

    await saveExamSubmission(completedSub);
    setCurrentSubmission(completedSub);
    setLastSavedAt(now);
    setActiveView('result');
    await loadAllStudentSubmissions(currentStudent);
  };

  // Jump to page helper
  const handleJumpToPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    // On mobile, automatically switch tab to PDF viewer
    if (window.innerWidth < 1024) {
      setMobileTab('pdf');
    }
  };

  // Start targeted drill training on wrong questions
  const handleStartDrillMode = (wrongQList: number[]) => {
    setDrillQuestions(wrongQList);
    setDrillMode(true);
    setActiveView('exam');
    if (wrongQList.length > 0) {
      const firstQ = wrongQList[0];
      const qDef = activeExam.questions.find((q) => q.number === firstQ);
      const targetPage = qDef?.pageNumber || 3;
      handleJumpToPage(targetPage);
    }
  };

  const handleExitDrillMode = () => {
    setDrillMode(false);
    setActiveView('result');
  };

  // Student Auth Handlers according to school-student-auth skill
  const handleLoginWithCode = async (code: string) => {
    const student = await loginWithStudentCode(code);
    setCurrentStudent(student);
    const updatedList = await getAllStudents();
    setCachedStudents(updatedList);
  };

  const handleRegisterStudent = async (firstName: string, lastName: string, className: string) => {
    const student = await loginOrCreateStudent(firstName, lastName, className);
    setCurrentStudent(student);
    const updatedList = await getAllStudents();
    setCachedStudents(updatedList);
  };

  const handleStudentLogout = () => {
    logoutCurrentStudent();
    setCurrentStudent(null);
    setCurrentSubmission(null);
    setStudentSubmissions([]);
    setAnswers({});
    setDeselected([]);
    setActiveView('exam');
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        currentStudent={currentStudent}
        isTeacherMode={isTeacherMode}
        onOpenStudentLogin={() => setShowStudentModal(true)}
        onOpenTeacherLogin={() => setShowTeacherModal(true)}
        onLogoutStudent={handleStudentLogout}
        onExitTeacherMode={() => {
          setIsTeacherMode(false);
          setActiveView('exam');
        }}
        activeView={activeView}
        setActiveView={setActiveView}
        hasSubmission={currentSubmission?.status === 'abgegeben'}
        hasFeedback={Boolean(currentSubmission?.feedback?.isSent)}
        totalFeedbackCount={studentSubmissions.filter((s) => s.feedback?.isSent).length}
        onOpenFeedbackOverview={() => setShowFeedbackModal(true)}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full flex flex-col transition-opacity duration-300 ${
          !currentStudent && !isTeacherMode
            ? 'pointer-events-none select-none opacity-20'
            : ''
        }`}
      >
        {/* ========================================================= */}
        {/* VIEW 1: LEHRER DASHBOARD */}
        {/* ========================================================= */}
        {isTeacherMode ? (
          <TeacherDashboard
            onSelectExamForPreview={(exam) => {
              setActiveExam(exam);
              setIsTeacherMode(false);
              setActiveView('exam');
            }}
            onClose={() => setIsTeacherMode(false)}
          />
        ) : activeView === 'result' && currentSubmission ? (
          /* ========================================================= */
          /* VIEW 2: SCHÜLER ERGEBNIS & AUSWERTUNG */
          /* ========================================================= */
          <StudentResultView
            exam={activeExam}
            submission={currentSubmission}
            onRetakeExam={() => {
              setDrillMode(false);
              setActiveView('exam');
            }}
            onJumpToPdfPage={(pageNum) => {
              setCurrentPage(pageNum);
              setActiveView('exam');
              setMobileTab('pdf');
            }}
            studentSubmissions={studentSubmissions}
            exams={exams}
            onSelectSubmissionExam={(examId) => {
              const target = exams.find((e) => e.id === examId);
              if (target) {
                setActiveExam(target);
              }
            }}
            onOpenFeedbackOverview={() => setShowFeedbackModal(true)}
            onStartDrillMode={handleStartDrillMode}
          />
        ) : (
          /* ========================================================= */
          /* VIEW 3: SCHÜLER WORKBENCH (SPLIT-SCREEN PDF & BOGEN) */
          /* ========================================================= */
          <div className="flex-1 w-full flex flex-col min-h-0">
            {/* Student Welcome / Sign-in Warning Banner if not logged in */}
            {!currentStudent && (
              <div className="bg-blue-900 text-white px-4 py-3 border-b border-blue-950 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center font-bold text-sm">
                    !
                  </div>
                  <div className="text-xs sm:text-sm">
                    <strong>Gast-Vorschau aktiv:</strong> Melde dich mit deinem Namen und deiner Klasse an,
                    damit dein Fortschritt automatisch gespeichert und vom Fachlehrer ausgewertet werden kann.
                  </div>
                </div>
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="bg-white text-blue-950 hover:bg-blue-50 font-bold px-3.5 py-1.5 rounded-xl text-xs sm:text-sm shadow transition-colors flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>Jetzt anmelden</span>
                </button>
              </div>
            )}

            {/* Mobile / Tablet Tab Toggle Bar (< 1024px) */}
            <div className="lg:hidden bg-slate-900 text-white p-2.5 flex items-center justify-center gap-2 border-b border-slate-800 shrink-0">
              <button
                onClick={() => setMobileTab('pdf')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  mobileTab === 'pdf'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Aufgabenheft (PDF S. {currentPage})</span>
              </button>

              <button
                onClick={() => setMobileTab('sheet')}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  mobileTab === 'sheet'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>
                  Antwortbogen ({Object.keys(answers).length}/{activeExam.requiredQuestions || activeExam.totalQuestions})
                </span>
              </button>
            </div>

            {/* Exam Selection Header Bar */}
            {(() => {
              const availableExams = exams.filter((ex) => {
                if (!ex.isActive) return false;
                if (!currentStudent) return true;
                return (
                  ex.assignedClasses.includes('Alle') ||
                  ex.assignedClasses.includes(currentStudent.className)
                );
              });

              if (availableExams.length === 0) {
                return (
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-amber-950">
                        Aktuell keine Prüfungshefte freigeschaltet
                      </h3>
                      <p className="text-xs text-amber-800 max-w-md mx-auto">
                        Ihre Lehrkraft hat die Prüfungsbögen derzeit gesperrt. Sobald ein Bogen für deine Klasse freigegeben wird, erscheint er hier automatisch.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sbsz-lightBlue text-sbsz-darkBlue flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-sbsz-blue" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Prüfungsheft auswählen:
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={activeExam.id}
                          onChange={(e) => {
                            const found = exams.find((x) => x.id === e.target.value);
                            if (found) {
                              setActiveExam(found);
                              setCurrentPage(3);
                            }
                          }}
                          className="text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-sbsz-blue cursor-pointer truncate max-w-[280px] sm:max-w-md"
                        >
                          {availableExams.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.examCode ? `[${ex.examCode}] ` : ''}{ex.title}
                            </option>
                          ))}
                        </select>

                        <span className="hidden sm:inline-block bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                          {activeExam.subject}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="hidden md:inline">Status:</span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Freigegeben
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Split Screen Workbench Layout */}
            <div className="flex-1 w-full max-w-[2100px] mx-auto p-2 sm:p-4 lg:p-5 2xl:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-0 h-[calc(100vh-125px)]">
              {/* Left Column: PDF Viewer */}
              <div
                className={`lg:col-span-6 xl:col-span-7 2xl:col-span-7 h-full ${
                  mobileTab === 'pdf' ? 'block' : 'hidden lg:block'
                }`}
              >
                <PdfViewer
                  exam={activeExam}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  jumpToDrawing={() => setCurrentPage(10)}
                />
              </div>

              {/* Right Column: Digital Answer Sheet */}
              <div
                className={`lg:col-span-6 xl:col-span-5 2xl:col-span-5 h-full ${
                  mobileTab === 'sheet' ? 'block' : 'hidden lg:block'
                }`}
              >
                <DigitalAnswerSheet
                  exam={activeExam}
                  answers={answers}
                  deselected={deselected}
                  onSelectAnswer={handleSelectAnswer}
                  onToggleDeselect={handleToggleDeselect}
                  onSubmitExam={handleSubmitExam}
                  onJumpToPage={handleJumpToPage}
                  lastSavedAt={lastSavedAt}
                  isSaving={isSaving}
                  drillMode={drillMode}
                  drillQuestions={drillQuestions}
                  onExitDrillMode={handleExitDrillMode}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modals */}
      <StudentAuthModal
        isOpen={showStudentModal || (!currentStudent && !isTeacherMode)}
        preventClose={!currentStudent && !isTeacherMode}
        onClose={() => setShowStudentModal(false)}
        onLoginWithCode={handleLoginWithCode}
        onRegisterStudent={handleRegisterStudent}
        cachedStudents={cachedStudents}
        onOpenTeacherLogin={() => {
          setShowStudentModal(false);
          setShowTeacherModal(true);
        }}
      />

      <TeacherAuthModal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={() => {
          setIsTeacherMode(true);
          setActiveView('teacher');
          setShowStudentModal(false);
        }}
      />

      {/* Student Feedback Overview Modal (All Submissions & Feedbacks) */}
      {currentStudent && (
        <StudentFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          currentStudent={currentStudent}
          submissions={studentSubmissions}
          exams={exams}
          onSelectSubmissionExam={(examId) => {
            const target = exams.find((e) => e.id === examId);
            if (target) {
              setActiveExam(target);
              setActiveView('result');
              setShowFeedbackModal(false);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
