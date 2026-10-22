import React, { useState } from 'react';
import {
  LogIn,
  GraduationCap,
  Lock,
  AlertCircle,
  Loader2,
  BookOpen,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../common/Toast.tsx';
import { PWAInstallButton } from '../common/PWAInstallButton.tsx';

interface LoginFormProps {
  onGoToRegisterStudent?: () => void;
  onGoToRegisterLecturer?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = () => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [selectedRole, setSelectedRole] = useState<'student' | 'lecturer'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchRole = (role: 'student' | 'lecturer') => {
    setSelectedRole(role);
    setIdentifier('');
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRole === 'student') {
      if (!identifier.trim()) {
        const message = 'Please enter your full name.';
        setError(message);
        showToast(message, 'error');
        return;
      }
    } else if (!identifier.trim() || !password) {
      const message = 'Please enter your Username and Password.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    setLoading(true);
    try {
      if (selectedRole === 'student') {
        await login({ role: 'student', name: identifier.trim() });
      } else {
        await login({ role: 'lecturer', username: identifier.trim(), password });
      }
    } catch (err: any) {
      const message =
        err?.status === 401 && selectedRole === 'lecturer'
          ? 'Invalid username or password. Please try again.'
          : err?.message ||
            (selectedRole === 'student'
              ? 'Student sign-in failed. Check your full name and try again.'
              : 'Staff sign-in failed. Check your username and password.');
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9FF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 bg-[#173B70] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-[#173B70] tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
          Student Attendance & Reporting System
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
          Official Attendance Verification & Coursework Reporting Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-blue-900/5 rounded-3xl border border-slate-200">
          <div className="mb-6">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Select Your Portal Role
            </label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => switchRole('student')}
                className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  selectedRole === 'student'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                Student
              </button>

              <button
                type="button"
                onClick={() => switchRole('lecturer')}
                className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  selectedRole === 'lecturer'
                    ? 'bg-[#173B70] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Staff / Lecturer
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedRole === 'student' ? 'Full Name *' : 'Username *'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={selectedRole === 'student' ? 'e.g. Marcus Chen' : 'e.g. admin'}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  autoComplete={selectedRole === 'student' ? 'name' : 'username'}
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {selectedRole === 'student'
                  ? 'Enter your full name exactly as registered by your lecturer'
                  : 'Enter your staff username'}
              </span>
            </div>

            {selectedRole === 'lecturer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
            )}

            {selectedRole === 'student' && (
              <p className="text-[11px] text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 leading-relaxed">
                Students sign in with their registered full name. No password is required.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 ${
                selectedRole === 'student'
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  : 'bg-[#173B70] hover:bg-[#122e57] focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In as {selectedRole === 'student' ? 'Student' : 'Staff / Lecturer'}
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex justify-center">
            <PWAInstallButton variant="prominent" />
          </div>
        </div>
      </div>
    </div>
  );
};
