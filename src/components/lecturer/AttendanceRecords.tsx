import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck2,
  Search,
  MapPin,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  MonitorSmartphone,
  Network,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AttendanceRecord, User, ReportSubmission } from '../../types/index.ts';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { MonthYearFilter } from '../common/MonthYearFilter.tsx';
import { isInMonthYear, monthYearLabel } from '../../utils/datetime.ts';
import { buildSubmissionAudit } from '../../utils/audit.ts';

export const AttendanceRecords: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState<string>('');

  // Map Modal
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    lat: number;
    lng: number;
    acc: number;
    time: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api.getAttendanceRecords(),
      api.getApprovedStudents(),
      api.getReports(),
    ])
      .then(([recs, studs, reps]) => {
        setRecords(recs);
        setStudents(studs);
        setReports(reps);
      })
      .catch((err) => console.error('Failed to load attendance logs:', err))
      .finally(() => setLoading(false));
  }, []);

  const audit = useMemo(() => buildSubmissionAudit(records, reports), [records, reports]);

  const periodRecords = records.filter((rec) =>
    isInMonthYear(rec.clock_in_time || rec.server_timestamp, selectedMonth, selectedYear)
  );

  const filtered = periodRecords.filter((rec) => {
    if (selectedStudentId !== 'all' && rec.student_id !== selectedStudentId) return false;
    if (selectedStatus !== 'all' && rec.status !== selectedStatus) return false;
    if (flaggedOnly && !audit.attendanceFlags.has(rec.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = rec.student_name.toLowerCase().includes(q);
      if (!matchName) return false;
    }
    return true;
  });

  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Attendance & GPS Telemetry Logs
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Full audit trail showing Clock-In & Clock-Out server timestamps, recorded GPS coordinates, and submitted reports.
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl inline-block">
            {periodRecords.length} Total Record{periodRecords.length !== 1 ? 's' : ''}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {monthYearLabel(selectedMonth, selectedYear)} · Showing {filtered.length}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search student name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Student Dropdown */}
        <div>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Registered Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Attendance Statuses</option>
            <option value="clocked_in">Currently Clocked In</option>
            <option value="clocked_out">Completed (Clocked Out)</option>
            <option value="forgot_clock_out">Forgot to Clock Out</option>
          </select>
        </div>

        {/* Month / Year Filter */}
        <div className="sm:col-span-2 lg:col-span-2">
          <MonthYearFilter
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </div>

        <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="accent-rose-600"
          />
          Flagged only
        </label>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading attendance telemetry records...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CalendarCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No Attendance Records Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {records.length === 0
                ? 'Attendance records will appear here once students clock in.'
                : flaggedOnly
                  ? 'No shared-device or shared-IP attendance in this period.'
                  : 'Try changing the selected month, year, or other filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono">
                  <th className="py-3 px-6 font-semibold">Student</th>
                  <th className="py-3 px-6 font-semibold">Device / IP</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Clock In (GPS & Time)</th>
                  <th className="py-3 px-6 font-semibold">Clock Out (GPS & Time)</th>
                  <th className="py-3 px-6 font-semibold">Report Gating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rec) => {
                  const inLat = rec.clock_in_lat || rec.latitude;
                  const inLng = rec.clock_in_lng || rec.longitude;
                  const inAcc = rec.clock_in_accuracy || rec.accuracy_meters;
                  const inTime = rec.clock_in_time || rec.server_timestamp;

                  const isOut = rec.status === 'clocked_out';
                  const outLat = rec.clock_out_lat;
                  const outLng = rec.clock_out_lng;
                  const outAcc = rec.clock_out_accuracy;
                  const outTime = rec.clock_out_time;
                  const flags = audit.attendanceFlags.get(rec.id);
                  const peerNames = flags
                    ? [...new Set([...flags.devicePeers, ...flags.ipPeers])]
                    : [];

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Student Info */}
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900">{rec.student_name}</div>
                      </td>

                      {/* Device / IP */}
                      <td className="py-3.5 px-6">
                        <div className="text-[11px] font-semibold text-slate-700">
                          {rec.clock_in_device_label || 'Unknown device'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {rec.clock_in_ip || '—'}
                        </div>
                        {rec.clock_out_device_label && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            out: {rec.clock_out_device_label}
                          </div>
                        )}
                        {rec.clock_out_ip && (
                          <div className="text-[10px] font-mono text-slate-400">
                            out IP: {rec.clock_out_ip}
                          </div>
                        )}
                        {flags && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {flags.sharedDevice && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                title={
                                  flags.devicePeers.length > 0
                                    ? `Same device also used by: ${flags.devicePeers.join(', ')}`
                                    : undefined
                                }
                              >
                                <MonitorSmartphone className="w-3 h-3" />
                                Shared device
                              </span>
                            )}
                            {flags.sharedIp && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-800 border border-violet-200"
                                title={
                                  flags.ipPeers.length > 0
                                    ? `Same IP also used by: ${flags.ipPeers.join(', ')}`
                                    : undefined
                                }
                              >
                                <Network className="w-3 h-3" />
                                Shared IP
                              </span>
                            )}
                            {flags.sharedBoth && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200"
                                title="Same device and same IP used by another student on the same day"
                              >
                                <ShieldAlert className="w-3 h-3" />
                                Same device + IP
                              </span>
                            )}
                          </div>
                        )}
                        {peerNames.length > 0 && (
                          <div className="text-[10px] text-rose-700 mt-1">
                            Also: {peerNames.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2 mb-1">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Completed ({formatDuration(rec.duration_minutes)})
                            </span>
                          ) : rec.status === 'forgot_clock_out' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Forgot to Clock Out
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                              Active Clock-In
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {new Date(inTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Clock In */}
                      <td className="py-3.5 px-6">
                        <div className="font-mono text-slate-900 font-semibold text-[11px] tabular-nums">
                          {new Date(inTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono text-slate-500">
                            {inLat.toFixed(5)}, {inLng.toFixed(5)} (±{Math.round(inAcc)}m)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setMapModal({
                                isOpen: true,
                                title: `Clock-In GPS: ${rec.student_name}`,
                                subtitle: `In: ${new Date(inTime).toLocaleString()}`,
                                lat: inLat,
                                lng: inLng,
                                acc: inAcc,
                                time: inTime,
                              })
                            }
                            className="text-blue-600 hover:text-blue-800 p-0.5"
                            title="Inspect Clock-In GPS on Map"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-6">
                        {isOut && outTime && outLat !== undefined && outLng !== undefined ? (
                          <>
                            <div className="font-mono text-slate-900 font-semibold text-[11px] tabular-nums">
                              {new Date(outTime).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono text-slate-500">
                                {outLat.toFixed(5)}, {outLng.toFixed(5)} (±{Math.round(outAcc || 10)}m)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setMapModal({
                                    isOpen: true,
                                    title: `Clock-Out GPS: ${rec.student_name}`,
                                    subtitle: `Out: ${new Date(outTime).toLocaleString()}`,
                                    lat: outLat,
                                    lng: outLng,
                                    acc: outAcc || 10,
                                    time: outTime,
                                  })
                                }
                                className="text-rose-600 hover:text-rose-800 p-0.5"
                                title="Inspect Clock-Out GPS on Map"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-amber-700 italic font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Ongoing (Not clocked out yet)
                          </div>
                        )}
                      </td>

                      {/* Report Submission */}
                      <td className="py-3.5 px-6">
                        {rec.report_submitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Report Submitted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Report Pending
                          </span>
                        )}
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
      {mapModal && (
        <MapViewModal
          isOpen={mapModal.isOpen}
          onClose={() => setMapModal(null)}
          title={mapModal.title}
          subtitle={mapModal.subtitle}
          latitude={mapModal.lat}
          longitude={mapModal.lng}
          accuracyMeters={mapModal.acc}
          timestamp={mapModal.time}
        />
      )}
    </div>
  );
};
