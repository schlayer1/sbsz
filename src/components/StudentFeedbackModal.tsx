import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Award,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  GraduationCap,
  FileText,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { ExamDefinition, ExamSubmission, StudentProfile } from '../types/exam';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StudentFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentProfile;
  submissions: ExamSubmission[];
  exams: ExamDefinition[];
  onSelectSubmissionExam: (examId: string) => void;
}

export const StudentFeedbackModal: React.FC<StudentFeedbackModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  submissions,
  exams,
  onSelectSubmissionExam,
}) => {
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter only submitted exams or with score/feedback
  const submittedList = submissions.filter(
    (s) => s.status === 'abgegeben' || (s.score && s.score.percentage !== undefined)
  );

  const feedbacksList = submittedList.filter((s) => Boolean(s.feedback && s.feedback.isSent));

  const averagePercentage =
    submittedList.length > 0
      ? Math.round(
          submittedList.reduce((acc, s) => acc + (s.score?.percentage || 0), 0) /
            submittedList.length
        )
      : 0;

  const toggleExpand = (subId: string) => {
    setExpandedSubmissionId((prev) => (prev === subId ? null : subId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header with SBSZ Blue */}
        <div className="bg-gradient-to-r from-sbsz-darkBlue via-sbsz-blue to-sbsz-blue text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-sbsz-navy">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-sbsz-cyan flex items-center justify-center border border-white/20 shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Meine Feedbacks & Auswertungen
                </h3>
                <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded-md">
                  {currentStudent.studentCode || currentStudent.id}
                </span>
              </div>
              <p className="text-xs text-blue-100">
                Prüfling: {currentStudent.firstName} {currentStudent.lastName} ({currentStudent.className})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI strip */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-slate-500 font-medium">Abgegebene Prüfungen</div>
            <div className="text-lg font-black text-slate-900 mt-0.5">{submittedList.length}</div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-slate-500 font-medium">Erhaltene Feedbacks</div>
            <div className="text-lg font-black text-emerald-600 mt-0.5">
              {feedbacksList.length}{' '}
              <span className="text-xs font-normal text-slate-400">/ {submittedList.length}</span>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-slate-500 font-medium">Notendurchschnitt</div>
            <div className="text-lg font-black text-sbsz-blue mt-0.5">
              {submittedList.length > 0 ? `${averagePercentage}%` : '—'}
            </div>
          </div>
        </div>

        {/* Scrollable List of Submissions & Feedbacks */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {submittedList.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">Noch keine Prüfungen abgegeben</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Sobald du einen Prüfungsbogen ausfüllst und abgibst, werden hier deine IHK-Noten und die
                persönlichen Rückmeldungen deiner Lehrkraft übersichtlich archiviert.
              </p>
            </div>
          ) : (
            submittedList.map((sub) => {
              const examDef = exams.find((e) => e.id === sub.examId);
              const score = sub.score;
              const feedback = sub.feedback;
              const hasFeedback = Boolean(feedback && feedback.isSent);
              const isExpanded = expandedSubmissionId === sub.id;

              return (
                <div
                  key={sub.id}
                  className={`rounded-2xl border transition-all ${
                    hasFeedback
                      ? 'border-sbsz-borderBlue bg-white shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Card Header Row */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          hasFeedback
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {hasFeedback ? <Sparkles className="w-5 h-5 text-emerald-700" /> : <FileText className="w-5 h-5 text-slate-500" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                            {examDef?.title || sub.examId}
                          </h4>
                          {examDef?.examCode && (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                              {examDef.examCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>
                            Abgegeben am{' '}
                            {new Date(sub.submittedAt || sub.updatedAt).toLocaleDateString('de-DE')}{' '}
                            um{' '}
                            {new Date(sub.submittedAt || sub.updatedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {score && (
                            <span className="font-bold text-slate-800 font-mono">
                              {score.totalPoints} / {score.maxPoints} Pkt. ({score.percentage} %) • Note{' '}
                              {score.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      {hasFeedback ? (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Feedback erhalten</span>
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>In Auswertung beim Fachlehrer</span>
                        </span>
                      )}

                      {/* Expand / View Details Button */}
                      {hasFeedback ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(sub.id)}
                          className="px-3 py-1.5 rounded-xl bg-sbsz-lightBlue hover:bg-sbsz-blue hover:text-white text-sbsz-darkBlue font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Zuklappen' : 'Feedback lesen'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          onSelectSubmissionExam(sub.examId);
                          onClose();
                        }}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-sbsz-blue hover:bg-slate-100 transition-colors"
                        title="Diesen Bogen & detaillierte Fragen-Auswertung ansehen"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Feedback Section */}
                  {isExpanded && feedback && (
                    <div className="border-t border-sbsz-borderBlue bg-gradient-to-br from-sbsz-lightBlue/30 to-white p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 pb-2">
                        <span className="font-bold text-sbsz-darkBlue flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-sbsz-blue" />
                          <span>Rückmeldung von: {feedback.teacherName || 'Fachlehrer Metalltechnik'}</span>
                        </span>
                        {feedback.sentAt && (
                          <span>
                            Gesendet am {new Date(feedback.sentAt).toLocaleDateString('de-DE')} um{' '}
                            {new Date(feedback.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr
                          </span>
                        )}
                      </div>

                      {/* Feedback Body formatted cleanly */}
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
                        <MarkdownRenderer content={feedback.text} />
                      </div>

                      {/* Learning Tips / Tabellenbuch Recommendations */}
                      {feedback.learningTips && feedback.learningTips.length > 0 && (
                        <div className="bg-white p-3.5 rounded-xl border border-sbsz-borderBlue space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-sbsz-darkBlue flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-sbsz-blue" />
                            <span>Empfohlene Anlaufstellen zum Nachschlagen</span>
                          </div>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                            {feedback.learningTips.map((tip, idx) => (
                              <li key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-start gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-sbsz-blue shrink-0 mt-0.5" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSubmissionExam(sub.examId);
                            onClose();
                          }}
                          className="px-4 py-2 bg-sbsz-blue hover:bg-sbsz-darkBlue text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Vollständige Fragenanalyse (1 bis 28) öffnen</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Staatliches Berufsschulzentrum Jena-Göschwitz</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
