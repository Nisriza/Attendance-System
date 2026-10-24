import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, MonitorSmartphone, Network } from 'lucide-react';
import { api } from '../../services/api.ts';
import { AttendanceRecord, ReportSubmission } from '../../types/index.ts';
import { buildSubmissionAudit, SOURCE_LABELS, SubmissionSource } from '../../utils/audit.ts';

function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface DeviceDayEntry {
  deviceId: string;
  label: string;
  students: string[];
  eventCount: number;
  sources: SubmissionSource[];
  ips: string[];
}

interface IpDayEntry {
  ip: string;
  devices: string[];
  students: string[];
  eventCount: number;
  sources: SubmissionSource[];
}

interface DayGroup<T> {
  day: string;
  entries: T[];
}

export const DeviceAudit: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [reports, setReports] = useState<ReportSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAttendanceRecords(), api.getReports()])
      .then(([recs, reps]) => {
        setRecords(recs);
        setReports(reps);
      })
      .catch((err) => console.error('Failed to load data for device audit:', err))
      .finally(() => setLoading(false));
  }, []);

  const audit = useMemo(
    () => buildSubmissionAudit(records, reports),
    [records, reports]
  );

  const deviceDays = useMemo<DayGroup<DeviceDayEntry>[]>(() => {
    const byDay = new Map<
      string,
      Map<
        string,
        {
          label: string;
          students: Map<string, string>;
          eventCount: number;
          sources: Set<SubmissionSource>;
          ips: Set<string>;
        }
      >
    >();

    audit.events.forEach((event) => {
      if (!event.deviceId) return;
      const dayMap = byDay.get(event.day) || new Map();
      const existing = dayMap.get(event.deviceId) || {
        label: event.deviceLabel || 'Unknown device',
        students: new Map<string, string>(),
        eventCount: 0,
        sources: new Set<SubmissionSource>(),
        ips: new Set<string>(),
      };
      existing.students.set(event.studentId, event.studentName);
      existing.eventCount += 1;
      existing.sources.add(event.source);
      if (event.ip) existing.ips.add(event.ip);
      if (event.deviceLabel) existing.label = event.deviceLabel;
      dayMap.set(event.deviceId, existing);
      byDay.set(event.day, dayMap);
    });

    return [...byDay.entries()]
      .map(([day, devices]) => ({
        day,
        entries: [...devices.entries()]
          .map(([deviceId, d]) => ({
            deviceId,
            label: d.label,
            students: [...d.students.values()].sort((a, b) => a.localeCompare(b)),
            eventCount: d.eventCount,
            sources: (['clock_in', 'clock_out', 'report'] as SubmissionSource[]).filter((s) =>
              d.sources.has(s)
            ),
            ips: [...d.ips].sort(),
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [audit]);

  const ipDays = useMemo<DayGroup<IpDayEntry>[]>(() => {
    const byDay = new Map<
      string,
      Map<
        string,
        {
          devices: Set<string>;
          students: Map<string, string>;
          eventCount: number;
          sources: Set<SubmissionSource>;
        }
      >
    >();

    audit.events.forEach((event) => {
      if (!event.ip) return;
      const dayMap = byDay.get(event.day) || new Map();
      const existing = dayMap.get(event.ip) || {
        devices: new Set<string>(),
        students: new Map<string, string>(),
        eventCount: 0,
        sources: new Set<SubmissionSource>(),
      };
      if (event.deviceLabel) existing.devices.add(event.deviceLabel);
      existing.students.set(event.studentId, event.studentName);
      existing.eventCount += 1;
      existing.sources.add(event.source);
      dayMap.set(event.ip, existing);
      byDay.set(event.day, dayMap);
    });

    return [...byDay.entries()]
      .map(([day, ips]) => ({
        day,
        entries: [...ips.entries()]
          .map(([ip, d]) => ({
            ip,
            devices: [...d.devices].sort((a, b) => a.localeCompare(b)),
            students: [...d.students.values()].sort((a, b) => a.localeCompare(b)),
            eventCount: d.eventCount,
            sources: (['clock_in', 'clock_out', 'report'] as SubmissionSource[]).filter((s) =>
              d.sources.has(s)
            ),
          }))
          .sort((a, b) => a.ip.localeCompare(b.ip)),
      }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [audit]);

  const totalDevices = useMemo(
    () => new Set(audit.events.map((e) => e.deviceId).filter(Boolean)).size,
    [audit]
  );
  const totalIps = useMemo(
    () => new Set(audit.events.map((e) => e.ip).filter(Boolean)).size,
    [audit]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs shrink-0">
              <MonitorSmartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Device & IP Audit
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Device inventory and IP addresses recorded from clock-ins, clock-outs, and reports,
                organized by date.
              </p>
            </div>
          </div>
        </div>
        <div className="text-[11px] sm:text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {totalDevices} device{totalDevices !== 1 ? 's' : ''} · {totalIps} IP
          {totalIps !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-10 sm:p-12 rounded-2xl sm:rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Analyzing clock-ins, clock-outs, and reports...</span>
        </div>
      ) : (
        <>
          {/* DEVICE INVENTORY */}
          <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MonitorSmartphone className="w-4 h-4 text-blue-600" />
                Device Inventory
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All devices recorded, grouped by the date they were used.
              </p>
            </div>
            {deviceDays.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs text-slate-400">
                No device data recorded yet. New submissions will start populating this list.
              </div>
            ) : (
              deviceDays.map((group) => (
                <div key={group.day}>
                  <div className="px-4 sm:px-6 py-2 bg-slate-50 border-y border-slate-100 text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {formatDay(group.day)}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.entries.map((device) => (
                      <div
                        key={`${group.day}-${device.deviceId}`}
                        className="px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 break-words">
                            {device.label}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 break-all">
                            {device.deviceId}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 sm:text-right shrink-0 leading-relaxed">
                          <span className="block sm:inline">
                            {device.students.length} student
                            {device.students.length !== 1 ? 's' : ''} · {device.eventCount} event
                            {device.eventCount !== 1 ? 's' : ''}
                          </span>
                          <span className="block text-slate-400 break-words">
                            {device.students.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* DEVICE IP */}
          <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Network className="w-4 h-4 text-violet-600" />
                Device IP
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                IP addresses recorded, grouped by the date they were used.
              </p>
            </div>
            {ipDays.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs text-slate-400">
                No IP data recorded yet. New submissions will start populating this list.
              </div>
            ) : (
              ipDays.map((group) => (
                <div key={group.day}>
                  <div className="px-4 sm:px-6 py-2 bg-slate-50 border-y border-slate-100 text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {formatDay(group.day)}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.entries.map((entry) => (
                      <div
                        key={`${group.day}-${entry.ip}`}
                        className="px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-slate-800 break-all">
                            {entry.ip}
                          </div>
                          {entry.devices.length > 0 && (
                            <div className="text-[11px] text-slate-400 mt-0.5 break-words">
                              {entry.devices.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 sm:text-right shrink-0 leading-relaxed">
                          <span className="block sm:inline">
                            {entry.students.length} student
                            {entry.students.length !== 1 ? 's' : ''} · {entry.eventCount} event
                            {entry.eventCount !== 1 ? 's' : ''} ·{' '}
                            {entry.sources.map((s) => SOURCE_LABELS[s]).join(' · ')}
                          </span>
                          <span className="block text-slate-400 break-words">
                            {entry.students.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
};
