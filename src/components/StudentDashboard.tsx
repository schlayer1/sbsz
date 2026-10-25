import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
import { ExamDefinition, StudentProfile, ExamSubmission } from '../types/exam';

interface StudentDashboardProps {
  currentStudent: StudentProfile;
  exams: ExamDefinition[];
  submissions: ExamSubmission[];
  onSelectExam: (exam: ExamDefinition) => void;
  onViewResult: (exam: ExamDefinition, submission: ExamSubmission) => void;
  onOpenFeedback: (submission: ExamSubmission) => void;
  onOpenStudentLogin?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentStudent,
  exams,
  submissions,
  onSelectExam,
  onViewResult,
  onOpenFeedback,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'completed'>('all');

  // Nur aktive Prüfungen filtern, die der Klasse des Schülers zugeordnet sind
  const availableExams = useMemo(() => {
    return exams.filter((ex) => {
      if (!ex.isActive) return false;
      if (!currentStudent) return true;
      return (
        ex.assignedClasses.includes('Alle') ||
        ex.assignedClasses.includes(currentStudent.className)
      );
    });
  }, [exams, currentStudent]);

  // Zuordnung von Prüfungs-ID zu Submission des Schülers
  const submissionsByExamId = useMemo(() => {
    const map = new Map<string, ExamSubmission>();
    submissions.forEach((sub) => {
      map.set(sub.examId, sub);
    });
    return map;
  }, [submissions]);

  // Statistik-Zähler
  const stats = useMemo(() => {
    let completedCount = 0;
    let inProgressCount = 0;
    let feedbackCount = 0;

    availableExams.forEach((exam) => {
      const sub = submissionsByExamId.get(exam.id);
      if (sub) {
        if (sub.status === 'abgegeben') completedCount++;
        else if (sub.status === 'in_bearbeitung') inProgressCount++;
        if (sub.feedback?.isSent) feedbackCount++;
      }
    });

    return {
      total: availableExams.length,
      open: availableExams.length - (completedCount + inProgressCount),
      inProgress: inProgressCount,
      completed: completedCount,
      feedback: feedbackCount,
    };
  }, [availableExams, submissionsByExamId]);

