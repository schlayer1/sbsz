import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  BarChart3,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  Eye,
  ShieldCheck,
  RefreshCw,
  Search,
  ExternalLink,
  Check,
  Database,
  Key,
  Copy,
  Lock,
  Unlock,
  FolderSync,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import {
  ExamDefinition,
  StudentProfile,
  ExamSubmission,
  FirebaseCustomConfig,
  TeacherFeedback,
} from '../types/exam';
import {
  getExams,
  saveExam,
  deleteExam,
  getAllStudents,
  getAllSubmissions,
  sendFeedbackToStudent,
  getCustomFirebaseConfig,
  saveCustomFirebaseConfig,
  db,
} from '../services/firebase';
import {
  generateStudentFeedbackWithAI,
  getActiveGeminiApiKey,
  saveTeacherGeminiApiKey,
} from '../services/gemini';
import {
  fetchDriveFolderFiles,
  pairExamFiles,
  getActiveDriveFolderId,
  saveActiveDriveFolderId,
  getActiveDriveApiKey,
  saveActiveDriveApiKey,
  DiscoveredExamBundle,
} from '../services/googleDrive';

interface TeacherDashboardProps {
  onSelectExamForPreview: (exam: ExamDefinition) => void;
  onClose: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onSelectExamForPreview,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'students' | 'analytics' | 'gemini' | 'cloud'>(
    'students'
  );

