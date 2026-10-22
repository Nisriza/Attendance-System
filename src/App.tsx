/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './components/common/Toast.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { OfflineIndicator } from './components/common/OfflineIndicator.tsx';
import { PWAInstallBanner } from './components/common/PWAInstallBanner.tsx';

// Auth Components
import { LoginForm } from './components/auth/LoginForm.tsx';

// Lecturer Components
import { LecturerDashboard } from './components/lecturer/LecturerDashboard.tsx';
import { MyStudents } from './components/lecturer/MyStudents.tsx';
import { RegisterStudentView } from './components/lecturer/RegisterStudentView.tsx';
import { AttendanceRecords } from './components/lecturer/AttendanceRecords.tsx';
import { DeviceAudit } from './components/lecturer/DeviceAudit.tsx';
import { ReportSubmissions } from './components/lecturer/ReportSubmissions.tsx';
import { LecturerProfile } from './components/lecturer/LecturerProfile.tsx';

// Student Components
import { StudentDashboard } from './components/student/StudentDashboard.tsx';
import { MarkAttendanceView } from './components/student/MarkAttendanceView.tsx';
import { SubmitReportView } from './components/student/SubmitReportView.tsx';
import { MyAttendanceView } from './components/student/MyAttendanceView.tsx';
import { MySubmissionsView } from './components/student/MySubmissionsView.tsx';
import { StudentProfile } from './components/student/StudentProfile.tsx';

import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postReportNoteVisible, setPostReportNoteVisible] = useState(false);

  useEffect(() => {
    // Reset view to dashboard upon user change
    setCurrentView('dashboard');
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F9FF] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#173B70]" />
        <span className="text-xs font-semibold text-slate-500">
          Initializing Student Attendance & Reporting System...
        </span>
      </div>
    );
  }

  // Not logged in: Show Login Screen (Public registration deleted)
  if (!user) {
    return <LoginForm />;
  }

  // Lecturer Views
  const renderLecturerView = () => {
    switch (currentView) {
      case 'dashboard':
        return <LecturerDashboard onNavigate={(v) => setCurrentView(v)} />;
      case 'students':
        return <MyStudents onNavigateRegister={() => setCurrentView('register_student')} />;
      case 'register_student':
        return (
          <RegisterStudentView
            onBack={() => setCurrentView('students')}
            onSuccess={() => {}}
          />
        );
      case 'attendance_records':
        return <AttendanceRecords />;
      case 'device_audit':
        return <DeviceAudit />;
      case 'report_submissions':
        return <ReportSubmissions />;
      case 'profile':
        return <LecturerProfile />;
      default:
        return <LecturerDashboard onNavigate={(v) => setCurrentView(v)} />;
    }
  };

  // Student Views
  const renderStudentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <StudentDashboard
            onNavigate={(v) => setCurrentView(v)}
          />
        );
      case 'mark_attendance':
        return (
          <MarkAttendanceView
            showPostReportNote={postReportNoteVisible}
            onDismissPostReportNote={() => setPostReportNoteVisible(false)}
            onSuccessNavigateToReport={() => {
              setCurrentView('submit_report');
            }}
          />
        );
      case 'submit_report':
        return (
          <SubmitReportView
            onReportSubmitted={() => {
              setPostReportNoteVisible(true);
              setCurrentView('mark_attendance');
            }}
            onNavigateToAttendance={() => setCurrentView('mark_attendance')}
            onNavigateToSubmissions={() => setCurrentView('my_submissions')}
          />
        );
      case 'my_attendance':
        return <MyAttendanceView />;
      case 'my_submissions':
        return <MySubmissionsView />;
      case 'profile':
        return <StudentProfile />;
      default:
        return <StudentDashboard onNavigate={(v) => setCurrentView(v)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F9FF] flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          currentView={currentView}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {user.role === 'lecturer' ? renderLecturerView() : renderStudentView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
        <PWAInstallBanner />
        <OfflineIndicator />
      </AuthProvider>
    </ToastProvider>
  );
}
