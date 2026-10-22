import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CalendarCheck2,
  FileCheck2,
  UserPlus,
  ArrowRight,
  MapPin,
  Clock,
  AlertTriangle,
  MonitorSmartphone,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { LecturerSummaryMetrics, AttendanceRecord, ReportSubmission } from '../../types/index.ts';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { buildSubmissionAudit } from '../../utils/audit.ts';

interface LecturerDashboardProps {
  onNavigate: (view: string) => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<LecturerSummaryMetrics>({
    totalApprovedStudents: 0,
    totalStudentsRegistered: 0,
    pendingStudentApprovals: 0,
    todayAttendanceRecords: 0,
    currentlyClockedInCount: 0,
    totalReportsSubmitted: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [, setLoading] = useState(true);

  // Map modal state
  const [selectedMapRecord, setSelectedMapRecord] = useState<{
    title: string;
    subtitle: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    timestamp: string;
  } | null>(null);

  const loadDashboardData = async () => {
    try {
      const [m, att, reps] = await Promise.all([
        api.getLecturerMetrics(),
        api.getAttendanceRecords(),
        api.getReports(),
      ]);
      setMetrics(m);
      setAllAttendance(att);
      setRecentAttendance(att.slice(0, 6));
      setReports(reps);
    } catch (err) {
      console.error('Failed to load lecturer dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const audit = useMemo(
    () => buildSubmissionAudit(allAttendance, reports),
    [allAttendance, reports]
  );

  const todayFlaggedStudents = audit.todayFlaggedStudentIds.size;
  const todayFlaggedEvents = audit.todayFlaggedEvents.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#173B70] to-[#2563EB] rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
            Student Attendance & Reporting System Console
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
            Student Attendance & Coursework Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-xl">
            Real-time GPS attendance telemetry and coursework reporting audit records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('register_student')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            Register Student
          </button>
          <button
            onClick={() => onNavigate('attendance_records')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white text-[#173B70] hover:bg-blue-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <CalendarCheck2 className="w-4 h-4 text-blue-600" />
            Attendance Records
          </button>
        </div>
      </div>

      {todayFlaggedStudents > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('device_audit')}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 hover:bg-amber-100/70 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-sm font-bold text-amber-950">
              Same-day device or IP sharing detected
            </span>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              {todayFlaggedStudents} student{todayFlaggedStudents !== 1 ? 's' : ''} shared a
              device or IP with another student today · {todayFlaggedEvents} flagged event
              {todayFlaggedEvents !== 1 ? 's' : ''}. Multiple devices per student are allowed.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-white/70 border border-amber-200 px-2.5 py-1 rounded-lg shrink-0">
            <MonitorSmartphone className="w-3.5 h-3.5" /> Review
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students Registered */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Students Registered
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.totalStudentsRegistered || metrics.totalApprovedStudents}
            </span>
            <span className="text-xs text-slate-400">registered in system</span>
          </div>
        </div>

        {/* Currently Clocked In */}
        <div
          onClick={() => onNavigate('attendance_records')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Currently Clocked In
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
              {metrics.currentlyClockedInCount}
            </span>
            <span className="text-xs text-slate-400">active duty now</span>
          </div>
        </div>

        {/* Today's Attendance */}
        <div
          onClick={() => onNavigate('attendance_records')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Today's Attendance
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
              {metrics.todayAttendanceRecords}
            </span>
            <span className="text-xs text-slate-400">GPS verified logs</span>
          </div>
        </div>

        {/* Reports Submitted */}
        <div
          onClick={() => onNavigate('report_submissions')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Reports Submitted
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {metrics.totalReportsSubmitted}
            </span>
            <span className="text-xs text-slate-400">coursework files</span>
          </div>
        </div>
      </div>

      {/* Live Supervised Work In-Progress Strip */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Active Supervised Work (Currently Clocked In)</h2>
          </div>
          <button
            onClick={() => onNavigate('attendance_records')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            All Logs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAttendance.filter((r) => r.status === 'clocked_in').length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">No students are currently clocked in.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Students clock in with GPS when commencing attendance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentAttendance
              .filter((r) => r.status === 'clocked_in')
              .map((rec) => {
                const inLat = rec.clock_in_lat || rec.latitude;
                const inLng = rec.clock_in_lng || rec.longitude;
                const inAcc = rec.clock_in_accuracy || rec.accuracy_meters;
                const inTime = rec.clock_in_time || rec.server_timestamp;

                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                        <span className="text-xs font-bold text-slate-900">{rec.student_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2 font-mono">
                        <span>In: {new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>·</span>
                        <span>GPS: {inLat.toFixed(4)}, {inLng.toFixed(4)} (±{Math.round(inAcc)}m)</span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedMapRecord({
                          title: `Supervised Work: ${rec.student_name}`,
                          subtitle: `Clock In: ${new Date(inTime).toLocaleTimeString()}`,
                          latitude: inLat,
                          longitude: inLng,
                          accuracyMeters: inAcc,
                          timestamp: inTime,
                        })
                      }
                      className="px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors shrink-0 shadow-2xs"
                    >
                      View GPS
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Recent Attendance Records Feed */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Recent GPS Attendance Verifications</h2>
          </div>
          <button
            onClick={() => onNavigate('attendance_records')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All Records <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAttendance.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
            No attendance records recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px] font-mono">
                  <th className="py-2.5 font-semibold">Student Name</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Clock In Time & GPS</th>
                  <th className="py-2.5 font-semibold">Clock Out Time & GPS</th>
                  <th className="py-2.5 font-semibold text-right">Location Map</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAttendance.map((rec) => {
                  const inLat = rec.clock_in_lat || rec.latitude;
                  const inLng = rec.clock_in_lng || rec.longitude;
                  const inAcc = rec.clock_in_accuracy || rec.accuracy_meters;
                  const inTime = rec.clock_in_time || rec.server_timestamp;
                  const isOut = rec.status === 'clocked_out';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">{rec.student_name}</td>
                      <td className="py-3">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Clocked Out
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                            Clocked In
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-slate-700">
                        <div>{new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[10px] text-slate-400">{inLat.toFixed(4)}, {inLng.toFixed(4)} (±{Math.round(inAcc)}m)</div>
                      </td>
                      <td className="py-3 font-mono text-slate-700">
                        {isOut && rec.clock_out_time ? (
                          <>
                            <div>{new Date(rec.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[10px] text-slate-400">
                              {(rec.clock_out_lat ?? inLat).toFixed(4)}, {(rec.clock_out_lng ?? inLng).toFixed(4)} (±{Math.round(rec.clock_out_accuracy ?? inAcc)}m)
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-700 italic text-[11px]">In progress</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() =>
                            setSelectedMapRecord({
                              title: `Attendance GPS: ${rec.student_name}`,
                              subtitle: `In: ${new Date(inTime).toLocaleString()}`,
                              latitude: inLat,
                              longitude: inLng,
                              accuracyMeters: inAcc,
                              timestamp: inTime,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          View Map
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Map Modal */}
      {selectedMapRecord && (
        <MapViewModal
          isOpen={!!selectedMapRecord}
          onClose={() => setSelectedMapRecord(null)}
          title={selectedMapRecord.title}
          subtitle={selectedMapRecord.subtitle}
          latitude={selectedMapRecord.latitude}
          longitude={selectedMapRecord.longitude}
          accuracyMeters={selectedMapRecord.accuracyMeters}
          timestamp={selectedMapRecord.timestamp}
        />
      )}
    </div>
  );
};
