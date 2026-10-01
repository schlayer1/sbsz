import React from 'react';
import { User, ShieldCheck, LogOut, FileText, CheckCircle2 } from 'lucide-react';
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
    <header className="bg-sbsz-blue text-white shadow-md sticky top-0 z-40 border-b border-sbsz-navy/40">
      <div className="w-full max-w-[2100px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-2.5 flex items-center justify-between">
        {/* Brand / Official SBSZ Logo & Titles */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shrink-0 border border-white/20">
            <img
              src="/sbsz-logo.png"
              alt="Logo SBSZ Jena-Göschwitz"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight">
                SBSZ Jena-Göschwitz
              </span>
              <span className="hidden sm:inline-block bg-sbsz-darkBlue/80 text-sbsz-cyan text-[11px] px-2 py-0.5 rounded-full font-bold border border-sbsz-cyan/30">
                IHK Prüfungsportal
              </span>
            </div>
            <p className="text-[11px] text-blue-100 hidden md:block">
              Staatliches Berufsschulzentrum Jena-Göschwitz • Fachbereich Metall & Fertigungstechnik
            </p>
          </div>
        </div>

        {/* View Switchers for Students */}
        {!isTeacherMode && currentStudent && (
          <div className="flex items-center gap-1 sm:gap-1.5 bg-sbsz-darkBlue/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveView('exam')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'exam'
                  ? 'bg-white text-sbsz-darkBlue shadow font-bold'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
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
                    ? 'bg-emerald-500 text-white shadow font-bold'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Auswertung</span>
              </button>
            )}
          </div>
        )}

        {/* User / Auth State */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isTeacherMode ? (
            <div className="flex items-center gap-2">
              <div className="bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow">
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline">Lehrer-Dashboard</span>
                <span className="sm:hidden">Lehrer</span>
              </div>
              <button
                onClick={onExitTeacherMode}
                className="bg-sbsz-darkBlue hover:bg-sbsz-navy text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1 border border-white/20"
                title="Lehrermodus beenden"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Abmelden</span>
              </button>
            </div>
          ) : currentStudent ? (
            <div className="flex items-center gap-2">
              <div className="bg-sbsz-darkBlue/80 border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-sbsz-cyan" />
                <span className="font-bold">
                  {currentStudent.firstName} {currentStudent.lastName}
                </span>
                <span
                  className="bg-amber-400 text-slate-950 text-[11px] px-1.5 py-0.5 rounded font-mono font-black"
                  title="Dein Login-Kürzel"
                >
                  {currentStudent.studentCode || '—'}
                </span>
                <span className="bg-white/20 text-white text-[11px] px-1.5 py-0.5 rounded font-mono font-bold">
                  {currentStudent.className}
                </span>
              </div>
              <button
                onClick={onLogoutStudent}
                className="text-blue-200 hover:text-white p-2 hover:bg-sbsz-darkBlue rounded-lg transition-colors"
                title="Als Schüler abmelden"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenStudentLogin}
              className="bg-sbsz-red hover:bg-sbsz-darkRed text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Schüler Anmelden</span>
            </button>
          )}

          {/* Teacher Login Button */}
          {!isTeacherMode && (
            <button
              onClick={onOpenTeacherLogin}
              className="bg-sbsz-darkBlue/80 hover:bg-sbsz-navy border border-white/20 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
              title="Lehrerzugang (Passwortgeschützt)"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Lehrkräfte</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
