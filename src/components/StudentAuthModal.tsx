import React, { useState } from 'react';
import { User, ArrowRight, X, AlertCircle, Check } from 'lucide-react';
import { StudentProfile } from '../types/exam';

interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (firstName: string, lastName: string, className: string) => Promise<void>;
  cachedStudents: StudentProfile[];
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  cachedStudents,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('ZM22A');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !className.trim()) {
      setError('Bitte Vorname, Nachname und Klasse vollständig ausfüllen.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onLogin(firstName, lastName, className);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Fehler bei der Anmeldung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectRecent = async (s: StudentProfile) => {
    try {
      setIsSubmitting(true);
      await onLogin(s.firstName, s.lastName, s.className);
      onClose();
    } catch (err: any) {
      setError('Fehler bei der Schnell-Anmeldung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-sbsz-navy/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Header with SBSZ Blue */}
        <div className="bg-sbsz-blue p-5 text-white flex items-center justify-between border-b border-sbsz-darkBlue">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow shrink-0">
              <img src="/sbsz-logo.png" alt="SBSZ Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">SBSZ Jena-Göschwitz</h3>
              <p className="text-xs text-blue-100">Prüfungsportal • Schüleranmeldung</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 bg-white">
          {error && (
            <div className="bg-sbsz-lightRed border border-red-200 text-sbsz-darkRed text-xs sm:text-sm p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-sbsz-red" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Login if previously logged in */}
          {cachedStudents.length > 0 && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Zuletzt auf diesem Gerät angemeldet:
              </label>
              <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto">
                {cachedStudents.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectRecent(s)}
                    disabled={isSubmitting}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-sbsz-blue hover:bg-sbsz-lightBlue text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sbsz-blue text-white flex items-center justify-center font-bold text-xs shadow-inner">
                        {s.firstName[0]}
                        {s.lastName[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800">
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="text-xs text-slate-500">Klasse {s.className}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sbsz-blue transition-colors" />
                  </button>
                ))}
              </div>
              <div className="relative my-3 text-center">
                <hr className="border-slate-200" />
                <span className="bg-white px-3 text-xs text-slate-400 absolute left-1/2 -translate-x-1/2 -top-2">
                  oder neue Anmeldung
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vorname des Schülers
              </label>
              <input
                type="text"
                required
                placeholder="z. B. Max"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sbsz-blue text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nachname des Schülers
              </label>
              <input
                type="text"
                required
                placeholder="z. B. Mustermann"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sbsz-blue text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Klasse / Lerngruppe
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['ZM22A', 'ZM22B', 'ZM23', 'ZM24'].map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setClassName(cls)}
                    className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
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
                placeholder="Oder freie Klasseneingabe..."
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full mt-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sbsz-blue"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-sbsz-red hover:bg-sbsz-darkRed text-white font-extrabold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Wird geladen...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Prüfungsportal betreten</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
