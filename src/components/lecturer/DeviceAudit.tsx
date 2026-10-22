import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MonitorSmartphone,
  Network,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { AttendanceRecord, ReportSubmission } from '../../types/index.ts';
import { buildSubmissionAudit, SOURCE_LABELS } from '../../utils/audit.ts';

function sourceLabel(sources: string[]): string {
  return sources.map((source) => SOURCE_LABELS[source as keyof typeof SOURCE_LABELS]).join(' · ');
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

  const summary = [
    {
      label: 'Tracked submissions',
      value: audit.events.length,
      icon: MonitorSmartphone,
      tone: 'blue',
    },
    {
      label: 'Students flagged today',
      value: audit.todayFlaggedStudentIds.size,
      icon: AlertTriangle,
      tone: 'amber',
    },
    {
      label: 'Same-day shared device pairs',
      value: audit.sharedDevices.length,
      icon: Users,
      tone: 'rose',
    },
    {
      label: 'Same-day shared IP pairs',
      value: audit.sharedIps.length,
      icon: Network,
      tone: 'violet',
    },
  ] as const;

  const toneClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  };

  const noFlags =
    audit.sharedDevices.length === 0 &&
    audit.sharedIps.length === 0 &&
    audit.todayFlaggedStudentIds.size === 0;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
              <MonitorSmartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                Device & IP Audit
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Flags the same device or IP used by multiple students on the same attendance day.
                Multiple devices per student are allowed.
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
          {audit.devices.length} unique device{audit.devices.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs">Analyzing clock-ins, clock-outs, and reports...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs"
                >
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center ${toneClasses[item.tone]}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    {item.value}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.label}</div>
                </div>
              );
            })}
          </div>

          {noFlags ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No same-day sharing detected</h3>
              <p className="text-xs text-slate-500 mt-1">
                No device or IP has been used by more than one student on the same day.
              </p>
            </div>
          ) : null}

          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Today's flagged activity
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {audit.todayFlaggedEvents.length} event
                {audit.todayFlaggedEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
            {audit.todayFlaggedEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No shared-device or shared-IP activity today.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {audit.todayFlaggedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{event.studentName}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
                          {SOURCE_LABELS[event.source]}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(event.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {event.deviceLabel || 'Unknown device'}
                        {event.ip ? ` · ${event.ip}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5 self-start sm:self-center">
                      Same-day shared origin
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {audit.sharedPairs.length > 0 && (
            <section className="bg-white rounded-3xl border border-rose-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Same device + same IP
                </h2>
                <span className="text-[11px] font-mono text-rose-700">
                  {audit.sharedPairs.length}
                </span>
              </div>
              <div className="divide-y divide-rose-100">
                {audit.sharedPairs.map((group) => (
                  <div key={`${group.day}-${group.deviceId}-${group.ip}`} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">{group.deviceLabel}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                          {group.deviceId} · {group.ip}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5 shrink-0">
                        {group.day}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {group.students.map((student) => (
                        <span
                          key={student.id}
                          className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md"
                        >
                          {student.name}
                        </span>
                      ))}
                      <span className="text-[11px] text-slate-400 ml-1">
                        {group.eventCount} event{group.eventCount !== 1 ? 's' : ''} ·{' '}
                        {sourceLabel(group.sources)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {audit.sharedDevices.length > 0 && (
            <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-amber-600" />
                  Devices shared on the same day
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  {audit.sharedDevices.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {audit.sharedDevices.map((group) => (
                  <div key={`${group.day}-${group.deviceId}`} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">{group.label}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                          {group.deviceId}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 shrink-0">
                        {group.day}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {group.students.map((student) => (
                        <span
                          key={student.id}
                          className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md"
                        >
                          {student.name}
                        </span>
                      ))}
                      <span className="text-[11px] text-slate-400 ml-1">
                        {group.eventCount} event{group.eventCount !== 1 ? 's' : ''} ·{' '}
                        {sourceLabel(group.sources)}
                      </span>
                    </div>
                    {group.ips.length > 0 && (
                      <div className="text-[10px] font-mono text-slate-400 mt-2">
                        IPs: {group.ips.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {audit.sharedIps.length > 0 && (
            <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Network className="w-4 h-4 text-violet-600" />
                  IPs shared on the same day
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  {audit.sharedIps.length}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {audit.sharedIps.map((group) => (
                  <div key={`${group.day}-${group.ip}`} className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="font-mono text-xs font-bold text-slate-900">{group.ip}</div>
                      <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 shrink-0">
                        {group.day}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {group.students.map((student) => (
                        <span
                          key={student.id}
                          className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md"
                        >
                          {student.name}
                        </span>
                      ))}
                      <span className="text-[11px] text-slate-400 ml-1">
                        {group.eventCount} event{group.eventCount !== 1 ? 's' : ''} ·{' '}
                        {sourceLabel(group.sources)}
                      </span>
                    </div>
                    {group.devices.length > 0 && (
                      <div className="text-[10px] font-mono text-slate-400 mt-2 truncate">
                        Devices: {group.devices.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MonitorSmartphone className="w-4 h-4 text-blue-600" />
                Device inventory
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Informational only. A student using more than one device is not flagged.
              </p>
            </div>
            {audit.devices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No device data recorded yet. New submissions will start populating this audit.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {audit.devices.map((device) => (
                  <div
                    key={device.deviceId}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">{device.label}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {device.deviceId}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 shrink-0">
                      {device.students.length} student
                      {device.students.length !== 1 ? 's' : ''} · {device.eventCount} event
                      {device.eventCount !== 1 ? 's' : ''} · {device.ips.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
