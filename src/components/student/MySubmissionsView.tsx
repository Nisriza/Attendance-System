import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Eye,
  MapPin,
  CalendarCheck2,
  Trash2,
  Edit2,
  Clock,
  Loader2,
  AlertCircle,
  Check,
  FileText,
  History,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { ReportSubmission, ReportAttachment } from '../../types/index.ts';
import { useToast } from '../common/Toast.tsx';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { DocumentPreviewModal } from '../common/DocumentPreviewModal.tsx';
import { MonthYearFilter } from '../common/MonthYearFilter.tsx';
import { isInMonthYear, monthYearLabel } from '../../utils/datetime.ts';

export const MySubmissionsView: React.FC = () => {
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const { showToast } = useToast();
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

  // Modals
  const [mapReport, setMapReport] = useState<ReportSubmission | null>(null);
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    reportId: string;
    attachment: ReportAttachment;
    reportTitle: string;
  } | null>(null);

  // Edit State
  const [editingReport, setEditingReport] = useState<ReportSubmission | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirm State
  const [deletingReport, setDeletingReport] = useState<ReportSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Audit Trail Modal State
  const [auditReport, setAuditReport] = useState<ReportSubmission | null>(null);

  const loadReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport || !editTitle.trim()) return;
    setSavingEdit(true);
    try {
      const res = await api.updateReport(editingReport.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
      });
      showToast('Report updated. Audit trail version incremented.', 'success');
      setReports((prev) => prev.map((r) => (r.id === res.report.id ? res.report : r)));
      setEditingReport(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to update report', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingReport) return;
    setDeleting(true);
    try {
      const res = await api.deleteReport(deletingReport.id);
      showToast(res.message, 'info');
      setReports((prev) => prev.filter((r) => r.id !== deletingReport.id));
      setDeletingReport(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete report', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = reports.filter((rep) =>
    isInMonthYear(rep.submitted_at, selectedMonth, selectedYear)
  );

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
            <FileSpreadsheet className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              My Coursework Submissions
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track submitted reports, preview files, and inspect linked attendance verification records.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl inline-block">
            {filtered.length} Total Submission{filtered.length !== 1 ? 's' : ''}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {monthYearLabel(selectedMonth, selectedYear)}
          </div>
        </div>
      </div>

      {/* Month / Year Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="max-w-md">
          <MonthYearFilter
            month={selectedMonth}
            year={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
          />
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading your submissions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">
              {reports.length === 0 ? 'No Reports Submitted Yet' : 'No Submissions in This Period'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {reports.length === 0
                ? 'Clock in first to unlock coursework report submissions.'
                : 'Try selecting a different month or year.'}
            </p>
          </div>
        ) : (
          filtered.map((rep) => (
            <div
              key={rep.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-blue-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{rep.title}</h3>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                      v{rep.version}
                    </span>
                  </div>

                  {rep.description && (
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{rep.description}</p>
                  )}

                  {/* Metadata and Linked Attendance Bar */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      Linked Attendance: {rep.attendance_record_id}
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">
                      Submitted: {new Date(rep.submitted_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>·</span>
                    <button
                      onClick={() => setMapReport(rep)}
                      className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Submission GPS Pin
                    </button>
                    {rep.audit_trail && rep.audit_trail.length > 1 && (
                      <>
                        <span>·</span>
                        <button
                          onClick={() => setAuditReport(rep)}
                          className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1"
                        >
                          <History className="w-3.5 h-3.5" />
                          Audit Trail ({rep.audit_trail.length})
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit / Delete Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => {
                      setEditingReport(rep);
                      setEditTitle(rep.title);
                      setEditDesc(rep.description || '');
                    }}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200"
                    title="Edit Report Metadata"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingReport(rep)}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
                    title="Delete Report"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Attachments */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Uploaded Attachments ({rep.attachments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {rep.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 block truncate">
                          {att.original_name}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {formatBytes(att.file_size)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            setPreviewData({
                              isOpen: true,
                              reportId: rep.id,
                              attachment: att,
                              reportTitle: rep.title,
                            })
                          }
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors shadow-2xs"
                          title="Preview in-app"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          ))
        )}
      </div>

      {/* Edit Metadata Modal */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Edit Report Metadata</h3>
            <p className="text-xs text-slate-500 mt-1">
              Modifications are recorded in an audit trail to preserve academic submission integrity.
            </p>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes (v{editingReport.version + 1})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Delete Submitted Report?</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-800">"{deletingReport.title}"</span>?
            </p>
            <div className="p-2.5 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-[11px] sm:text-xs text-emerald-900 mt-3 leading-relaxed break-words">
              <strong>Notice:</strong> Your verified GPS attendance record{' '}
              <span className="font-mono font-semibold break-all">({deletingReport.attendance_record_id})</span> will remain intact in the system.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingReport(null)}
                className="w-1/2 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-1/2 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {auditReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Submission Audit Trail</h3>
              </div>
              <button onClick={() => setAuditReport(null)} className="text-slate-400 hover:text-slate-700 text-xs font-semibold">
                Close
              </button>
            </div>

            <div className="py-4 space-y-3 overflow-y-auto flex-1">
              {auditReport.audit_trail.map((entry, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-700 font-mono uppercase text-[11px]">{entry.action}</span>
                    <span className="font-mono text-slate-400 text-[11px] tabular-nums">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700">{entry.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {mapReport && (
        <MapViewModal
          isOpen={!!mapReport}
          onClose={() => setMapReport(null)}
          title={`Report Submission: ${mapReport.title}`}
          subtitle={`Submitted on ${new Date(mapReport.submitted_at).toLocaleString()}`}
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
