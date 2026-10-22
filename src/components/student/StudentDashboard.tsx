import React, { useState, useEffect } from 'react';
import {
  MapPin,
  FileUp,
  CalendarCheck2,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  Clock,
  Radio,
  Eye,
  Download,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { AttendanceRecord, ReportSubmission, ReportAttachment } from '../../types/index.ts';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal.tsx';
import { attendanceDayKey } from '../../utils/datetime.ts';

interface StudentDashboardProps {
  onNavigate: (view: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [activeClockIn, setActiveClockIn] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [mapRecord, setMapRecord] = useState<AttendanceRecord | null>(null);
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    reportId: string;
    attachment: ReportAttachment;
    reportTitle: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api.getAttendanceRecords(),
      api.getReports(),
      api.getActiveClockIn(),
    ])
      .then(([att, rep, activeData]) => {
        setAttendanceRecords(att);
        setReports(rep);
        setActiveClockIn(activeData.activeRecord);
      })
      .catch((err) => console.error('Failed to load student dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const todayStr = attendanceDayKey();
  const todayAttendance = attendanceRecords.find(
    (a) => attendanceDayKey(a.clock_in_time || a.server_timestamp) === todayStr
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#173B70] to-[#2563EB] rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
            Student Academic Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-xl">
            One attendance session per day. Clock in, submit your report, then clock out.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('mark_attendance')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#173B70] hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-blue-600" />
            Clock In / Out
          </button>
          <button
            onClick={() => onNavigate('submit_report')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-500/30 hover:bg-blue-500/40 text-white border border-white/20 transition-colors flex items-center gap-1.5"
          >
            <FileUp className="w-4 h-4" />
            Submit Report
          </button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Clock In / Attendance Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Attendance & Clock-In Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          {activeClockIn ? (
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-sm font-bold text-blue-950">Currently Clocked In</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  {new Date(activeClockIn.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">
                  Active Attendance Record
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5 font-mono">
                  GPS: {(activeClockIn.clock_in_lat || activeClockIn.latitude).toFixed(5)}, {(activeClockIn.clock_in_lng || activeClockIn.longitude).toFixed(5)} (±{Math.round(activeClockIn.clock_in_accuracy || activeClockIn.accuracy_meters)}m)
                </span>
              </div>

              {/* Report Gate Alert */}
              {activeClockIn.report_submitted ? (
                <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Report Submitted & Verified!
                  </span>
                  <button
                    onClick={() => onNavigate('mark_attendance')}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                  >
                    Clock Out Now
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    Report Required before you can Clock Out.
                  </span>
                  <button
                    onClick={() => onNavigate('submit_report')}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shrink-0"
                  >
                    Submit Report
                  </button>
                </div>
              )}
            </div>
          ) : todayAttendance ? (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-bold text-emerald-950 block">Attendance Completed</span>
                <span className="text-xs text-emerald-800 leading-relaxed block mt-0.5">
                  Clock-in logged at {new Date(todayAttendance.clock_in_time || todayAttendance.server_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                  {todayAttendance.clock_out_time && ` Clocked out at ${new Date(todayAttendance.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}
                </span>
                <button
                  onClick={() => setMapRecord(todayAttendance)}
                  className="mt-2 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950 inline-flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" /> Inspect Recorded GPS Location
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-bold text-amber-950 block">Not Clocked In</span>
                <span className="text-xs text-amber-800 leading-relaxed block mt-0.5">
                  Click below to capture your real-time GPS coordinates and clock in for today.
                </span>
                <button
                  onClick={() => onNavigate('mark_attendance')}
                  className="mt-2.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1"
                >
                  Clock In Now
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Report Submission Status */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Coursework Submissions
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
              {reports.length}
            </span>
            <span className="text-xs text-slate-500">total reports submitted</span>
          </div>

        </div>
      </div>

      {/* Supervised Work Duty Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Academic Supervision & Duty Status</h2>
          </div>
          <button
            onClick={() => onNavigate('mark_attendance')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Clock In / Out Screen <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {activeClockIn ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  Currently Clocked In
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                  Duty Not Started
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              {activeClockIn
                ? activeClockIn.report_submitted
                  ? 'Your work report has been verified. You may proceed to Clock Out.'
                  : 'You are currently clocked in. Complete your work tasks and submit your report to unlock Clock Out.'
                : 'Begin your supervised work period by clocking in with your device GPS coordinates.'}
            </p>
          </div>

          <div className="shrink-0">
            {activeClockIn ? (
              <button
                onClick={() => onNavigate(activeClockIn.report_submitted ? 'mark_attendance' : 'submit_report')}
                className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
              >
                {activeClockIn.report_submitted ? 'Clock Out Now' : 'Submit Required Report'}
              </button>
            ) : (
              <button
                onClick={() => onNavigate('mark_attendance')}
                className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
              >
                Clock In with GPS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Logs */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-blue-600" />
              Recent Attendance Logs
            </h3>
            <button
              onClick={() => onNavigate('my_attendance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          {attendanceRecords.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No attendance records logged yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {attendanceRecords.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      {new Date(rec.server_timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      GPS: {rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)} (±
                      {Math.round(rec.accuracy_meters)}m)
                    </span>
                  </div>
                  <button
                    onClick={() => setMapRecord(rec)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View on Map"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-purple-600" />
              Recent Submitted Reports
            </h3>
            <button
              onClick={() => onNavigate('my_submissions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              View All
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
              No reports submitted yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {reports.slice(0, 4).map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-slate-800 block truncate">{rep.title}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {rep.attachments.length} file(s) ·{' '}
                      {new Date(rep.submitted_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {rep.attachments.length > 0 && (
                    <button
                      onClick={() =>
                        setPreviewData({
                          isOpen: true,
                          reportId: rep.id,
                          attachment: rep.attachments[0],
                          reportTitle: rep.title,
                        })
                      }
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Preview Attachment"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Modal */}
      {mapRecord && (
        <MapViewModal
          isOpen={!!mapRecord}
          onClose={() => setMapRecord(null)}
          title="Your Verified Attendance Location"
          subtitle={`Recorded on ${new Date(mapRecord.server_timestamp).toLocaleString()}`}
          latitude={mapRecord.latitude}
          longitude={mapRecord.longitude}
          accuracyMeters={mapRecord.accuracy_meters}
          timestamp={mapRecord.server_timestamp}
        />
      )}

      {/* Preview Modal */}
      {previewData && (
        <DocumentPreviewModal
          isOpen={previewData.isOpen}
          onClose={() => setPreviewData(null)}
          reportId={previewData.reportId}
          attachment={previewData.attachment}
          reportTitle={previewData.reportTitle}
        />
      )}
    </div>
  );
};
