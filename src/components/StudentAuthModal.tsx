import React, { useState, useMemo } from 'react';
import { User, Key, UserPlus, X, AlertCircle, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { StudentProfile } from '../types/exam';
import { generateStudentCode, formatStudentCode } from '../utils/studentCode';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginWithCode: (code: string) => Promise<void>;
  onRegisterStudent: (firstName: string, lastName: string, className: string) => Promise<void>;
  cachedStudents: StudentProfile[];
  preventClose?: boolean;
  onOpenTeacherLogin?: () => void;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginWithCode,
  onRegisterStudent,
  cachedStudents,
  preventClose = false,
  onOpenTeacherLogin,
}) => {
  // Tab 1: "Ich habe ein Kürzel" (Default/Primär) | Tab 2: "Neues Kürzel anlegen"
  const [activeTab, setActiveTab] = useState<'code' | 'register'>('code');

  // Input states
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('ZM22A');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live preview for generated code according to school-student-auth
  const previewCode = useMemo(() => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName) return '';
    return generateStudentCode(fullName);
  }, [firstName, lastName]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen && activeTab === 'code') {
      const timer = setTimeout(() => {
        try {
          inputRef.current?.focus();
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Handler Tab 1: Code Login
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = formatStudentCode(code);
    if (!cleanCode) {
      setError('Bitte gib dein 4-stelliges Schüler-Kürzel ein (z. B. LMUE).');
      return;
    }

    try {
      setIsSubmitting(true);
      await onLoginWithCode(cleanCode);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Kürzel nicht gefunden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Tab 2: Register & Generate
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !className.trim()) {
      setError('Bitte Vorname, Nachname und Klasse vollständig eingeben.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onRegisterStudent(firstName, lastName, className);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Fehler bei der Registrierung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectRecent = async (s: StudentProfile) => {
    try {
      setIsSubmitting(true);
      await onLoginWithCode(s.studentCode || s.id);
      onClose();
    } catch {
      setError('Fehler bei der Schnell-Anmeldung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-sbsz-blue p-5 text-white flex items-center justify-between border-b border-sbsz-darkBlue">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow shrink-0">
              <img src="/sbsz-logo.png" alt="SBSZ Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">SBSZ Jena-Göschwitz</h3>
              <p className="text-xs text-blue-100">Schüler-Login & Kürzel-System</p>
            </div>
          </div>
          {!preventClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {preventClose && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-900 font-semibold flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Bitte melde dich mit deinem Schüler-Kürzel an oder lege ein neues Kürzel an, um die Prüfungsaufgaben zu bearbeiten.
            </span>
          </div>
        )}

        {/* 3 Options Navigation: Kürzel Login | Kürzel anlegen | Lehrer-Bereich */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('code');
              setError(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white text-sbsz-darkBlue shadow font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-sbsz-blue" />
            <span>Kürzel eingeben</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setError(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-sbsz-darkBlue shadow font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-sbsz-red" />
            <span>Neu anlegen</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 bg-white">
          {error && (
            <div className="bg-sbsz-lightRed border border-red-200 text-sbsz-darkRed text-xs sm:text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-sbsz-red" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: CODE LOGIN (DEFAULT) */}
          {activeTab === 'code' ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Dein 4-stelliges Schüler-Kürzel</span>
                  <span className="text-[11px] font-normal text-slate-400">z. B. LMUE</span>
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    maxLength={10}
                    placeholder="KÜRZEL"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-center uppercase tracking-widest text-2xl font-mono font-black text-sbsz-darkBlue focus:outline-none focus:ring-2 focus:ring-sbsz-blue bg-sbsz-lightBlue/30"
                  />
                  <Key className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Trage dein persönliches Kürzel ein, um direkt auf deine Prüfungsbögen zuzugreifen.
                  Falls du dein Kürzel vergessen hast, kann es deine Lehrkraft im Dashboard einsehen.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-sbsz-blue hover:bg-sbsz-darkBlue text-white font-extrabold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Wird geprüft...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mit Kürzel anmelden</span>
                  </>
                )}
              </button>

              {/* Quick recall list if device was used before */}
              {cachedStudents.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Zuletzt auf diesem Gerät:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cachedStudents.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectRecent(s)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sbsz-lightBlue hover:border-sbsz-blue text-xs font-mono font-bold text-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        <span className="text-sbsz-blue">{s.studentCode || s.id}</span>
                        <span className="font-sans font-normal text-slate-500 text-[11px]">({s.firstName})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* TAB 2: REGISTER & GENERATE CODE */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    required
                    placeholder="Lukas"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sbsz-blue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    required
                    placeholder="Müller"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sbsz-blue"
                  />
                </div>
              </div>

              {/* LIVE CODE PREVIEW according to school-student-auth standard */}
              {previewCode && (
                <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-xl p-3 flex items-center justify-between shadow-sm animate-fade-in">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                      Dein generiertes Kürzel:
                    </div>
                    <div className="text-[11px] text-amber-700">
                      1. Buchstabe Vorname + 3 Buchstaben Nachname
                    </div>
                  </div>
                  <div className="text-xl font-mono font-black text-sbsz-darkBlue bg-white px-3 py-1 rounded-lg border border-amber-300 shadow-inner">
                    {previewCode}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Klasse / Ausbildungsjahr
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                  {['ZM22A', 'ZM22B', 'ZM23', 'ZM24'].map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setClassName(cls)}
                      className={`py-1.5 text-xs font-bold rounded-lg border text-center transition-all ${
                        className === cls
                          ? 'bg-sbsz-blue text-white border-sbsz-blue shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Oder freie Klassenbezeichnung..."
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sbsz-blue"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 bg-sbsz-red hover:bg-sbsz-darkRed text-white font-extrabold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Wird registriert...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Kürzel erstellen & Starten</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Option für Lehrer-Login direkt in der vorgeschalteten Loginmaske */}
        {onOpenTeacherLogin && (
          <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:px-6 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">Sie sind Lehrkraft?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTeacherLogin();
              }}
              className="bg-sbsz-darkBlue hover:bg-sbsz-navy text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Zum Lehrer-Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
