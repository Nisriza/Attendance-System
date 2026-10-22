import React, { useState } from 'react';
import {
  UserPlus,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useToast } from '../common/Toast.tsx';

interface RegisterStudentViewProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const RegisterStudentView: React.FC<RegisterStudentViewProps> = ({ onBack, onSuccess }) => {
  const { showToast } = useToast();

  const [fullname, setFullname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredSuccess, setRegisteredSuccess] = useState<{ name: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanFullname = fullname.trim().replace(/\s+/g, ' ');

    if (!cleanFullname) {
      setError('Full name is required.');
      return;
    }

    setLoading(true);
    try {
      await api.registerStudent({ fullname: cleanFullname });

      showToast(`Student ${cleanFullname} registered successfully!`, 'success');
      setRegisteredSuccess({ name: cleanFullname });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register student.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForAnother = () => {
    setFullname('');
    setError(null);
    setRegisteredSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Student Directory
        </button>
      )}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Register New Student
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a student by full name. Students sign in with this name (no password).
            </p>
          </div>
        </div>

        {registeredSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Student Registered!</h2>
              <p className="text-xs text-slate-500 mt-1">
                <strong className="text-slate-900">{registeredSuccess.name}</strong> can now sign in
                by selecting the Student tab and entering this full name.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto text-left text-xs space-y-1.5">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-semibold text-slate-900 text-right">{registeredSuccess.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Status:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Active / Registered
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="px-5 py-2.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Register Another Student
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Users className="w-4 h-4" /> View Student Directory
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="e.g. Marcus Chen"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  autoComplete="name"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Enter the student's official full name. This must be unique — it is used to sign in.
              </span>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
              Students do not use usernames or passwords. They sign in with their full name from the
              Student tab.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Register Student
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
