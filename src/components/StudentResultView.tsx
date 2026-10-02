import React, { useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  BookOpen,
  FileText,
  Printer,
  Compass,
  GraduationCap,
} from 'lucide-react';
import { ExamDefinition, ExamSubmission } from '../types/exam';
import { MarkdownRenderer } from './MarkdownRenderer';

import { calculateIhkScore } from '../utils/ihkGrader';

interface StudentResultViewProps {
  exam: ExamDefinition;
  submission: ExamSubmission;
  onRetakeExam: () => void;
  onJumpToPdfPage: (page: number) => void;
  studentSubmissions?: ExamSubmission[];
  exams?: ExamDefinition[];
  onSelectSubmissionExam?: (examId: string) => void;
  onOpenFeedbackOverview?: () => void;
  onStartDrillMode?: (wrongQuestions: number[]) => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({
  exam,
  submission,
  onRetakeExam,
  onJumpToPdfPage,
  studentSubmissions = [],
  exams = [],
  onSelectSubmissionExam,
  onOpenFeedbackOverview,
  onStartDrillMode,
}) => {
  // Falls die Einreichung noch kein vollständiges score-Objekt hat, dynamisch und stabil berechnen
  const score = useMemo(() => {
    if (
      submission.score &&
      submission.score.questionEvaluations &&
      Object.keys(submission.score.questionEvaluations).length > 0
    ) {
      return submission.score;
    }
    return calculateIhkScore(exam, submission.answers || {}, submission.deselected || []);
  }, [submission.score, submission.answers, submission.deselected, exam]);

  // Liste aller fehlerhaften Aufgaben für den gezielten Drill-Modus
  const wrongQuestions = useMemo(() => {
    if (!score || !score.questionEvaluations) return [];
    return Object.entries(score.questionEvaluations)
      .filter(([_, evalData]) => !evalData.isCorrect && !evalData.isDeselected)
      .map(([qNum]) => Number(qNum))
      .sort((a, b) => a - b);
  }, [score]);

  // Confetti exakt einmal pro Einreichungs-ID auslösen, um Re-render Loop / UI Freezes zu verhindern
  const confettiTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (score && score.percentage >= 67 && confettiTriggeredRef.current !== submission.id) {
      confettiTriggeredRef.current = submission.id;
      // Safari / iOS Canvas Crash Prevention
      try {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => {
            try {
              confetti({
                particleCount: 60,
                spread: 60,
                origin: { y: 0.6 },
                disableForReducedMotion: true,
              });
            } catch (canvasErr) {
              console.warn('[Confetti] Nicht verfügbar oder deaktiviert:', canvasErr);
            }
          });
        }
      } catch (err) {
        console.warn('[Confetti] Ausführung übersprungen:', err);
      }
    }
  }, [score, submission.id]);

  const isPassed = score.percentage >= 50;
  const feedback = submission.feedback;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-[2100px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-5 sm:py-6 space-y-6">
      {/* Top Banner & Title with SBSZ Jena Branding */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
            <img src="/sbsz-logo.png" alt="SBSZ Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-sbsz-lightBlue text-sbsz-darkBlue text-xs font-bold px-2.5 py-0.5 rounded-full border border-sbsz-borderBlue">
                SBSZ Jena-Göschwitz • IHK Prüfungsabgabe
              </span>
              <span className="text-xs text-slate-500">
                Eingereicht am {new Date(submission.submittedAt || Date.now()).toLocaleDateString('de-DE')} um{' '}
                {new Date(submission.submittedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Ergebnis: {exam.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Prüfling: <strong className="text-slate-800">{submission.studentName}</strong> (Klasse {submission.className})
            </p>
          </div>
        </div>

        {/* Print / Actions */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Ergebnis drucken</span>
          </button>
          {wrongQuestions.length > 0 && onStartDrillMode && (
            <button
              onClick={() => onStartDrillMode(wrongQuestions)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-all shadow-md animate-pulse cursor-pointer"
              title="Gezielt nur die falschen Aufgaben mit Sofort-Feedback wiederholen"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>Fehler gezielt trainieren ({wrongQuestions.length})</span>
            </button>
          )}
          <button
            onClick={onRetakeExam}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-sbsz-blue hover:bg-sbsz-darkBlue text-white transition-colors shadow"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Bogen weiter bearbeiten</span>
          </button>
        </div>
      </div>

      {/* Multi-Submission & Feedback Switcher Bar */}
      {studentSubmissions.length > 1 && (
        <div className="bg-white p-3.5 sm:px-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Ihre abgegebenen Prüfungsbögen:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {studentSubmissions.map((s) => {
                const ex = exams.find((e) => e.id === s.examId);
                const isCurrent = s.examId === exam.id;
                const hasFb = Boolean(s.feedback && s.feedback.isSent);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectSubmissionExam?.(s.examId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-sbsz-blue text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{ex?.examCode || ex?.title || s.examId}</span>
                    <span className="font-mono opacity-90">({s.score?.percentage || 0}%)</span>
                    {hasFb && (
                      <span className="w-2 h-2 rounded-full bg-amber-400" title="Feedback vorhanden" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          {onOpenFeedbackOverview && (
            <button
              type="button"
              onClick={onOpenFeedbackOverview}
              className="text-xs text-sbsz-blue hover:text-sbsz-darkBlue font-bold flex items-center gap-1 underline cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Alle Feedbacks in Übersicht öffnen</span>
            </button>
          )}
        </div>
      )}

      {/* KPI Cards Hero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score & Grade */}
        <div className={`p-5 rounded-2xl border shadow-sm ${
          isPassed ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-600' : 'bg-gradient-to-br from-sbsz-red to-red-800 text-white border-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider opacity-90">IHK-Gesamtergebnis</span>
            <Award className="w-6 h-6 opacity-90" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black">{score.percentage}%</span>
            <span className="text-sm opacity-90">({score.totalPoints} / {score.maxPoints} Punkte)</span>
          </div>
          <div className="mt-2 text-xs font-semibold bg-white/25 border border-white/20 px-2.5 py-1 rounded-lg inline-block">
            Note {score.grade} ({score.gradeText}) • {isPassed ? 'Bestanden' : 'Nicht bestanden'}
          </div>
        </div>

        {/* Correct Answers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Richtig gelöst</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{score.correctCount}</div>
          <p className="text-xs text-slate-500 mt-1">Gewertete richtige Antworten</p>
        </div>

        {/* Errors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-sbsz-red">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fehlerhaft</span>
            <XCircle className="w-5 h-5" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{score.errorCount}</div>
          <p className="text-xs text-slate-500 mt-1">Aufgaben mit Abweichungen</p>
        </div>

        {/* Deselected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Abgewählt [A]</span>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{score.deselectedCount}</div>
          <p className="text-xs text-slate-500 mt-1">IHK-Abwahlregel angewendet</p>
        </div>
      </div>

      {/* Teacher / Gemini AI Feedback Section */}
      {feedback && feedback.isSent ? (
        <div id="teacher-feedback-section" className="scroll-mt-20 bg-gradient-to-br from-sbsz-lightBlue via-white to-white rounded-2xl border-2 border-sbsz-borderBlue p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sbsz-blue text-white flex items-center justify-center shadow">
                <Sparkles className="w-5 h-5 text-sbsz-cyan" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  Individuelles Lern-Feedback von Ihrem Fachlehrer
                </h3>
                {feedback.sentAt && (
                  <p className="text-xs text-slate-500">
                    Freigegeben am {new Date(feedback.sentAt).toLocaleDateString('de-DE')} um{' '}
                    {new Date(feedback.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
                  </p>
                )}
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full hidden sm:inline-block">
              Lehrerfreigabe erteilt ✓
            </span>
          </div>

          <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-sm">
            <MarkdownRenderer content={feedback.text} />
          </div>

          {/* Quick learning references */}
          {feedback.learningTips && feedback.learningTips.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-sbsz-borderBlue">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sbsz-darkBlue flex items-center gap-1.5 mb-2">
                <BookOpen className="w-4 h-4 text-sbsz-blue" />
                <span>Empfohlene Anlaufstellen zum Nachschlagen</span>
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {feedback.learningTips.map((tip, idx) => (
                  <li key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                    <Compass className="w-3.5 h-3.5 text-sbsz-blue shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sbsz-lightBlue text-sbsz-blue flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800">Lehrer-Feedback in Vorbereitung</h4>
              <p className="text-xs text-slate-500">
                Ihr Fachlehrer am SBSZ wertet Ihre Arbeit aktuell aus. Sobald das individuelle KI-Feedback freigegeben ist, können Sie es hier einsehen.
              </p>
            </div>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-medium shrink-0">
            Status: Zur Durchsicht beim Fachlehrer
          </span>
        </div>
      )}

      {/* Drill-Training Banner */}
      {wrongQuestions.length > 0 && onStartDrillMode && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm sm:text-base text-amber-950">
                  Gezielter Fehler-Wiederholungsmodus
                </h4>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Empfohlen
                </span>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5">
                Du hast <strong>{wrongQuestions.length} Aufgaben</strong> noch nicht richtig gelöst. Trainiere jetzt gezielt nur diese Aufgaben mit sofortiger Lösungsrückmeldung!
              </p>
            </div>
          </div>
          <button
            onClick={() => onStartDrillMode(wrongQuestions)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Fehler jetzt trainieren ({wrongQuestions.length} Aufgaben)</span>
          </button>
        </div>
      )}

      {/* Detailed Question Review Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Detaillierte Fehlerauswertung (Aufgaben 1 bis {exam.totalQuestions})
            </h3>
            <p className="text-xs text-slate-500">
              Vergleich Ihrer Antworten mit den offiziellen IHK-Lösungsschlüsseln
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Richtig
            </span>
            <span className="flex items-center gap-1 text-sbsz-red">
              <span className="w-2.5 h-2.5 rounded-full bg-sbsz-red" /> Falsch
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Abgewählt
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {Array.from({ length: exam.totalQuestions }, (_, i) => i + 1).map((qNum) => {
            const evalData = score?.questionEvaluations?.[qNum];
            const qDef = exam.questions.find((q) => q.number === qNum);
            const pageNum = qDef?.pageNumber || 3;
            const isCorrect = Boolean(evalData?.isCorrect);
            const isDeselected = Boolean(evalData?.isDeselected);
            const studentAnswer = evalData?.studentAnswer ?? submission.answers?.[qNum] ?? null;
            const correctAnswer = evalData?.correctAnswer ?? exam.solutions?.[qNum] ?? '—';

            return (
              <div
                key={qNum}
                className={`p-3.5 sm:px-5 flex items-center justify-between gap-3 transition-colors ${
                  isDeselected
                    ? 'bg-amber-50/40 text-slate-600'
                    : isCorrect
                    ? 'hover:bg-emerald-50/30'
                    : 'bg-sbsz-lightRed/40 hover:bg-sbsz-lightRed/70'
                }`}
              >
                {/* Question Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isDeselected
                        ? 'bg-amber-100 text-amber-800'
                        : isCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-sbsz-lightRed text-sbsz-darkRed font-black'
                    }`}
                  >
                    {qNum}
                  </div>
                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                      {qDef?.topic || `Aufgabe ${qNum}`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Im Aufgabenheft auf Seite {pageNum}
                    </div>
                  </div>
                </div>

                {/* Answer comparison */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Ihre Wahl</div>
                    <div className="text-xs sm:text-sm font-extrabold font-mono">
                      {isDeselected ? (
                        <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Abgewählt [A]</span>
                      ) : studentAnswer !== null && studentAnswer !== undefined ? (
                        <span className={isCorrect ? 'text-emerald-700' : 'text-sbsz-red'}>
                          Option {studentAnswer}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Keine Angabe</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">IHK Lösung</div>
                    <div className="text-xs sm:text-sm font-extrabold font-mono text-sbsz-darkBlue bg-sbsz-lightBlue px-2 py-0.5 rounded border border-sbsz-borderBlue">
                      Option {correctAnswer}
                    </div>
                  </div>

                  {/* Jump to page in PDF */}
                  <button
                    onClick={() => onJumpToPdfPage(pageNum)}
                    className="p-2 text-slate-400 hover:text-sbsz-blue hover:bg-slate-100 rounded-xl transition-colors"
                    title={`Aufgabe ${qNum} im PDF (Seite ${pageNum}) ansehen`}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
