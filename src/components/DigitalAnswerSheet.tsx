import React, { useState } from 'react';
import {
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  Layers,
  FileText,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  drillMode?: boolean;
  drillQuestions?: number[];
  onExitDrillMode?: () => void;
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
  drillMode = false,
  drillQuestions = [],
  onExitDrillMode,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Manually expanded state for answered questions
  const [manuallyExpanded, setManuallyExpanded] = useState<Record<number, boolean>>({});

  const nonDeselectableSet = new Set(exam.nonDeselectableQuestions || [6, 7, 8, 9, 12, 16, 20, 28]);
  const deselectedCount = deselected.length;

  const totalQuestions = exam.totalQuestions || 28;
  const requiredQuestions = exam.requiredQuestions || totalQuestions;
  const maxDeselections = exam.maxDeselections ?? 0;
  const hasDeselections = maxDeselections > 0;

  // Drill Mode calculations
  const targetDrillQuestions = drillQuestions && drillQuestions.length > 0 ? drillQuestions : [];
  const correctInDrillCount = targetDrillQuestions.filter((qNum) => {
    return answers[qNum] !== undefined && exam.solutions && answers[qNum] === exam.solutions[qNum];
  }).length;
  const displayedQuestions =
    drillMode && targetDrillQuestions.length > 0
      ? targetDrillQuestions
      : Array.from({ length: exam.totalQuestions }, (_, i) => i + 1);

  // Count answered questions that are NOT deselected
  const answeredCount = Object.keys(answers).filter((qStr) => {
    const qNum = Number(qStr);
    return answers[qNum] !== undefined && !deselected.includes(qNum);
  }).length;

  const isCompleted = answeredCount >= requiredQuestions;
  const remainingCount = Math.max(0, requiredQuestions - answeredCount);
  const isDeselectTargetReached = hasDeselections && deselectedCount === maxDeselections;
  const progressPercentage = Math.min(100, Math.round((answeredCount / requiredQuestions) * 100));

  const toggleExpand = (qNum: number) => {
    setManuallyExpanded((prev) => ({
      ...prev,
      [qNum]: !prev[qNum],
    }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    for (let i = 1; i <= exam.totalQuestions; i++) {
      all[i] = true;
    }
    setManuallyExpanded(all);
  };

  const collapseAll = () => {
    setManuallyExpanded({});
  };

  const handleOpenConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    onSubmitExam();
  };

  const handleSelectOptionWithAutoCollapse = (qNum: number, opt: number) => {
    onSelectAnswer(qNum, opt);
    // After answering, collapse smoothly only if NOT in drillMode
    if (!drillMode) {
      setManuallyExpanded((prev) => ({
        ...prev,
        [qNum]: false,
      }));
    }
  };

  const handleToggleDeselectWithCollapse = (qNum: number) => {
    onToggleDeselect(qNum);
    if (!drillMode) {
      setManuallyExpanded((prev) => ({
        ...prev,
        [qNum]: false,
      }));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col h-full border border-slate-200 overflow-hidden">
      {/* Header with SBSZ Jena-Göschwitz Blue */}
      <div className="bg-gradient-to-r from-sbsz-darkBlue to-sbsz-blue text-white p-3.5 sm:p-4 shrink-0 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              {drillMode ? (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  Gezielter Drill-Modus
                </span>
              ) : (
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  SBSZ Jena • IHK Markierungsbogen
                </span>
              )}
              <span className="text-xs text-sbsz-cyan font-semibold">
                {drillMode
                  ? `${targetDrillQuestions.length} Problemaufgaben`
                  : `Teil A (${totalQuestions} Aufgaben)`}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-tight mt-0.5">
              {drillMode ? 'Fehlertraining mit Sofort-Rückmeldung' : 'Digitaler Antwortbogen'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {drillMode && onExitDrillMode && (
              <button
                type="button"
                onClick={onExitDrillMode}
                className="bg-white/20 hover:bg-white text-white hover:text-slate-950 font-bold px-3 py-1 rounded-xl text-xs transition-colors flex items-center gap-1 border border-white/30 cursor-pointer shadow-sm"
              >
                <span>Zur Gesamtauswertung</span>
                <span>✕</span>
              </button>
            )}

            {/* Auto-save status indicator */}
            <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-sbsz-navy/50 px-2.5 py-1 rounded-xl border border-white/10">
              <Clock className="w-3.5 h-3.5 text-sbsz-cyan" />
              <span>
                {isSaving
                  ? 'Wird gespeichert...'
                  : lastSavedAt
                  ? `Gespeichert ${new Date(lastSavedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`
                  : 'Bereit'}
              </span>
            </div>
          </div>
        </div>

        {/* Counter KPI strip */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/15">
          {drillMode ? (
            <>
              <div className="bg-white/10 rounded-xl p-2 sm:px-3 text-center sm:text-left flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-blue-200 font-medium">Gemeistert</div>
                  <div className="text-base sm:text-lg font-black tracking-tight text-emerald-300">
                    {correctInDrillCount}{' '}
                    <span className="text-xs font-normal text-blue-200">
                      / {targetDrillQuestions.length}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    correctInDrillCount === targetDrillQuestions.length
                      ? 'bg-sbsz-lime text-slate-950 font-black'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {correctInDrillCount === targetDrillQuestions.length ? '✓' : `${correctInDrillCount}`}
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-2 sm:px-3 text-center sm:text-left flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-blue-200 font-medium">Noch offen</div>
                  <div className="text-base sm:text-lg font-black tracking-tight text-amber-300">
                    {Math.max(0, targetDrillQuestions.length - correctInDrillCount)}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-amber-400 text-slate-950 font-black">
                  🎯
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white/10 rounded-xl p-2 sm:px-3 text-center sm:text-left flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-blue-200 font-medium">Bearbeitet</div>
                  <div className="text-base sm:text-lg font-black tracking-tight">
                    {answeredCount} <span className="text-xs font-normal text-blue-200">/ {requiredQuestions}</span>
                  </div>
                </div>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted ? 'bg-sbsz-lime text-slate-950 font-black' : 'bg-white/20 text-white'
                  }`}
                >
                  {isCompleted ? '✓' : `${remainingCount}`}
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-2 sm:px-3 text-center sm:text-left flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-blue-200 font-medium">Abgewählt [A]</div>
                  <div className="text-base sm:text-lg font-black tracking-tight">
                    {deselectedCount} <span className="text-xs font-normal text-blue-200">/ {maxDeselections}</span>
                  </div>
                </div>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDeselectTargetReached ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/20 text-white'
                  }`}
                >
                  {isDeselectTargetReached ? '✓' : `${Math.max(0, maxDeselections - deselectedCount)}`}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FORTSCHRITTSBALKEN */}
      <div className="bg-white px-3 sm:px-4 py-2.5 border-b border-slate-200 shrink-0 space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>{drillMode ? 'Drill-Erfolg:' : 'Fortschritt:'}</span>
            <span className="text-sbsz-blue font-black font-mono text-sm">
              {drillMode
                ? `${correctInDrillCount} / ${targetDrillQuestions.length}`
                : `${answeredCount} / ${requiredQuestions}`}
            </span>
            <span className="text-slate-600 font-medium">
              {drillMode ? 'Aufgaben richtig' : 'Fragen beantwortet'}
            </span>
          </span>

          <span className="font-extrabold font-mono text-sbsz-darkBlue bg-sbsz-lightBlue px-2 py-0.5 rounded-lg border border-sbsz-borderBlue">
            {drillMode
              ? targetDrillQuestions.length > 0
                ? Math.round((correctInDrillCount / targetDrillQuestions.length) * 100)
                : 100
              : progressPercentage}
            %
          </span>
        </div>

        {/* Visueller Fortschrittsbalken */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              (drillMode
                ? correctInDrillCount === targetDrillQuestions.length
                : isCompleted)
                ? 'bg-gradient-to-r from-emerald-500 to-sbsz-lime shadow-sm'
                : 'bg-gradient-to-r from-amber-500 to-amber-400'
            }`}
            style={{
              width: `${
                drillMode
                  ? targetDrillQuestions.length > 0
                    ? Math.round((correctInDrillCount / targetDrillQuestions.length) * 100)
                    : 100
                  : progressPercentage
              }%`,
            }}
          />
        </div>

        {/* Sub-bar */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <div>
            {drillMode ? (
              correctInDrillCount === targetDrillQuestions.length ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Klasse! Du hast alle Fehleraufgaben erfolgreich gemeistert!
                </span>
              ) : (
                <span className="text-amber-800 font-semibold">
                  Noch {targetDrillQuestions.length - correctInDrillCount} Aufgabe(n) korrigieren
                </span>
              )
            ) : isCompleted ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Alle {requiredQuestions} erforderlichen Fragen beantwortet!
              </span>
            ) : (
              <span className="text-slate-500">
                Noch <strong className="text-slate-700">{remainingCount}</strong> Frage(n) erforderlich
              </span>
            )}
          </div>

          {!drillMode && (
            <div className="flex items-center gap-2 text-slate-500">
              <button
                type="button"
                onClick={expandAll}
                className="text-sbsz-blue hover:text-sbsz-darkBlue font-bold hover:underline"
                title="Alle Fragen aufklappen"
              >
                Alle aufklappen
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-slate-500 hover:text-slate-800 font-bold hover:underline"
                title="Beantwortete Fragen einklappen"
              >
                Beantwortete einklappen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notice bar */}
      {drillMode ? (
        <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 text-xs text-amber-950 flex items-start gap-2 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug text-[11px]">
            <strong>Sofort-Lernmodus aktiv:</strong> Wähle die Option, die du nach erneuter Prüfung für richtig hältst. Die App gibt dir sofort Rückmeldung! Klicke auf <strong>S. X</strong>, um direkt auf die PDF-Seite zu springen.
          </p>
        </div>
      ) : (
        <div className="bg-sbsz-lightBlue border-b border-sbsz-borderBlue px-3 py-1.5 text-xs text-sbsz-darkBlue flex items-start gap-2 shrink-0">
          <Info className="w-3.5 h-3.5 text-sbsz-blue shrink-0 mt-0.5" />
          <p className="leading-snug text-[11px]">
            <strong>IHK-Vorgabe:</strong> 25 von 28 Aufgaben werden gewertet. 3 Aufgaben können Sie über{' '}
            <span className="font-mono font-bold bg-amber-200 text-amber-950 px-1 py-0.2 rounded text-[11px]">
              [A]
            </span>{' '}
            abwählen. Beantwortete Fragen klappen automatisch ein.
          </p>
        </div>
      )}

      {/* Scrollable Questions Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
        {displayedQuestions.map((qNum) => {
          const isNonDeselectable = nonDeselectableSet.has(qNum);
          const isDeselected = deselected.includes(qNum);
          const selectedOption = answers[qNum];
          const qDef = exam.questions.find((q) => q.number === qNum);
          const pageNumber = qDef?.pageNumber || 3;
          const hasDrawing = qDef?.drawingPage !== undefined;

          const isAnswered = selectedOption !== undefined || isDeselected;
          const isCollapsed = !drillMode && isAnswered && !manuallyExpanded[qNum];

          // ========================================================
          // EINGEKLAPPTE ZEILE (Kompakt für beantwortete Fragen)
          // ========================================================
          if (isCollapsed) {
            return (
              <div
                key={qNum}
                onClick={() => toggleExpand(qNum)}
                className="p-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white hover:border-sbsz-blue hover:bg-sbsz-lightBlue/40 transition-all cursor-pointer shadow-xs flex items-center justify-between gap-2 group animate-fade-in"
              >
                {/* Left: Number, Topic & Page */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isNonDeselectable
                        ? 'bg-sbsz-darkBlue text-white shadow-inner'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {qNum}
                  </div>

                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {qDef?.topic || `Aufgabe ${qNum}`}
                    </span>
                    {isNonDeselectable && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded font-medium">
                        <Lock className="w-2.5 h-2.5" /> Nicht abwählbar
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Chosen answer badge & "Ändern" Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {isDeselected ? (
                    <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-lg border border-amber-500 shadow-xs">
                      [A] Abgewählt
                    </span>
                  ) : (
                    <span className="bg-sbsz-blue text-white font-black text-xs px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                      <span>Option {selectedOption}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-sbsz-lime" />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(qNum);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-sbsz-lightBlue text-sbsz-darkBlue font-semibold text-xs flex items-center gap-1 border border-slate-200 transition-colors"
                    title="Antwort ansehen oder ändern"
                  >
                    <span>Ändern</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-sbsz-blue" />
                  </button>
                </div>
              </div>
            );
          }

          // ========================================================
          // AUSGEKLAPPTE KARTE (Optionen 1-5 & Abwahl sichtbar)
          // ========================================================
          return (
            <div
              key={qNum}
              className={`p-3 rounded-2xl border transition-all ${
                isDeselected
                  ? 'bg-amber-50/70 border-amber-300 opacity-90'
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
                    <span className="text-xs text-slate-600 truncate max-w-[130px] sm:max-w-[200px]">
                      {qDef.topic}
                    </span>
                  )}
                </div>

                {/* Right controls: Page jumping, Drawing quick button, Einklappen Button */}
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

                  {isAnswered && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(qNum)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-1"
                      title="Frage wieder einklappen"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  )}
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
                        onClick={() => handleSelectOptionWithAutoCollapse(qNum, opt)}
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

                {/* Abwahl Button [A] (Nur im regulären Prüfungsmodus) */}
                {!drillMode && (!isNonDeselectable ? (
                  <button
                    type="button"
                    onClick={() => handleToggleDeselectWithCollapse(qNum)}
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
                ))}
              </div>

              {/* Drill-Mode Live Instant Feedback */}
              {drillMode && selectedOption !== undefined && exam.solutions?.[qNum] && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
                  {selectedOption === exam.solutions[qNum] ? (
                    <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hervorragend gelöst! Option {exam.solutions[qNum]} ist die richtige IHK-Lösung.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Noch nicht ganz richtig – prüfe die Fragestellung und versuche eine andere Option!</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onJumpToPage(pageNumber)}
                    className="text-xs font-bold text-sbsz-blue hover:text-sbsz-darkBlue hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Aufgabe im PDF (S. {pageNumber}) ansehen</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with Submit Button in SBSZ Red OR Drill-Mode Exit Button */}
      <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 shrink-0">
        {drillMode ? (
          <button
            type="button"
            onClick={onExitDrillMode}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base group cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-200 transition-transform group-hover:scale-110" />
            <span>Fehlertraining beenden & Zurück zur Auswertung</span>
          </button>
        ) : (
          <button
            onClick={handleOpenConfirm}
            className="w-full bg-sbsz-red hover:bg-sbsz-darkRed text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base group cursor-pointer"
          >
            <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            <span>Prüfungsbogen jetzt abgeben</span>
          </button>
        )}
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
                  <span className="font-bold">{answeredCount} von {requiredQuestions} erforderlich</span>
                </div>
                {hasDeselections && (
                  <div className="flex justify-between">
                    <span>Vom Prüfling abgewählt [A]:</span>
                    <span className="font-bold">{deselectedCount} von {maxDeselections}</span>
                  </div>
                )}
              </div>

              {hasDeselections && deselectedCount < maxDeselections && (
                <div className="bg-amber-50 border border-amber-300 text-amber-950 p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Hinweis zur IHK-Abwahlregel</span>
                  </div>
                  <p>
                    Du hast nur <strong>{deselectedCount}</strong> von {maxDeselections} Aufgaben abgewählt. Laut offizieller
                    IHK-Prüfungsordnung werden automatisch die letzten abwählbaren Aufgaben gestrichen und nicht
                    gewertet.
                  </p>
                </div>
              )}

              {answeredCount < requiredQuestions && (
                <div className="bg-sbsz-lightRed border border-red-200 text-sbsz-darkRed p-3 rounded-xl text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-sbsz-red">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-sbsz-red" />
                    <span>Offene Aufgaben vorhanden</span>
                  </div>
                  <p>
                    Du hast noch nicht alle {requiredQuestions} Aufgaben beantwortet. Unbeantwortete Aufgaben zählen als nicht
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
