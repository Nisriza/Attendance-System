import React, { useState } from 'react';
import { User, Lock, Save, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { useToast } from '../common/Toast.tsx';

export const LecturerProfile: React.FC = () => {
  const { user, updateUserInState } = useAuth();
  const { showToast } = useToast();

  const [fullname, setFullname] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname.trim()) {
      showToast('Please enter your fullname.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name: fullname.trim(),
      });
      updateUserInState(res.user);
      showToast('Profile fullname updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await api.changePassword({ newPassword });
      showToast(res.message || 'Password updated successfully.', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#173B70] text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {user?.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Profile
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Staff / Lecturer Account</p>
          </div>
        </div>

        {/* Update Fullname Form */}
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fullname *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required
                placeholder="Enter your fullname"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Official fullname displayed across student supervision records
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Fullname
            </button>
          </div>
        </form>
      </div>

      {/* Update Password Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Change / Update Password
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely update your staff login password
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updatingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {updatingPassword ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
