import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  FileCheck2,
  FileUp,
  MapPin,
  FileSpreadsheet,
  User,
  X,
  GraduationCap,
  UserPlus,
  MonitorSmartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
}

interface NavItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const isLecturer = user?.role === 'lecturer';

  const lecturerNavItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'students', label: 'My Students', icon: Users },
    { key: 'register_student', label: 'Register Student', icon: UserPlus },
    { key: 'attendance_records', label: 'Attendance Records', icon: CalendarCheck2 },
    { key: 'device_audit', label: 'Device Audit', icon: MonitorSmartphone },
    { key: 'report_submissions', label: 'Report Submissions', icon: FileCheck2 },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  const studentNavItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'mark_attendance', label: 'Clock In / Out', icon: MapPin },
    { key: 'submit_report', label: 'Submit Report', icon: FileUp },
    { key: 'my_attendance', label: 'My Attendance Logs', icon: CalendarCheck2 },
    { key: 'my_submissions', label: 'My Submissions', icon: FileSpreadsheet },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  const items = isLecturer ? lecturerNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-2xs"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#173B70] text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold tracking-tight text-white block leading-tight font-['Plus_Jakarta_Sans',sans-serif] truncate">
                Attendance & Reporting
              </span>
              <span className="text-[10px] text-blue-200 font-medium tracking-wide block uppercase">
                SAR System
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white p-1 rounded-md"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Active User</div>
          <div className="text-sm font-semibold text-white mt-0.5 truncate">{user?.name}</div>
          <div className="text-xs text-blue-300/80 truncate">
            {isLecturer ? 'Staff / Lecturer' : 'Student'}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectView(item.key);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-blue-300'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 text-[11px] text-blue-300/70 text-center">
          Student Attendance & Reporting System
        </div>
      </aside>
    </>
  );
};