  // Gefilterte Prüfungen für das Kachel-Grid
  const filteredExams = useMemo(() => {
    return availableExams.filter((exam) => {
      const sub = submissionsByExamId.get(exam.id);
      const isCompleted = sub?.status === 'abgegeben';
      const isInProgress = sub?.status === 'in_bearbeitung';
      const isOpen = !sub;

      // Status Filter
      if (statusFilter === 'open' && !isOpen) return false;
      if (statusFilter === 'in_progress' && !isInProgress) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;

      // Such-Filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = exam.title.toLowerCase().includes(query);
        const matchesCode = (exam.examCode || '').toLowerCase().includes(query);
        const matchesSeason = (exam.season || '').toLowerCase().includes(query);
        const matchesSubject = (exam.subject || '').toLowerCase().includes(query);
        return matchesTitle || matchesCode || matchesSeason || matchesSubject;
      }

      return true;
    });
  }, [availableExams, submissionsByExamId, statusFilter, searchQuery]);

  return (
    <div className="w-full max-w-[2100px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 sm:py-6 space-y-5 sm:space-y-6 animate-fade-in">
      {/* 1. Begrüßungs- & Profil-Banner (Bento Hero) */}
      <div className="bg-gradient-to-r from-sbsz-darkBlue via-sbsz-blue to-sbsz-blue text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-sbsz-navy/40 relative overflow-hidden">
        {/* Dekorative Hintergrund-Glüheffekte */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-sbsz-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-sbsz-lime/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/15 backdrop-blur-xs text-white text-xs font-extrabold px-3 py-1 rounded-full border border-white/20">
                IHK Prüfungscenter
              </span>
              <span className="bg-sbsz-cyan text-sbsz-darkBlue text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                Klasse {currentStudent.className}
              </span>
              <span className="bg-sbsz-darkBlue/80 text-white font-mono text-xs font-bold px-3 py-1 rounded-full border border-sbsz-cyan/40">
                Kürzel: <strong className="text-sbsz-cyan">{currentStudent.studentCode}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
              Willkommen, {currentStudent.firstName} {currentStudent.lastName}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Wähle unten deine gewünschte IHK-Abschlussprüfung aus. Deine Eingaben werden bei jeder Antwort
              automatisch gespeichert, sodass du jederzeit pausieren und später fortsetzen kannst.
            </p>
          </div>

          {/* KPI Schnellübersicht */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/15 text-center">
              <div className="text-2xl font-black text-white">{stats.total}</div>
              <div className="text-[11px] text-blue-100 font-semibold mt-0.5">Freigeschaltet</div>
            </div>

            <div className="bg-amber-500/20 backdrop-blur-xs rounded-2xl p-3 border border-amber-300/30 text-center">
              <div className="text-2xl font-black text-amber-300">{stats.inProgress}</div>
              <div className="text-[11px] text-amber-100 font-semibold mt-0.5">In Bearbeitung</div>
            </div>

            <div className="bg-emerald-500/20 backdrop-blur-xs rounded-2xl p-3 border border-emerald-300/30 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-emerald-300">{stats.completed}</div>
              <div className="text-[11px] text-emerald-100 font-semibold mt-0.5">Abgegeben</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter- & Suchleiste */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none touch-pan-x">
          {[
            { id: 'all', label: `Alle (${stats.total})` },
            { id: 'open', label: `Noch offen (${stats.open})` },
            { id: 'in_progress', label: `In Bearbeitung (${stats.inProgress})` },
            { id: 'completed', label: `Abgegeben (${stats.completed})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-sbsz-blue text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Suchfeld */}
        <div className="relative w-full md:w-72 lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Prüfung oder Jahr suchen (z. B. Winter)..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sbsz-blue text-slate-800 transition-colors"
          />
        </div>
      </div>

      {/* 3. Prüfungs-Kacheln (Bento- & Card-Grid nach responsive-school-apps Standard) */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-800">
              {availableExams.length === 0
                ? 'Aktuell keine Prüfungshefte freigeschaltet'
                : 'Keine Prüfungen für diesen Filter gefunden'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {availableExams.length === 0
                ? 'Deine Lehrkraft hat derzeit noch keine Prüfungsbögen freigegeben. Sobald ein Bogen aktiviert wird, erscheint er hier automatisch.'
                : 'Passe deinen Suchbegriff oder den Statusfilter an, um deine Prüfungshefte zu sehen.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
          {filteredExams.map((exam) => {
            const sub = submissionsByExamId.get(exam.id);
            const isCompleted = sub?.status === 'abgegeben';
            const isInProgress = sub?.status === 'in_bearbeitung';
            const hasFeedback = Boolean(sub?.feedback?.isSent);

            // Beantwortete Fragen
            const answeredCount = sub?.answers ? Object.keys(sub.answers).length : 0;
            const requiredCount = exam.requiredQuestions || 25;

            // Semester-Themenfarben (Winter = Eisblau, Sommer = Bernstein)
            const isWinter =
              (exam.season || '').toLowerCase().includes('winter') ||
              (exam.examCode || '').toLowerCase().startsWith('w');

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-sbsz-blue/50 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Kachel-Kopfbereich */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-black px-2.5 py-1 rounded-lg border font-mono tracking-tight ${
                        isWinter
                          ? 'bg-blue-50 text-blue-900 border-blue-200'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      {exam.examCode ? `[${exam.examCode}]` : 'IHK PRÜFUNG'}
                    </span>

                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        Abgegeben
                      </span>
                    ) : isInProgress ? (
                      <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        In Arbeit
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        Neu
                      </span>
                    )}
                  </div>

                  {/* Titel & Fach */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-sbsz-blue transition-colors line-clamp-2">
                      {exam.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-1">
                      {exam.profession || 'Zerspanungsmechaniker/-in'} • {exam.subject || 'IHK Abschlussprüfung'}
                    </p>
                  </div>

                  {/* Metadaten */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {exam.totalQuestions || 28} Aufgaben
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      ca. 90 Min.
                    </span>
                  </div>

                  {/* Spezifische Schüler-Ergebnis- oder Fortschrittsanzeige */}
                  {isCompleted && sub?.score ? (
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-900">Dein Ergebnis:</span>
                        <strong className="text-emerald-800 font-extrabold text-sm">
                          {sub.score.percentage}% ({sub.score.totalPoints}/{sub.score.maxPoints} Pkt.)
                        </strong>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">
                        IHK-Bewertung: <strong>Note {sub.score.grade}</strong> ({sub.score.gradeText})
                      </div>
                    </div>
                  ) : isInProgress ? (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-900 font-semibold">Fortschritt:</span>
                        <span className="text-amber-800 font-bold">
                          {answeredCount} von {requiredCount} beantwortet
                        </span>
                      </div>
                      <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (answeredCount / requiredCount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Didaktischer Feedback-Hinweis der Lehrkraft */}
                  {hasFeedback && (
                    <button
                      onClick={() => sub && onOpenFeedback(sub)}
                      className="w-full text-left bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-300 rounded-xl p-2 text-xs text-blue-900 font-bold flex items-center justify-between gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Lehrer-Feedback lesen</span>
                      </span>
                      <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
                    </button>
                  )}
                </div>

                {/* Kachel-Aktions-Footer (Touch-Target >= 44px) */}
                <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {isCompleted ? (
                    <>
                      <button
                        onClick={() => sub && onViewResult(exam, sub)}
                        className="flex-1 min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Award className="w-4 h-4 shrink-0" />
                        <span>Ergebnis ansehen</span>
                      </button>

                      <button
                        onClick={() => onSelectExam(exam)}
                        className="p-2 min-h-[42px] min-w-[42px] bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                        title="Bogen erneut aufrufen / üben"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  ) : isInProgress ? (
                    <button
                      onClick={() => onSelectExam(exam)}
                      className="w-full min-h-[42px] bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Prüfung fortsetzen</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectExam(exam)}
                      className="w-full min-h-[42px] bg-sbsz-blue hover:bg-sbsz-darkBlue text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Prüfung starten</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
