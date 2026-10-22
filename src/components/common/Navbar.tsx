import React from 'react';
import { Menu, LogOut, User as UserIcon, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NavbarProps {
  onToggleSidebar: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, currentView }) => {
  const { user, logout } = useAuth();

  const getViewTitle = (viewKey: string) => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      register_student: 'Register Student',
      students: 'My Students',
      attendance_records: 'Attendance Records',
      report_submissions: 'Report Submissions',
      mark_attendance: 'Clock In / Out (Attendance)',
      submit_report: 'Submit Report',
      my_attendance: 'My Attendance Logs',
      my_submissions: 'My Submissions',
      profile: 'Account Profile',
    };
    return titles[viewKey] || 'Overview';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Contextual Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <span className="text-slate-400 capitalize">{user?.role} Portal</span>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <span className="text-slate-900 font-semibold">{getViewTitle(currentView)}</span>
        </div>
      </div>

      {/* Right User Bar */}
      <div className="flex items-center gap-3">
        <PWAInstallButton variant="nav" />

        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-slate-900 block leading-tight">{user?.name}</span>
            <span className="text-[11px] text-slate-500 block leading-tight">
              {user?.role === 'lecturer' ? 'Staff Member' : 'Student'}
            </span>
          </div>

          <div className="w-9 h-9 rounded-xl bg-[#173B70] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.name.slice(0, 2).toUpperCase() || <UserIcon className="w-4 h-4" />}
          </div>

          <button
            onClick={() => logout()}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
