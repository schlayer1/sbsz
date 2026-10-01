import React from 'react';
import { BookOpen, User, ShieldCheck, LogOut, FileText, CheckCircle2 } from 'lucide-react';
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
}) => {
  return (
    <header className="bg-ihk-blue text-white shadow-md sticky top-0 z-40 border-b border-blue-950">
      <div className="w-full max-w-[2100px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-ihk-blue flex items-center justify-center font-black text-xl shadow-inner tracking-tighter">
            IHK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight">SBSZ Prüfungsportal</span>
              <span className="hidden sm:inline-block bg-blue-800 text-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">
                Digitaler Bogen
              </span>
            </div>
            <p className="text-xs text-blue-200 hidden md:block">
              Staatliches Berufsschulzentrum | Zerspanungsmechaniker Fertigungstechnik
            </p>
          </div>
        </div>

        {/* View Switchers for Students */}
        {!isTeacherMode && currentStudent && (
          <div className="flex items-center gap-1 sm:gap-2 bg-blue-950/60 p-1 rounded-xl border border-blue-800/60">
            <button
              onClick={() => setActiveView('exam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'exam'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-blue-200 hover:text-white hover:bg-blue-900/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Prüfungsbogen</span>
            </button>

            {hasSubmission && (
              <button
                onClick={() => setActiveView('result')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeView === 'result'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-blue-200 hover:text-white hover:bg-blue-900/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Auswertung & Feedback</span>
              </button>
            )}
          </div>
        )}

        {/* User / Auth State */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isTeacherMode ? (
            <div className="flex items-center gap-2">
              <div className="bg-amber-500/20 border border-amber-400 text-amber-200 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Lehrer-Dashboard</span>
                <span className="sm:hidden">Lehrer</span>
              </div>
              <button
                onClick={onExitTeacherMode}
                className="bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1"
                title="Lehrermodus beenden"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Abmelden</span>
              </button>
            </div>
          ) : currentStudent ? (
            <div className="flex items-center gap-2">
              <div className="bg-blue-900/80 border border-blue-700 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-blue-300" />
                <span className="font-bold">
                  {currentStudent.firstName} {currentStudent.lastName}
                </span>
                <span className="bg-blue-700 text-blue-100 text-[11px] px-1.5 py-0.5 rounded font-mono">
                  {currentStudent.className}
                </span>
              </div>
              <button
                onClick={onLogoutStudent}
                className="text-blue-300 hover:text-white p-2 hover:bg-blue-900 rounded-lg transition-colors"
                title="Als Schüler abmelden"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenStudentLogin}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow transition-all flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Schüler Anmelden</span>
            </button>
          )}

          {/* Teacher Login Button */}
          {!isTeacherMode && (
            <button
              onClick={onOpenTeacherLogin}
              className="bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-200 hover:text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5"
              title="Lehrerzugang (Passwortgeschützt)"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Lehrerzugang</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
