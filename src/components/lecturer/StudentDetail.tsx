import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  CalendarCheck2,
  FileCheck2,
  MapPin,
  Eye,
  Download,
  Loader2,
  Calendar,
  Clock,
  Crosshair,
  MonitorSmartphone,
  Network,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { User, AttendanceRecord, ReportSubmission, ReportAttachment } from '../../types/index.ts';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal.tsx';

interface StudentDetailProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetail: React.FC<StudentDetailProps> = ({ studentId, onBack }) => {
  const [student, setStudent] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    lat: number;
    lng: number;
    acc: number;
    time: string;
  } | null>(null);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    reportId: string;
    attachment: ReportAttachment;
    reportTitle: string;
  } | null>(null);

  useEffect(() => {
    api.getStudentDetail(studentId)
      .then((data) => {
        setStudent(data.student);
        setAttendance(data.attendance);
        setReports(data.reports);
      })
      .catch((err) => console.error('Failed to load student detail:', err))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs">Loading comprehensive student dossier...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-sm text-slate-600">Student not found.</p>
        <button
          onClick={onBack}
          className="mt-3 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-xl"
        >
          Back to Students
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Student Directory
      </button>

      {/* Student Dossier Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#173B70] text-white flex items-center justify-center font-bold text-xl shadow-md">
              {student.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                  {student.name}
                </h1>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Registered Student
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                  Name-based sign-in
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-6">
            <div className="text-left">
              <span className="text-xs text-slate-400 uppercase font-mono block">Attendance Days</span>
              <span className="text-xl font-bold text-blue-600 font-mono tabular-nums">
                {attendance.length} day{attendance.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs text-slate-400 uppercase font-mono block">Submissions</span>
              <span className="text-xl font-bold text-purple-600 font-mono tabular-nums">
                {reports.length} report{reports.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">GPS Attendance History</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{attendance.length} records</span>
        </div>

        {attendance.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No attendance records recorded for this student yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px] font-mono">
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Clock In (Time & GPS)</th>
                  <th className="py-2.5 font-semibold">Clock Out (Time & GPS)</th>
                  <th className="py-2.5 font-semibold">Device / IP</th>
                  <th className="py-2.5 font-semibold">Duration</th>
                  <th className="py-2.5 font-semibold text-right">Map Pin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((rec) => {
                  const inLat = rec.clock_in_lat || rec.latitude;
                  const inLng = rec.clock_in_lng || rec.longitude;
                  const inAcc = rec.clock_in_accuracy || rec.accuracy_meters;
                  const inTime = rec.clock_in_time || rec.server_timestamp;
                  const isOut = rec.status === 'clocked_out';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Clocked In
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="font-mono text-slate-800 font-semibold tabular-nums">
                          {new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(inTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {inLat.toFixed(5)}, {inLng.toFixed(5)} (±{Math.round(inAcc)}m)
                        </div>
                      </td>
                      <td className="py-3">
                        {isOut && rec.clock_out_time ? (
                          <>
                            <div className="font-mono text-slate-800 font-semibold tabular-nums">
                              {new Date(rec.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(rec.clock_out_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {(rec.clock_out_lat ?? inLat).toFixed(5)}, {(rec.clock_out_lng ?? inLng).toFixed(5)} (±{Math.round(rec.clock_out_accuracy ?? inAcc)}m)
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-700 italic text-[11px]">In progress</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="text-[11px] font-semibold text-slate-700">
                          {rec.clock_in_device_label || 'Unknown device'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {rec.clock_in_ip || '—'}
                        </div>
                        {rec.clock_out_ip && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            out: {rec.clock_out_ip}
                          </div>
                        )}
                      </td>
                      <td className="py-3 font-mono font-semibold text-slate-700">
                        {rec.duration_minutes ? `${Math.floor(rec.duration_minutes / 60)}h ${rec.duration_minutes % 60}m` : 'Ongoing'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() =>
                            setMapModal({
                              isOpen: true,
                              title: `Attendance GPS: ${student.name}`,
                              subtitle: `Clock-In on ${new Date(inTime).toLocaleString()}`,
                              lat: inLat,
                              lng: inLng,
                              acc: inAcc,
                              time: inTime,
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

      {/* Report Submissions History Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Submitted Coursework Reports</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{reports.length} submissions</span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No coursework reports submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{report.title}</h3>
                    {report.description && (
                      <p className="text-xs text-slate-600 mt-1">{report.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
                    {new Date(report.submitted_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* Telemetry info */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                  <span className="font-mono">
                    Report GPS: {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)} (±
                    {Math.round(report.accuracy_meters)}m)
                  </span>
                  <span>·</span>
                  <button
                    onClick={() =>
                      setMapModal({
                        isOpen: true,
                        title: `Report Location: ${report.title}`,
                        subtitle: `Submitted by ${student.name}`,
                        lat: report.latitude,
                        lng: report.longitude,
                        acc: report.accuracy_meters,
                        time: report.submitted_at,
                      })
                    }
                    className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" /> Map
                  </button>
                  <span>·</span>
                  <span className="text-emerald-700 font-semibold">
                    Linked Attendance: {report.attendance_record_id}
                  </span>
                </div>

                {/* Submission Origin */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700"
                    title={report.submitted_user_agent || undefined}
                  >
                    <MonitorSmartphone className="w-3.5 h-3.5 text-slate-500" />
                    {report.submitted_device_label || 'Origin not recorded'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-500 bg-white border border-slate-200 rounded-md px-2 py-1">
                    <Network className="w-3 h-3" />
                    {report.submitted_ip || 'IP not recorded'}
                  </span>
                  {report.submitted_device_id && (
                    <span
                      className="font-mono text-slate-400 truncate max-w-[220px]"
                      title={report.submitted_device_id}
                    >
                      ID: {report.submitted_device_id}
                    </span>
                  )}
                </div>

                {/* Attachments */}
                <div className="mt-3 pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Attached Files ({report.attachments.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {report.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                      >
                        <span className="font-medium text-slate-800 truncate max-w-[200px]">
                          {att.original_name}
                        </span>
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                          <button
                            onClick={() =>
                              setPreviewModal({
                                isOpen: true,
                                reportId: report.id,
                                attachment: att,
                                reportTitle: report.title,
                              })
                            }
                            className="p-1 text-slate-500 hover:text-blue-600 rounded-md transition-colors"
                            title="Preview In-App"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={api.getAttachmentDownloadUrl(report.id, att.id)}
                            download={att.original_name}
                            className="p-1 text-slate-500 hover:text-emerald-600 rounded-md transition-colors"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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

      {/* Preview Modal */}
      {previewModal && (
        <DocumentPreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal(null)}
          reportId={previewModal.reportId}
          attachment={previewModal.attachment}
          reportTitle={previewModal.reportTitle}
        />
      )}
    </div>
  );
};
