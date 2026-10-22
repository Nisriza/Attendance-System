import React, { useState, useEffect } from 'react';
import {
  FileUp,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
  FileText,
  Loader2,
  MapPin,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Building,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AttendanceRecord } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../common/Toast.tsx';
import { getDeviceId } from '../../utils/device.ts';

interface SubmitReportViewProps {
  onReportSubmitted?: () => void;
  onNavigateToAttendance?: () => void;
  onNavigateToSubmissions?: () => void;
}

export const SubmitReportView: React.FC<SubmitReportViewProps> = ({
  onReportSubmitted,
  onNavigateToAttendance,
  onNavigateToSubmissions,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [supervisorName, setSupervisorName] = useState<string>('Academic Supervisor');
  const [supervisorDept, setSupervisorDept] = useState<string>('Faculty Department');
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<any | null>(null);

  const loadData = async () => {
    try {
      const [activeData, lecs] = await Promise.all([
        api.getActiveClockIn(),
        api.getLecturers(),
      ]);
      setActiveRecord(activeData.activeRecord);

      if (user?.lecturer_id) {
        const found = lecs.find((l) => l.id === user.lecturer_id);
        if (found) {
          setSupervisorName(found.name);
          if (found.department) setSupervisorDept(found.department);
        }
      } else if (lecs.length > 0) {
        setSupervisorName(lecs[0].name);
        if (lecs[0].department) setSupervisorDept(lecs[0].department);
      }
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected].slice(0, 5));
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a report title or task summary.');
      return;
    }
    if (files.length === 0) {
      setError('At least one report file attachment (e.g. JPG, PNG, PDF, Document) is required.');
      return;
    }

    if (!activeRecord) {
      setError('Clock-In Required: You must clock in and record your location before submitting your report.');
      return;
    }

    setError(null);
    setSubmitting(true);
    setSubmissionProgress('Acquiring submission GPS telemetry...');

    // Geolocation capture for report submission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          submitWithTelemetry(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        () => {
          // Fallback to active clock-in coordinates
          submitWithTelemetry(activeRecord.latitude, activeRecord.longitude, activeRecord.accuracy_meters);
        },
        { timeout: 8000 }
      );
    } else {
      submitWithTelemetry(activeRecord.latitude, activeRecord.longitude, activeRecord.accuracy_meters);
    }
  };

  const submitWithTelemetry = async (lat: number, lng: number, acc: number) => {
    try {
      setSubmissionProgress('Uploading attachments and registering report on server...');
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('latitude', lat.toString());
      formData.append('longitude', lng.toString());
      formData.append('accuracy_meters', acc.toString());
      formData.append('device_id', getDeviceId());

      files.forEach((f) => {
        formData.append('files', f);
      });

      const res = await api.submitReport(formData);
      showToast('Report verified and submitted successfully! Clock-Out is now unlocked.', 'success');
      setSuccessReport(res.report);
      // Reload active clock-in state
      await loadData();
      // Auto-navigate to clock-out with the mandatory notice
      if (onReportSubmitted) onReportSubmitted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
      setSubmissionProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Checking active clock-in status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
            <FileUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
              Submit Supervision Task Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your completed coursework, task progress, or updated document to fulfill your duty requirement and unlock Clock-Out.
            </p>
          </div>
        </div>
      </div>

      {/* Success View */}
      {successReport ? (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Report Submitted & Verified!</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your document has been stored and audited under {supervisorName}. Your Clock-Out is now unlocked.
            </p>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-left max-w-md mx-auto text-xs space-y-1.5">
            <div className="font-bold text-emerald-950">{successReport.title}</div>
            <div className="text-emerald-800">
              Submitted at: {new Date(successReport.submitted_at).toLocaleTimeString()} ·{' '}
              {successReport.attachments.length} attached file(s)
            </div>
            <div className="text-[11px] text-emerald-700 font-mono">
              Status: Verified for Clock-Out
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onNavigateToAttendance && (
              <button
                onClick={onNavigateToAttendance}
                className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-900/10 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Proceed to Clock Out Now
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {onNavigateToSubmissions && (
              <button
                onClick={onNavigateToSubmissions}
                className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                View in My Submissions
              </button>
            )}
          </div>
        </div>
      ) : !activeRecord ? (
        /* GATING: NOT CLOCKED IN */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-rose-900">Clock-In Required First</h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                Academic supervision policy requires that you Clock In and record your start location before submitting reports or task updates.
              </p>
            </div>
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl text-xs text-rose-700 leading-relaxed">
            Please navigate to the Clock In screen, register your start timestamp with GPS telemetry, work on your assigned task, and return here to upload your report.
          </div>

          {onNavigateToAttendance && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onNavigateToAttendance}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                <MapPin className="w-4 h-4" />
                Go to Clock In Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* FORM: STUDENT IS CLOCKED IN AND READY TO SUBMIT */
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          {/* Active Session Lockup */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Active Supervised Work Period Verified</span>
              <p className="text-emerald-800">
                Clocked in at {new Date(activeRecord.clock_in_time).toLocaleTimeString()} under supervisor{' '}
                <strong>{supervisorName}</strong>. Submitting this report will fulfill your duty requirement and unlock Clock-Out.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submissionProgress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-800">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span>{submissionProgress}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Report Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Task / Progress Report Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Daily Progress Update / Literature Review Draft / Code Benchmark"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                required
              />
            </div>

            {/* Description / Summary */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Summary of Work Performed (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe key milestones achieved, tasks completed, or notes for your supervisor..."
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 leading-relaxed"
              />
            </div>

            {/* File Upload Zone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Attach Report Files / Photos / Documents *
              </label>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="report-files"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="report-files"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-blue-600 hover:text-blue-700">
                    Click to select files or images from device
                  </span>
                  <span className="text-[11px] text-slate-400">
                    JPG, PNG, PDF, Word documents, text files up to 25MB each (Max 5 files)
                  </span>
                </label>
              </div>

              {/* Selected Files List */}
              {files.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800">{file.name}</span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting & Unlocking Clock-Out...
                  </>
                ) : (
                  <>
                    <FileUp className="w-4 h-4" />
                    Submit Report & Unlock Clock-Out
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
