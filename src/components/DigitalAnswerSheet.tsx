import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Send,
  Lock,
  Layers,
  FileText,
  Info,
  Clock,
} from 'lucide-react';
import { ExamDefinition } from '../types/exam';

interface DigitalAnswerSheetProps {
  exam: ExamDefinition;
  answers: Record<number, number>;
  deselected: number[];
  onSelectAnswer: (questionNum: number, option: number) => void;
  onToggleDeselect: (questionNum: number) => void;
  onSubmitExam: () => void;
  onJumpToPage: (page: number) => void;
  lastSavedAt: number | null;
  isSaving: boolean;
  activeQuestion?: number;
}

export const DigitalAnswerSheet: React.FC<DigitalAnswerSheetProps> = ({
  exam,
  answers,
  deselected,
  onSelectAnswer,
  onToggleDeselect,
  onSubmitExam,
  onJumpToPage,
  lastSavedAt,
  isSaving,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const nonDeselectableSet = new Set(exam.nonDeselectableQuestions || [6, 7, 8, 9, 12, 16, 20, 28]);
  const deselectedCount = deselected.length;

  // Count answered questions that are NOT deselected
  const answeredCount = Object.keys(answers).filter((qStr) => {
    const qNum = Number(qStr);
    return answers[qNum] !== undefined && !deselected.includes(qNum);
  }).length;

  const isDeselectTargetReached = deselectedCount === exam.maxDeselections;

  const handleOpenConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    onSubmitExam();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col h-full border border-slate-200 overflow-hidden">
      {/* Header with SBSZ Jena-Göschwitz Blue */}
      <div className="bg-gradient-to-r from-sbsz-darkBlue to-sbsz-blue text-white p-3.5 sm:p-4 shrink-0 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                SBSZ Jena • IHK Markierungsbogen
              </span>
              <span className="text-xs text-sbsz-cyan font-semibold">Teil A (28 Aufgaben)</span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight mt-0.5">
              Digitaler Antwortbogen
            </h2>
          </div>

          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-sbsz-navy/50 px-2.5 py-1 rounded-xl border border-white/10">
            <Clock className="w-3.5 h-3.5 text-sbsz-cyan" />
            <span>
              {isSaving
                ? 'Wird gespeichert...'
                : lastSavedAt
                ? `Gespeichert ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Bereit'}
            </span>
          </div>
        </div>

        {/* Counter KPI strip */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/15">
          <div className="bg-white/10 rounded-xl p-2 sm:px-3 text-center sm:text-left flex items-center justify-between">
            <div>
              <div className="text-[11px] text-blue-200 font-medium">Bearbeitet</div>
              <div className="text-base sm:text-lg font-black tracking-tight">
                {answeredCount} <span className="text-xs font-normal text-blue-200">/ 25</span>
              </div>
            </div>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                answeredCount === 25 ? 'bg-sbsz-lime text-slate-950 font-black' : 'bg-white/20 text-white'
              }`}
            >
              {answeredCount === 25 ? '✓' : `${25 - answeredCount}`}
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-2 sm:px-3 text-center sm:text-left flex items-center justify-between">
            <div>
              <div className="text-[11px] text-blue-200 font-medium">Abgewählt [A]</div>
              <div className="text-base sm:text-lg font-black tracking-tight">
                {deselectedCount} <span className="text-xs font-normal text-blue-200">/ 3</span>
              </div>
            </div>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                isDeselectTargetReached ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/20 text-white'
              }`}
            >
              {isDeselectTargetReached ? '✓' : `${3 - deselectedCount}`}
            </div>
          </div>
        </div>
      </div>

      {/* Official Rule Notice */}
      <div className="bg-sbsz-lightBlue border-b border-sbsz-borderBlue px-3 py-2 text-xs text-sbsz-darkBlue flex items-start gap-2 shrink-0">
        <Info className="w-4 h-4 text-sbsz-blue shrink-0 mt-0.5" />
        <p className="leading-snug">
          <strong>IHK-Vorgabe:</strong> 25 von 28 Aufgaben müssen gewertet werden. 3 Aufgaben können Sie über{' '}
          <span className="font-mono font-bold bg-amber-200 text-amber-950 px-1 py-0.5 rounded text-[11px]">[A]</span>{' '}
          abwählen. 8 markierte Aufgaben (🔒) sind nicht abwählbar!
        </p>
      </div>

      {/* Scrollable Questions Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
        {Array.from({ length: exam.totalQuestions }, (_, i) => i + 1).map((qNum) => {
          const isNonDeselectable = nonDeselectableSet.has(qNum);
          const isDeselected = deselected.includes(qNum);
          const selectedOption = answers[qNum];
          const qDef = exam.questions.find((q) => q.number === qNum);
          const pageNumber = qDef?.pageNumber || 3;
          const hasDrawing = qDef?.drawingPage !== undefined;

          return (
            <div
              key={qNum}
              className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
                isDeselected
                  ? 'bg-amber-50/70 border-amber-300 opacity-70'
                  : selectedOption !== undefined
                  ? 'bg-sbsz-lightBlue/60 border-sbsz-borderBlue shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Question header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      isNonDeselectable
                        ? 'bg-sbsz-darkBlue text-white shadow-inner'
                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {qNum}
                  </div>

                  {isNonDeselectable && (
                    <span className="bg-sbsz-darkBlue text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                      <Lock className="w-2.5 h-2.5 text-amber-300" />
                      <span>Nicht abwählbar</span>
                    </span>
                  )}

                  {qDef?.topic && (
                    <span className="text-xs text-slate-500 truncate max-w-[130px] sm:max-w-[180px] hidden sm:inline">
                      {qDef.topic}
                    </span>
                  )}
                </div>

                {/* Right controls: Page jumping & Drawing quick button */}
                <div className="flex items-center gap-1">
                  {hasDrawing && (
                    <button
                      onClick={() => onJumpToPage(qDef!.drawingPage!)}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                      title="Technische Zeichnung (Bild a) auf Seite 10 ansehen"
                    >
                      <Layers className="w-3 h-3 text-amber-700" />
                      <span>Bild a</span>
                    </button>
                  )}

                  <button
                    onClick={() => onJumpToPage(pageNumber)}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                    title={`Aufgabe ${qNum} im PDF (Seite ${pageNumber}) anzeigen`}
                  >
                    <FileText className="w-3 h-3 text-sbsz-blue" />
                    <span>S. {pageNumber}</span>
                  </button>
                </div>
              </div>

              {/* Options Row (Bubbles 1 to 5) + Abwählen [A] */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 5 Circular Option Bubbles */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 flex-1">
                  {[1, 2, 3, 4, 5].map((opt) => {
                    const isSelected = selectedOption === opt && !isDeselected;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isDeselected}
                        onClick={() => onSelectAnswer(qNum, opt)}
                        className={`h-11 sm:h-10 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center transition-all select-none ${
                          isSelected
                            ? 'bg-sbsz-blue text-white ring-2 ring-sbsz-blue ring-offset-1 shadow-md scale-105 font-black'
                            : isDeselected
                            ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 active:bg-sbsz-lightBlue'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Abwahl Button [A] */}
                {!isNonDeselectable ? (
                  <button
                    type="button"
                    onClick={() => onToggleDeselect(qNum)}
                    className={`h-11 sm:h-10 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                      isDeselected
                        ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400 ring-offset-1 shadow-md font-black'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                    title={
                      isDeselected
                        ? 'Aufgabe wieder aktivieren'
                        : 'Aufgabe abwählen (wird nach IHK-Regel nicht gewertet)'
                    }
                  >
                    <span>[A]</span>
                    <span className="hidden xl:inline">{isDeselected ? 'Abgewählt' : 'Abwahl'}</span>
                  </button>
                ) : (
                  <div
                    className="h-11 sm:h-10 px-2.5 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-mono select-none"
                    title="Nicht abwählbar"
                  >
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with Submit Button in SBSZ Red */}
      <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 shrink-0">
        <button
          onClick={handleOpenConfirm}
          className="w-full bg-sbsz-red hover:bg-sbsz-darkRed text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base group"
        >
          <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          <span>Prüfungsbogen jetzt abgeben</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sbsz-navy/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-sbsz-blue text-white p-5 border-b border-sbsz-darkBlue">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-sbsz-cyan" />
                <span>Prüfung wirklich abgeben?</span>
              </h3>
              <p className="text-xs text-blue-100 mt-1">
                Nach der Abgabe erhältst du sofort die Fehlerauswertung zu deinen Antworten.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Bearbeitete Aufgaben:</span>
                  <span className="font-bold">{answeredCount} von 25 erforderlich</span>
                </div>
                <div className="flex justify-between">
                  <span>Vom Prüfling abgewählt [A]:</span>
                  <span className="font-bold">{deselectedCount} von 3</span>
                </div>
              </div>

              {deselectedCount < exam.maxDeselections && (
                <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Hinweis zur IHK-Abwahlregel</span>
                  </div>
                  <p>
                    Du hast nur <strong>{deselectedCount}</strong> von 3 Aufgaben abgewählt. Laut offizieller
                    IHK-Prüfungsordnung werden automatisch die letzten abwählbaren Aufgaben gestrichen und nicht
                    gewertet.
                  </p>
                </div>
              )}

              {answeredCount < 25 && (
                <div className="bg-sbsz-lightRed border border-red-200 text-sbsz-darkRed p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-sbsz-red">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-sbsz-red" />
                    <span>Offene Aufgaben vorhanden</span>
                  </div>
                  <p>
                    Du hast noch nicht alle 25 Aufgaben beantwortet. Unbeantwortete Aufgaben zählen als nicht
                    gelöst (0 Punkte).
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Zurück zum Bogen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="flex-1 bg-sbsz-red hover:bg-sbsz-darkRed text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors shadow"
                >
                  Endgültig abgeben
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
