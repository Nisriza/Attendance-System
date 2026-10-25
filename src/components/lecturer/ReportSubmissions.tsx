import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Download,

  MapPin,
  CalendarCheck2,
  Loader2,
  MonitorSmartphone,
  Network,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ReportSubmission, ReportAttachment, User, AttendanceRecord } from '../../types/index.ts';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal.tsx';
import { MonthYearFilter } from '../common/MonthYearFilter.tsx';
import { isInMonthYear, monthYearLabel } from '../../utils/datetime.ts';
import { buildSubmissionAudit } from '../../utils/audit.ts';
import { useToast } from '../common/Toast.tsx';

export const ReportSubmissions: React.FC = () => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (reportId: string, att: ReportAttachment) => {
    if (downloadingId) return;
    setDownloadingId(att.id);
    try {
      await api.downloadAttachment(reportId, att.id, att.original_name);
    } catch (err: any) {
      showToast(err.message || 'Download failed. Please try again.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [mapReport, setMapReport] = useState<ReportSubmission | null>(null);
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    reportId: string;
    attachment: ReportAttachment;
    reportTitle: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([api.getReports(), api.getApprovedStudents(), api.getAttendanceRecords()])
      .then(([reps, studs, recs]) => {
        setReports(reps);
        setStudents(studs);
        setAttendance(recs);
      })
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setLoading(false));
  }, []);

  const audit = useMemo(
    () => buildSubmissionAudit(attendance, reports),
    [attendance, reports]
  );

  const periodReports = reports.filter((rep) =>
    isInMonthYear(rep.submitted_at, selectedMonth, selectedYear)
  );

  const filtered = periodReports.filter((rep) => {
    if (selectedStudentId !== 'all' && rep.student_id !== selectedStudentId) return false;
    if (flaggedOnly && !audit.reportFlags.has(rep.id)) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = rep.title.toLowerCase().includes(q);
      const matchName = rep.student_name.toLowerCase().includes(q);
      if (!matchTitle && !matchName) return false;
    }
    return true;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Coursework & Report Submissions
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Submitted student reports verified against mandatory attendance records with submission GPS evidence.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl inline-block">
            {periodReports.length} Total Submission{periodReports.length !== 1 ? 's' : ''}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {monthYearLabel(selectedMonth, selectedYear)} · Showing {filtered.length}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search report title or student name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">All Students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto sm:min-w-72">
          <MonthYearFilter
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </div>

        <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none sm:self-start">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="accent-rose-600"
          />
          Flagged only
        </label>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading report submissions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">No Reports Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {reports.length === 0
                ? 'Submitted coursework will appear here once students upload them.'
                : flaggedOnly
                  ? 'No shared-device or shared-IP report submissions in this period.'
                  : 'Try changing the selected month, year, or other filters.'}
            </p>
          </div>
        ) : (
          filtered.map((rep) => {
            const flags = audit.reportFlags.get(rep.id);
            const peerNames = flags
              ? [...new Set([...flags.devicePeers, ...flags.ipPeers])]
              : [];

            return (
            <div
              key={rep.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-blue-200 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-base">{rep.title}</span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                      v{rep.version}
                    </span>
                  </div>

                  {rep.description && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {rep.description}
                    </p>
                  )}

                  {/* Student & Attendance Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <span className="font-semibold text-slate-800">{rep.student_name}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      Attendance Link: {rep.attendance_record_id}
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums text-slate-500">
                      Submitted:{' '}
                      {new Date(rep.submitted_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Submission Origin */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700"
                      title={rep.submitted_user_agent || undefined}
                    >
                      <MonitorSmartphone className="w-3.5 h-3.5 text-slate-500" />
                      {rep.submitted_device_label || 'Origin not recorded'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                      <Network className="w-3 h-3" />
                      {rep.submitted_ip || 'IP not recorded'}
                    </span>
                    {rep.submitted_device_id && (
                      <span
                        className="font-mono text-slate-400 truncate max-w-[220px]"
                        title={rep.submitted_device_id}
                      >
                        ID: {rep.submitted_device_id}
                      </span>
                    )}
                  </div>

                  {flags && (
                    <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 flex flex-wrap items-center gap-2 text-[11px]">
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
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                          title="Same device and same IP used by another student on the same day"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          Same device + IP
                        </span>
                      )}
                      {peerNames.length > 0 && (
                        <span className="font-semibold text-rose-800">
                          Also: {peerNames.join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* GPS Telemetry Bar */}
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-slate-500 font-mono">
                      Report GPS: {rep.latitude.toFixed(6)}, {rep.longitude.toFixed(6)} (±
                      {Math.round(rep.accuracy_meters)}m)
                    </span>
                    <button
                      onClick={() => setMapReport(rep)}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 ml-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      View GPS Location
                    </button>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Uploaded Attachments ({rep.attachments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {rep.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 block truncate">
                          {att.original_name}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {formatBytes(att.file_size)} · {att.mime_type.split('/')[1] || 'doc'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownload(rep.id, att)}
                          disabled={downloadingId === att.id}
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors shadow-2xs disabled:opacity-60"
                          title="Download original file"
                        >
                          {downloadingId === att.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Map Modal */}
      {mapReport && (
        <MapViewModal
          isOpen={!!mapReport}
          onClose={() => setMapReport(null)}
          title={`Report Submission: ${mapReport.title}`}
          subtitle={`Author: ${mapReport.student_name}`}
          latitude={mapReport.latitude}
          longitude={mapReport.longitude}
          accuracyMeters={mapReport.accuracy_meters}
          timestamp={mapReport.submitted_at}
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
