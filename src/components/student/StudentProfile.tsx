import React, { useState } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { useToast } from '../common/Toast.tsx';

export const StudentProfile: React.FC = () => {
  const { user, updateUserInState } = useAuth();
  const { showToast } = useToast();

  const [fullname, setFullname] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullname.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({ name: cleanName });
      updateUserInState(res.user);
      showToast('Profile updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#173B70] text-white flex items-center justify-center font-bold text-2xl shadow-md">
            {user?.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              {user?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Student account · sign in with your full name
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
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
                required
                placeholder="Enter your full name"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                autoComplete="name"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              This is the name used to sign in and on your attendance records. It must be unique.
            </span>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
            Student accounts use name-based sign-in, so no password is required. If your name is
            changed, use the new name the next time you sign in.
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