  // Data states
  const [exams, setExams] = useState<ExamDefinition[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search
  const [selectedClass, setSelectedClass] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Student for Detail Modal & Gemini
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiFeedbackDraft, setAiFeedbackDraft] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [feedbackSentSuccess, setFeedbackSentSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Firebase Config Form
  const [fbConfig, setFbConfig] = useState<FirebaseCustomConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  });
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  // Google Drive Sync States
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveApiKey, setDriveApiKey] = useState('');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);
  const [driveSyncSuccess, setDriveSyncSuccess] = useState<string | null>(null);
  const [discoveredBundles, setDiscoveredBundles] = useState<DiscoveredExamBundle[]>([]);

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedExams, loadedStudents, loadedSubs] = await Promise.all([
        getExams(),
        getAllStudents(),
        getAllSubmissions(),
      ]);
      setExams(loadedExams);
      setStudents(loadedStudents);
      setSubmissions(loadedSubs);

      const savedConfig = getCustomFirebaseConfig();
      if (savedConfig) setFbConfig(savedConfig);

      const activeGeminiKey = getActiveGeminiApiKey();
      if (activeGeminiKey) setGeminiKeyInput(activeGeminiKey);

      setDriveFolderId(getActiveDriveFolderId());
      setDriveApiKey(getActiveDriveApiKey());
    } catch (err) {
      console.error('Fehler beim Laden der Dashboard-Daten:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered submissions (Supports searching by Name, Klasse, and 4-stelliges Kürzel nach school-student-auth)
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesClass = selectedClass === 'Alle' || sub.className === selectedClass;
    const matchesSearch =
      searchQuery === '' ||
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.studentCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const allClasses = Array.from(
    new Set(['Alle', ...submissions.map((s) => s.className), ...students.map((s) => s.className)])
  ).filter(Boolean);

  // AI Feedback Generation
  const handleGenerateFeedback = async (sub: ExamSubmission) => {
    setSelectedSubmission(sub);
    setIsGeneratingAi(true);
    setAiError(null);
    setFeedbackSentSuccess(false);

    const exam = exams.find((e) => e.id === sub.examId) || exams[0];
    if (!exam || !sub.score) {
      setAiError('Für diesen Schüler liegt noch kein auswertbares Ergebnis vor.');
      setIsGeneratingAi(false);
      return;
    }

    try {
      const feedback = await generateStudentFeedbackWithAI(
        sub.studentName,
        sub.className,
        exam,
        sub.score,
        sub.id,
        sub.studentId,
        'Fachlehrer SBSZ Jena'
      );
      setAiFeedbackDraft(feedback.text);
    } catch (err: any) {
      setAiError(err?.message || 'Fehler beim Generieren des Feedbacks.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!selectedSubmission || !aiFeedbackDraft) return;

    const teacherFeedback: TeacherFeedback = {
      id: `fb_${Date.now()}`,
      submissionId: selectedSubmission.id,
      studentId: selectedSubmission.studentId,
      examId: selectedSubmission.examId,
      text: aiFeedbackDraft,
      strengths: [],
      weaknesses: [],
      learningTips: ['Tabellenbuch Metall', 'PAL Leitfaden CNC'],
      references: ['DIN 4984', 'G54 Werkstück-Nullpunkt'],
      generatedAt: Date.now(),
      sentAt: Date.now(),
      isSent: true,
      teacherName: 'Fachlehrer Metalltechnik SBSZ Jena',
    };

    await sendFeedbackToStudent(selectedSubmission.id, teacherFeedback);
    setFeedbackSentSuccess(true);
    await loadData();
  };

  const handleToggleExamActive = async (exam: ExamDefinition) => {
    const updatedExam: ExamDefinition = {
      ...exam,
      isActive: !exam.isActive,
    };
    await saveExam(updatedExam);
    setExams((prev) => prev.map((e) => (e.id === exam.id ? updatedExam : e)));
  };

  const handleDeleteExam = async (examId: string) => {
    if (!window.confirm('Möchtest du diesen Prüfungsbogen wirklich unwiderruflich löschen?')) return;
    await deleteExam(examId);
    setExams((prev) => prev.filter((e) => e.id !== examId));
  };

  const handleToggleClassAssignment = async (exam: ExamDefinition, cls: string) => {
    let updatedClasses = [...exam.assignedClasses];
    if (updatedClasses.includes(cls)) {
      updatedClasses = updatedClasses.filter((c) => c !== cls);
    } else {
      updatedClasses.push(cls);
    }
    const updatedExam = { ...exam, assignedClasses: updatedClasses };
    await saveExam(updatedExam);
    setExams((prev) => prev.map((e) => (e.id === exam.id ? updatedExam : e)));
  };

  const handleSyncGoogleDrive = async () => {
    setIsSyncingDrive(true);
    setDriveSyncError(null);
    setDriveSyncSuccess(null);
    try {
      saveActiveDriveFolderId(driveFolderId);
      saveActiveDriveApiKey(driveApiKey);

      const files = await fetchDriveFolderFiles(driveFolderId, driveApiKey);
      const bundles = pairExamFiles(files);
      setDiscoveredBundles(bundles);

      if (bundles.length === 0) {
        setDriveSyncSuccess('Ordner erfolgreich gescannt: Keine neuen PDF-Prüfungsbögen gefunden.');
      } else {
        setDriveSyncSuccess(
          `Erfolgreich synchronisiert! ${bundles.length} Prüfungsheft(e) im Google Drive Ordner entdeckt.`
        );
      }
    } catch (err: any) {
      console.error('Google Drive Sync Fehler:', err);
      setDriveSyncError(err?.message || 'Fehler beim Synchronisieren mit Google Drive.');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleImportDiscoveredExam = async (bundle: DiscoveredExamBundle) => {
    const existing = exams.find((e) => e.id === bundle.id);
    if (existing) {
      alert('Dieser Prüfungsbogen ist bereits im Portal hinterlegt.');
      return;
    }

    const newExam: ExamDefinition = {
      id: bundle.id,
      title: bundle.title,
      subtitle: `Google Drive Synchronisation (${bundle.taskPdfFile.name})`,
      examCode: bundle.examCode,
      profession: 'Zerspanungsmechaniker/-in',
      subject: 'IHK Abschlussprüfung Teil 2',
      season: 'Aktuell',
      totalQuestions: 28,
      requiredQuestions: 25,
      maxDeselections: 3,
      nonDeselectableQuestions: [6, 7, 8, 9, 12, 16, 20, 28],
      pageCount: 12,
      pdfUrl: bundle.previewUrl,
      solutionPdfUrl: bundle.solutionPreviewUrl,
      assignedClasses: ['Alle'],
      assignedStudents: [],
      isActive: true, // Direkt freigeschaltet
      createdAt: Date.now(),
      createdBy: 'Fachlehrer (Google Drive Sync)',
      questions: Array.from({ length: 28 }, (_, i) => ({
        number: i + 1,
        isNonDeselectable: [6, 7, 8, 9, 12, 16, 20, 28].includes(i + 1),
        pageNumber: i < 3 ? 3 : i < 7 ? 4 : i < 11 ? 5 : i < 15 ? 6 : i < 20 ? 7 : i < 23 ? 8 : 11,
        topic: `IHK Aufgabe ${i + 1}`,
      })),
      solutions: {}, // Musterlösungen
    };

    await saveExam(newExam);
    setExams((prev) => [newExam, ...prev]);
    alert(`Prüfungsbogen "${bundle.title}" wurde erfolgreich angelegt und für Schüler freigeschaltet!`);
  };

  const handleSaveConfig = () => {
    if (fbConfig.projectId && fbConfig.apiKey) {
      saveCustomFirebaseConfig(fbConfig);
    }
    if (geminiKeyInput.trim()) {
      saveTeacherGeminiApiKey(geminiKeyInput.trim());
    }
    if (driveFolderId.trim()) {
      saveActiveDriveFolderId(driveFolderId);
    }
    if (driveApiKey.trim()) {
      saveActiveDriveApiKey(driveApiKey);
    }
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 3000);
  };

  // Question Heatmap
  const computeQuestionAnalytics = () => {
    const totalSubsWithScore = filteredSubmissions.filter((s) => s.score !== null);
    const count = totalSubsWithScore.length;
    if (count === 0) return [];

    const stats: {
      questionNum: number;
      topic: string;
      errorRate: number;
      correctRate: number;
      deselectedRate: number;
    }[] = [];

    const currentExam = exams[0];
    const totalQ = currentExam?.totalQuestions || 28;

    for (let q = 1; q <= totalQ; q++) {
      let errors = 0;
      let corrects = 0;
      let deselected = 0;

      totalSubsWithScore.forEach((sub) => {
        const evalData = sub.score?.questionEvaluations[q];
        if (evalData) {
          if (evalData.isDeselected) deselected++;
          else if (evalData.isCorrect) corrects++;
          else errors++;
        }
      });

      const qDef = currentExam?.questions.find((item) => item.number === q);

      stats.push({
        questionNum: q,
        topic: qDef?.topic || `Aufgabe ${q}`,
        errorRate: Math.round((errors / count) * 100),
        correctRate: Math.round((corrects / count) * 100),
        deselectedRate: Math.round((deselected / count) * 100),
      });
    }

    return stats.sort((a, b) => b.errorRate - a.errorRate);
  };

  const questionAnalytics = computeQuestionAnalytics();

  return (
    <div className="w-full max-w-[2100px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 sm:py-6 space-y-6 animate-fade-in">
      {/* Dashboard Top Header in SBSZ Blue Theme */}
      <div className="bg-gradient-to-r from-sbsz-darkBlue via-sbsz-blue to-sbsz-blue text-white p-5 sm:p-6 rounded-2xl shadow-xl border border-sbsz-navy/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0">
            <img src="/sbsz-logo.png" alt="SBSZ Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                SBSZ Jena-Göschwitz • Lehrer-Dashboard
              </h1>
              <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">
                Kollegium
              </span>
            </div>
            <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
              Prüfungsverwaltung, Schülerfortschritt, Fehlerquoten und didaktische KI-Lernfeedbacks
            </p>
          </div>
        </div>

        {/* Database & Storage Status indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-sbsz-navy/70 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${db ? 'bg-sbsz-lime animate-pulse' : 'bg-amber-400'}`}
            />
            <span className="text-white font-medium">
              {db ? 'Firebase Cloud aktiv' : 'Lokaler Cache aktiv'}
            </span>
          </div>

          <button
            onClick={loadData}
            className="p-2 bg-sbsz-navy/70 hover:bg-sbsz-navy rounded-xl text-white transition-colors"
            title="Daten aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
        {[
          { id: 'students', label: 'Schüler & Abgaben', icon: Users, count: submissions.length },
          { id: 'exams', label: 'Prüfungsbögen verwalten', icon: FileText, count: exams.length },
          { id: 'analytics', label: 'Klassen-Fehleranalyse', icon: BarChart3 },
          { id: 'gemini', label: 'KI-Feedback (Gemini)', icon: Sparkles },
          { id: 'cloud', label: 'Cloud-Speicher & Setup', icon: Cloud },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sbsz-blue text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCHÜLER & ABGABEN */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Controls Strip: Class Filter & Search */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Klasse:</span>
              {allClasses.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedClass === cls
                      ? 'bg-sbsz-blue text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Schüler suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sbsz-blue"
              />
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Eingereichte Arbeiten & Bearbeitungsstatus ({filteredSubmissions.length})
              </h3>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700">Noch keine Abgaben für diese Auswahl vorhanden.</p>
                <p className="text-xs text-slate-400">
                  Sobald Schüler über das Portal ihre Bögen bearbeiten, erscheinen ihre Ergebnisse hier in Echtzeit.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 sm:px-4">Schüler & Kürzel</th>
                      <th className="p-3 sm:px-4">Klasse</th>
                      <th className="p-3 sm:px-4">Status</th>
                      <th className="p-3 sm:px-4">Punkte</th>
                      <th className="p-3 sm:px-4">Note</th>
                      <th className="p-3 sm:px-4">KI-Feedback</th>
                      <th className="p-3 sm:px-4 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const score = sub.score;
                      const hasFeedback = sub.feedback && sub.feedback.isSent;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 sm:px-4">
                            <div className="font-bold text-slate-900">{sub.studentName}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-md font-mono text-xs font-bold">
                                <Key className="w-3 h-3 text-amber-700" />
                                <span>Login: {sub.studentCode || '—'}</span>
                              </div>
                              {sub.studentCode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(sub.studentCode || '');
                                    setCopiedCode(sub.studentCode);
                                    setTimeout(() => setCopiedCode(null), 2500);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-sbsz-blue hover:bg-blue-50 px-1.5 py-0.5 rounded transition"
                                  title="Schüler-Kürzel kopieren (um es dem Schüler im Unterricht mitzuteilen)"
                                >
                                  {copiedCode === sub.studentCode ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span className="text-emerald-700 font-bold">Kopiert!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Kopieren</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 sm:px-4">
                            <span className="font-mono bg-sbsz-lightBlue text-sbsz-darkBlue font-bold px-2 py-0.5 rounded text-xs border border-sbsz-borderBlue">
                              {sub.className}
                            </span>
                          </td>
                          <td className="p-3 sm:px-4">
                            {sub.status === 'abgegeben' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Abgegeben
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                                In Bearbeitung
                              </span>
                            )}
                          </td>
                          <td className="p-3 sm:px-4 font-bold font-mono">
                            {score ? `${score.totalPoints} / ${score.maxPoints}` : '—'}
                          </td>
                          <td className="p-3 sm:px-4 font-bold">
                            {score ? (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  score.grade <= 3
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : score.grade === 4
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-sbsz-lightRed text-sbsz-darkRed font-black'
                                }`}
                              >
                                Note {score.grade} ({score.percentage}%)
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 sm:px-4">
                            {hasFeedback ? (
                              <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Versendet
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Ausstehend</span>
                            )}
                          </td>
                          <td className="p-3 sm:px-4 text-right space-x-1.5">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                              title="Bogen ansehen"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab('gemini');
                                handleGenerateFeedback(sub);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sbsz-lightBlue hover:bg-sbsz-blue hover:text-white text-sbsz-darkBlue font-bold text-xs transition-colors"
                              title="KI-Feedback erstellen"
                            >
                              KI-Coach
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRÜFUNGSBÖGEN VERWALTEN & GOOGLE DRIVE SYNCHRONISATION */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Google Drive Synchronisations-Box */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <FolderSync className="w-5 h-5 text-sbsz-blue" />
                  <span>Automatische Google Drive Ordner-Synchronisation</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Liest automatisch neue IHK-Aufgaben- & Lösungshefte aus deinem Google Drive Ordner aus.
                </p>
              </div>

              <button
                onClick={handleSyncGoogleDrive}
                disabled={isSyncingDrive}
                className="bg-sbsz-blue hover:bg-sbsz-darkBlue text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                <span>{isSyncingDrive ? 'Synchronisiere Ordner...' : 'Jetzt Ordner synchronisieren'}</span>
              </button>
            </div>

            {/* Status Feedback */}
            {driveSyncSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{driveSyncSuccess}</span>
              </div>
            )}

            {driveSyncError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{driveSyncError}</span>
              </div>
            )}

            {/* Neu gefundene Prüfungshefte im Google Drive Ordner */}
            {discoveredBundles.length > 0 && (
              <div className="mt-3 bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span>Gefundene Prüfungshefte im Google Drive ({discoveredBundles.length})</span>
                </div>
                <div className="space-y-2">
                  {discoveredBundles.map((bundle) => {
                    const alreadyImported = exams.some((e) => e.id === bundle.id);
                    return (
                      <div
                        key={bundle.id}
                        className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{bundle.title}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            📄 Aufgabenheft: {bundle.taskPdfFile.name}{' '}
                            {bundle.solutionPdfFile ? (
                              <span className="text-emerald-700 font-bold ml-1.5">
                                ✓ Lösungsheft erkannt ({bundle.solutionPdfFile.name})
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold ml-1.5">
                                (Kein separates Lösungsheft erkannt)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {alreadyImported ? (
                            <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold text-xs">
                              Bereits importiert
                            </span>
                          ) : (
                            <button
                              onClick={() => handleImportDiscoveredExam(bundle)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Für Schüler freischalten</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">
              Aktuell hinterlegte IHK-Prüfungshefte ({exams.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="bg-sbsz-lightBlue text-sbsz-darkBlue border border-sbsz-borderBlue text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {exam.examCode}
                    </span>
                    
                    {/* Status & Freigabeschalter */}
                    <button
                      onClick={() => handleToggleExamActive(exam)}
                      className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                        exam.isActive
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                      }`}
                      title={exam.isActive ? 'Klicken zum Sperren' : 'Klicken zum Freigeben'}
                    >
                      {exam.isActive ? (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Aktiv geschaltet (Freigegeben)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-700" />
                          <span>Gesperrt (Für Schüler unsichtbar)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h4 className="font-extrabold text-base text-slate-900 mt-2">{exam.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{exam.subtitle}</p>

                  <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                    <div>
                      <strong>Umfang:</strong> {exam.totalQuestions} Aufgaben ({exam.requiredQuestions} zu werten,{' '}
                      {exam.maxDeselections} abwählbar)
                    </div>
                    <div>
                      <strong>Nicht abwählbar:</strong> Aufgaben{' '}
                      {exam.nonDeselectableQuestions?.join(', ')}
                    </div>
                    <div>
                      <strong>Lösungsschlüssel:</strong> {exam.solutionPdfUrl ? 'Lösungs-PDF hinterlegt' : 'Standard 28 Aufgaben hinterlegt'}
                    </div>
                  </div>
                </div>

                {/* Class Assignment Switches */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Freigabe für Klassen am SBSZ:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Alle', 'ZM22A', 'ZM22B', 'ZM23'].map((cls) => {
                      const isAssigned = exam.assignedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          onClick={() => handleToggleClassAssignment(exam, cls)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isAssigned
                              ? 'bg-sbsz-blue text-white border-sbsz-blue shadow-sm'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cls} {isAssigned ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onSelectExamForPreview(exam)}
                    className="flex-1 bg-sbsz-lightBlue hover:bg-sbsz-blue hover:text-white text-sbsz-darkBlue py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-sbsz-borderBlue"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>In Schüleransicht testen</span>
                  </button>
                  <a
                    href={exam.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                    title="PDF im Browser öffnen"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {exams.length > 1 && (
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                      title="Prüfungsbogen entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KLASSEN-FEHLERANALYSE (HEATMAP) */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-extrabold text-base text-slate-900">
              Klassen-Fehlerquote pro Prüfungsaufgabe (Aufgaben 1 bis 28)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifiziert automatisch die thematischen Schwachstellen des Jahrgangs für gezielten Förderunterricht am SBSZ.
            </p>

            {questionAnalytics.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Noch keine Schülerabgaben zur Berechnung der Fehlerquoten vorhanden.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {questionAnalytics.slice(0, 10).map((item) => (
                  <div key={item.questionNum} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <span className="w-6 h-6 rounded-md bg-sbsz-darkBlue text-white flex items-center justify-center text-[11px]">
                          {item.questionNum}
                        </span>
                        <span>{item.topic}</span>
                      </div>
                      <span className="font-extrabold font-mono text-sbsz-red">
                        {item.errorRate}% Fehler
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${item.errorRate}%` }}
                        className="bg-sbsz-red h-full transition-all"
                        title={`Fehler: ${item.errorRate}%`}
                      />
                      <div
                        style={{ width: `${item.correctRate}%` }}
                        className="bg-emerald-500 h-full transition-all"
                        title={`Richtig: ${item.correctRate}%`}
                      />
                      <div
                        style={{ width: `${item.deselectedRate}%` }}
                        className="bg-amber-400 h-full transition-all"
                        title={`Abgewählt: ${item.deselectedRate}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KI-FEEDBACK (GEMINI) */}
      {activeTab === 'gemini' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sbsz-blue text-white flex items-center justify-center shadow">
                <Sparkles className="w-5 h-5 text-sbsz-cyan" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  SBSZ Didaktik-Coach (Google Gemini)
                </h3>
                <p className="text-xs text-slate-500">
                  Erstellt personalisierte Stärken-, Schwächen- und Tabellenbuch-Empfehlungen
                </p>
              </div>
            </div>

            {selectedSubmission && (
              <span className="bg-sbsz-lightBlue text-sbsz-darkBlue border border-sbsz-borderBlue text-xs font-bold px-3 py-1 rounded-xl">
                Ausgewählt: {selectedSubmission.studentName} ({selectedSubmission.className})
              </span>
            )}
          </div>

          {!selectedSubmission ? (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                Wähle einen Schüler aus, um ein individuelles Feedback zu generieren:
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {submissions.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleGenerateFeedback(sub)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-sbsz-lightBlue text-slate-800 border border-slate-300 shadow-sm transition-all"
                  >
                    {sub.studentName} ({sub.className})
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {aiError && (
                <div className="bg-sbsz-lightRed border border-red-200 text-sbsz-darkRed text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-sbsz-red" />
                  <span>{aiError}</span>
                </div>
              )}

              {feedbackSentSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Feedback erfolgreich freigegeben! Der Schüler sieht es sofort in seinem Portal.
                  </span>
                </div>
              )}

              {isGeneratingAi ? (
                <div className="p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                  <Sparkles className="w-8 h-8 text-sbsz-blue mx-auto animate-pulse" />
                  <p className="text-sm font-bold text-slate-800">
                    Gemini analysiert die Fehler des Schülers...
                  </p>
                  <p className="text-xs text-slate-500">
                    Kaskadenabfrage an gemini-flash-lite-latest läuft.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold uppercase tracking-wider text-slate-700">
                      Entwurf für {selectedSubmission.studentName}:
                    </span>
                    <span>Sie können den Text vor dem Versenden frei anpassen</span>
                  </div>

                  <textarea
                    rows={12}
                    value={aiFeedbackDraft}
                    onChange={(e) => setAiFeedbackDraft(e.target.value)}
                    placeholder="Das generierte Feedback erscheint hier..."
                    className="w-full p-4 rounded-xl border border-slate-300 font-sans text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-sbsz-blue bg-slate-50"
                  />

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => handleGenerateFeedback(selectedSubmission)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Neu generieren</span>
                    </button>

                    <button
                      onClick={handleSendFeedback}
                      disabled={!aiFeedbackDraft.trim()}
                      className="px-5 py-2.5 rounded-xl bg-sbsz-red hover:bg-sbsz-darkRed text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>An Schüler freigeben & senden</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CLOUD-SPEICHER & SETUP-ASSISTENT */}
      {activeTab === 'cloud' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-sbsz-darkBlue via-sbsz-blue to-sbsz-blue text-white p-5 sm:p-6 rounded-2xl shadow-md space-y-2">
            <div className="flex items-center gap-2 text-sbsz-cyan text-xs font-bold uppercase tracking-wider">
              <Cloud className="w-4 h-4" />
              <span>SBSZ Jena-Göschwitz Cloud-Speicher Leitfaden</span>
            </div>
            <h3 className="text-lg font-black tracking-tight">
              Anleitung: 100% kostenloser Cloud-Speicher für IHK-PDFs & Prüfungsergebnisse
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-4xl">
              Im <strong>Firebase Spark Plan</strong> ist die Speicherung dauerhaft 100% kostenlos und erfordert{' '}
              <strong>keine Kreditkarte</strong> (5 GB Storage, 50.000 Firestore-Lesevorgänge pro Tag).
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
            <h4 className="font-extrabold text-slate-900 text-base">
              Firebase & Google Gemini Konfiguration
            </h4>

            {configSavedNotice && (
              <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Gespeichert & Aktiviert!
              </span>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project ID</label>
                <input
                  type="text"
                  placeholder="z. B. sbsz-ihk-pruefungen"
                  value={fbConfig.projectId}
                  onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={fbConfig.apiKey}
                  onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  placeholder="sbsz-ihk-pruefungen.appspot.com"
                  value={fbConfig.storageBucket}
                  onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gemini API Key (Lehrkraft BYOK)</label>
                <input
                  type="password"
                  placeholder="Eigener Key oder Schul-Standardschlüssel"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Google Drive Ordner-ID (Auto-Sync)</label>
                <input
                  type="text"
                  placeholder="z. B. 1AbCdEfGhIjKlMnOpQrStUvWxYz..."
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Google Cloud / Drive API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy... (oder leer lassen, nutzt Firebase Key)"
                  value={driveApiKey}
                  onChange={(e) => setDriveApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              className="bg-sbsz-blue hover:bg-sbsz-darkBlue text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow transition-all flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span>Konfiguration speichern & Cloud verbinden</span>
            </button>
          </div>
        </div>
      )}

      {/* Detail Submission Modal */}
      {selectedSubmission && activeTab === 'students' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sbsz-navy/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="bg-sbsz-darkBlue text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-base">
                  Prüfungsbogen: {selectedSubmission.studentName}
                </h3>
                <p className="text-xs text-blue-200">
                  Klasse {selectedSubmission.className} •{' '}
                  {selectedSubmission.score
                    ? `${selectedSubmission.score.percentage}% (Note ${selectedSubmission.score.grade})`
                    : 'In Bearbeitung'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {selectedSubmission.score ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((qNum) => {
                    const evalData = selectedSubmission.score?.questionEvaluations[qNum];
                    return (
                      <div
                        key={qNum}
                        className={`p-2 rounded-xl border flex items-center justify-between ${
                          evalData?.isDeselected
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : evalData?.isCorrect
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-sbsz-lightRed border-red-200 text-sbsz-darkRed font-black'
                        }`}
                      >
                        <span className="font-bold">Aufg. {qNum}</span>
                        <span className="font-mono font-black">
                          {evalData?.isDeselected
                            ? '[A]'
                            : evalData?.studentAnswer !== null
                            ? evalData?.studentAnswer
                            : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500">Dieser Schüler hat den Bogen noch nicht abgeschlossen.</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
