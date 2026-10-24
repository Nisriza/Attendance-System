import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  FileUp,
  ShieldCheck,
  Crosshair,
  ArrowRight,
  CalendarCheck2,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AttendanceRecord } from '../../types/index.ts';
import { useToast } from '../common/Toast.tsx';
import { LocationMap, LocationMapPin } from '../common/LocationMap.tsx';
import { getDeviceId } from '../../utils/device.ts';
import { attendanceDayKey } from '../../utils/datetime.ts';

interface MarkAttendanceViewProps {
  onSuccessNavigateToReport?: () => void;
  showPostReportNote?: boolean;
  onDismissPostReportNote?: () => void;
}

function geoErrorMessage(geoErr: GeolocationPositionError): string {
  if (geoErr.code === geoErr.PERMISSION_DENIED) {
    return 'Location permission was denied. Please allow location access in your browser settings.';
  }
  if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
    return 'Location information is unavailable on this device.';
  }
  if (geoErr.code === geoErr.TIMEOUT) {
    return 'Location request timed out. Please retry.';
  }
  return 'Could not obtain your GPS location.';
}

export const MarkAttendanceView: React.FC<MarkAttendanceViewProps> = ({
  onSuccessNavigateToReport,
  showPostReportNote,
  onDismissPostReportNote,
}) => {
  const { showToast } = useToast();

  const [activeRecord, setActiveRecord] = useState<AttendanceRecord | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [livePosition, setLivePosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadAttendanceState = async () => {
    try {
      const data = await api.getActiveClockIn();
      setActiveRecord(data.activeRecord);
      setTodayRecord(data.todayRecord);
    } catch (err: any) {
      console.error('Failed to load attendance state:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (geoErr) => reject(new Error(geoErrorMessage(geoErr))), {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });

  const requestLocation = async (): Promise<GeolocationPosition> => {
    setLocating(true);
    setLocationError(null);
    try {
      const position = await getPosition();
      setLivePosition({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      return position;
    } catch (err: any) {
      setLocationError(err.message || 'Could not obtain your GPS location.');
      throw err;
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    loadAttendanceState();
    requestLocation().catch(() => {});

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    if (!activeRecord || activeRecord.status !== 'clocked_in') return;

    const startMs = new Date(activeRecord.clock_in_time).getTime();
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activeRecord]);

  useEffect(() => {
    setDeclarationAccepted(false);
  }, [activeRecord?.id]);

  const formatElapsed = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleClockIn = async () => {
    setError(null);
    setClockingIn(true);
    try {
      const position = await requestLocation();
      const { latitude, longitude, accuracy } = position.coords;
      const res = await api.clockIn({
        latitude,
        longitude,
        accuracy_meters: accuracy,
        device_id: getDeviceId(),
      });
      showToast(res.message || 'Clocked in successfully!', 'success');
      await loadAttendanceState();
    } catch (err: any) {
      setError(err.message || 'Failed to clock in.');
      // Refresh state so a rejected duplicate immediately locks the UI
      await loadAttendanceState();
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeRecord) return;

    if (!activeRecord.report_submitted) {
      setError('Report Required: submit your report before clocking out.');
      showToast('Report required before you can clock out', 'error');
      return;
    }

    if (!declarationAccepted) {
      setError('Please accept the clock-out declaration first.');
      showToast('Please accept the clock-out declaration first', 'error');
      return;
    }

    setError(null);
    setClockingOut(true);
    try {
      const position = await requestLocation();
      const { latitude, longitude, accuracy } = position.coords;
      const res = await api.clockOut({
        latitude,
        longitude,
        accuracy_meters: accuracy,
        device_id: getDeviceId(),
      });
      showToast(res.message || 'Clocked out successfully!', 'success');
      await loadAttendanceState();
    } catch (err: any) {
      setError(err.message || 'Failed to clock out.');
    } finally {
      setClockingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading attendance status...</span>
      </div>
    );
  }

  const isClockedIn = activeRecord?.status === 'clocked_in';
  const isCompleted = !isClockedIn && !!todayRecord && todayRecord.status === 'clocked_out';
  const record = activeRecord || todayRecord;

  const pins: LocationMapPin[] = [];
  if (record) {
    pins.push({
      latitude: record.clock_in_lat || record.latitude,
      longitude: record.clock_in_lng || record.longitude,
      accuracy: record.clock_in_accuracy || record.accuracy_meters,
      label: 'Clock-in location',
      type: 'clock-in',
      timestamp: record.clock_in_time,
    });
    if (record.clock_out_time && record.clock_out_lat != null && record.clock_out_lng != null) {
      pins.push({
        latitude: record.clock_out_lat,
        longitude: record.clock_out_lng,
        accuracy: record.clock_out_accuracy,
        label: 'Clock-out location',
        type: 'clock-out',
        timestamp: record.clock_out_time,
      });
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${
              isClockedIn ? 'text-emerald-700' : isCompleted ? 'text-blue-700' : 'text-slate-500'
            }`}
          >
            {isClockedIn ? 'Attendance in progress' : isCompleted ? 'Attendance complete' : 'Ready to clock in'}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 font-['Plus_Jakarta_Sans',sans-serif]">
            Clock In & Out
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            One attendance session per day · {attendanceDayKey()}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3 text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">
            <Clock className="w-3.5 h-3.5" /> Live Clock
          </div>
          <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">{currentTime}</div>
          <div className="text-[11px] text-slate-400">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      <LocationMap
        livePosition={livePosition}
        pins={pins}
        locating={locating}
        locationError={locationError}
        onLocate={() => requestLocation().catch(() => {})}
      />

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {isClockedIn ? (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Currently clocked in
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Started{' '}
                  {new Date(activeRecord!.clock_in_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-blue-600 uppercase font-bold block">
                  Elapsed
                </span>
                <span className="font-mono text-2xl font-extrabold text-[#173B70] tracking-tight">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
            </div>

            {activeRecord!.report_submitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <span className="font-bold block">Report submitted</span>
                  <span className="text-emerald-800">You can now clock out.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="block">Report required</strong>
                    Submit your report to unlock clock-out.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onSuccessNavigateToReport?.()}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  <FileUp className="w-3.5 h-3.5" /> Submit report
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {activeRecord!.report_submitted && (
              <label className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-[11px] text-slate-700 leading-relaxed">
                  I confirm that I am physically present at my work location and not using GPS spoofing
                  applications. I understand that false location reporting may result in forfeiture of
                  attendance for that day.
                </span>
              </label>
            )}

            <button
              type="button"
              onClick={handleClockOut}
              disabled={!activeRecord!.report_submitted || !declarationAccepted || clockingOut}
              className={`w-full py-4 px-6 rounded-2xl text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
                activeRecord!.report_submitted && declarationAccepted
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              {clockingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording clock-out...
                </>
              ) : activeRecord!.report_submitted && declarationAccepted ? (
                <>
                  <Unlock className="w-4 h-4" />
                  Clock Out
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Clock Out Locked
                </>
              )}
            </button>
          </div>
        ) : isCompleted ? (
          <div className="space-y-4">
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
              <CalendarCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-950">Attendance completed for today</h3>
                <p className="text-xs text-emerald-800 mt-1">
                  Clocked in at{' '}
                  {new Date(todayRecord!.clock_in_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {todayRecord!.clock_out_time &&
                    ` and clocked out at ${new Date(todayRecord!.clock_out_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                  . You can clock in again tomorrow.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Clock-in accuracy</span>
                <span className="font-semibold text-slate-900">
                  ±{Math.round(todayRecord!.clock_in_accuracy || todayRecord!.accuracy_meters)}m
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Duration</span>
                <span className="font-semibold text-slate-900">
                  {typeof todayRecord!.duration_minutes === 'number'
                    ? `${Math.floor(todayRecord!.duration_minutes / 60)}h ${
                        todayRecord!.duration_minutes % 60
                      }m`
                    : '—'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Daily limit</span>
                <span className="font-semibold text-emerald-700">Completed</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
              <Crosshair className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">
                Your GPS coordinates and server timestamp are recorded when you clock in. You must
                submit a report before you can clock out.
              </span>
            </div>

            <button
              type="button"
              onClick={handleClockIn}
              disabled={clockingIn || locating}
              className="w-full py-5 px-6 rounded-2xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2.5 disabled:opacity-60"
            >
              {clockingIn || locating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {clockingIn ? 'Recording clock-in...' : 'Getting your location...'}
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-blue-200" />
                  Clock In
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Enable location services before clocking in.
            </p>
          </div>
        )}
      </div>

      {showPostReportNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Important clock-out notice</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
              Students not under auto-debit payment mode or claiming through Borang R9 must clock in
              and clock out within the UMS vicinity.
            </p>
            <button
              type="button"
              onClick={() => onDismissPostReportNote?.()}
              className="w-full py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
