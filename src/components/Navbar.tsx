import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, LogOut, FileText, CheckCircle2, Sparkles, WifiOff, BookOpen } from 'lucide-react';
import { StudentProfile } from '../types/exam';

interface NavbarProps {
  currentStudent: StudentProfile | null;
  isTeacherMode: boolean;
  onOpenStudentLogin: () => void;
  onOpenTeacherLogin: () => void;
  onLogoutStudent: () => void;
  onExitTeacherMode: () => void;
  activeView: 'exam' | 'result' | 'teacher';
  setActiveView: (view: 'exam' | 'result' | 'teacher') => void;
  hasSubmission: boolean;
  hasFeedback?: boolean;
  totalFeedbackCount?: number;
  onOpenFeedbackOverview?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStudent,
  isTeacherMode,
  onOpenStudentLogin,
  onOpenTeacherLogin,
  onLogoutStudent,
  onExitTeacherMode,
  activeView,
  setActiveView,
  hasSubmission,
  hasFeedback,
  totalFeedbackCount,
  onOpenFeedbackOverview,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  return (
    <header className="bg-sbsz-blue text-white shadow-md sticky top-0 z-40 border-b border-sbsz-navy/40">
      <div className="w-full max-w-[2100px] mx-auto px-2.5 sm:px-4 lg:px-8 xl:px-10 2xl:px-12 py-2 flex items-center justify-between gap-2">
        {/* Brand / Prüfungsportal Logo & Titles */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-md shrink-0 text-white">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-sbsz-cyan" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-tight truncate">
                Prüfungsportal
              </span>
              <span className="hidden md:inline-block bg-sbsz-darkBlue/80 text-sbsz-cyan text-[11px] px-2 py-0.5 rounded-full font-bold border border-sbsz-cyan/30 shrink-0">
                IHK Prüfungscenter
              </span>
            </div>
            <p className="text-[10px] text-blue-100 hidden lg:block truncate">
              Digitales Antwort- und Prüfungssystem für Abschlussprüfungen
            </p>
          </div>
        </div>

        {/* View Switchers for Students */}
        {!isTeacherMode && currentStudent && (
          <div className="flex items-center gap-1 bg-sbsz-darkBlue/60 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveView('exam')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'exam'
                  ? 'bg-white text-sbsz-darkBlue shadow font-bold'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">Bogen</span>
            </button>

            {hasSubmission && (
              <button
                onClick={() => setActiveView('result')}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeView === 'result'
                    ? 'bg-emerald-500 text-white shadow font-bold'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">Ergebnis</span>
              </button>
            )}

            {totalFeedbackCount !== undefined && totalFeedbackCount > 0 ? (
              <button
                onClick={onOpenFeedbackOverview}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition-all cursor-pointer"
                title={`${totalFeedbackCount} Lehrkraft-Feedback(s) verfügbar`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 shrink-0" />
                <span className="hidden sm:inline">Feedbacks</span>
                <span className="bg-slate-950 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {totalFeedbackCount}
                </span>
              </button>
            ) : hasFeedback ? (
              <button
                onClick={() => {
                  setActiveView('result');
                  setTimeout(() => {
                    const el = document.getElementById('teacher-feedback-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 80);
                }}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeView === 'result'
                    ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300'
                    : 'bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/40 animate-pulse'
                }`}
                title="Dein Fachlehrer hat dir ein individuelles Feedback gesendet"
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">Feedback</span>
              </button>
            ) : null}
          </div>
        )}

        {/* User / Auth State & Offline Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {!isOnline && (
            <div
              className="flex items-center gap-1.5 bg-amber-400 text-slate-950 font-black px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs shadow-sm border border-amber-500 animate-pulse"
              title="Keine Internetverbindung: Alle Eingaben werden lokal im Browser gesichert und automatisch übertragen, sobald wieder Verbindung besteht."
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Offline-Puffer aktiv</span>
              <span className="sm:hidden">Offline</span>
            </div>
          )}

          {isTeacherMode ? (
            <div className="flex items-center gap-1.5">
              <div className="bg-amber-400 text-slate-950 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 shadow">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 shrink-0" />
                <span className="hidden sm:inline">Lehrer-Dashboard</span>
                <span className="sm:hidden text-xs">Lehrer</span>
              </div>
              <button
                onClick={onExitTeacherMode}
                className="bg-sbsz-darkBlue hover:bg-sbsz-navy text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 border border-white/20"
                title="Lehrermodus beenden"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Abmelden</span>
              </button>
            </div>
          ) : currentStudent ? (
            <div className="flex items-center gap-1.5">
              <div className="bg-sbsz-darkBlue/80 border border-white/20 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sbsz-cyan shrink-0" />
                <span className="font-bold hidden sm:inline max-w-[120px] truncate">
                  {currentStudent.firstName} {currentStudent.lastName}
                </span>
                <span
                  className="bg-amber-400 text-slate-950 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-mono font-black"
                  title={`Dein Login-Kürzel (${currentStudent.firstName} ${currentStudent.lastName})`}
                >
                  {currentStudent.studentCode || '—'}
                </span>
                <span className="bg-white/20 text-white text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-mono font-bold hidden xs:inline">
                  {currentStudent.className}
                </span>
              </div>
              <button
                onClick={onLogoutStudent}
                className="text-blue-200 hover:text-white p-1.5 hover:bg-sbsz-darkBlue rounded-lg transition-colors"
                title="Als Schüler abmelden"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenStudentLogin}
              className="bg-sbsz-red hover:bg-sbsz-darkRed text-white px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow transition-all flex items-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Teacher Login Button */}
          {!isTeacherMode && (
            <button
              onClick={onOpenTeacherLogin}
              className="bg-sbsz-darkBlue/80 hover:bg-sbsz-navy border border-white/20 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              title="Lehrerzugang (Passwortgeschützt)"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span className="hidden sm:inline">Lehrkräfte</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
