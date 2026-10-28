import React, { useState, useEffect } from 'react';
import { CalendarCheck2, MapPin, Loader2, Clock } from 'lucide-react';
import { api } from '../../services/api.ts';
import { AttendanceRecord } from '../../types/index.ts';
import { MapViewModal } from '../common/MapViewModal.tsx';
import { MonthYearFilter } from '../common/MonthYearFilter.tsx';
import { isInMonthYear, monthYearLabel } from '../../utils/datetime.ts';

export const MyAttendanceView: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMapRecord, setSelectedMapRecord] = useState<{
    title: string;
    subtitle: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    api.getAttendanceRecords()
      .then((recs) => {
        setRecords(recs);
      })
      .catch((err) => console.error('Failed to load attendance logs:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((rec) =>
    isInMonthYear(rec.clock_in_time || rec.server_timestamp, selectedMonth, selectedYear)
  );

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
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <CalendarCheck2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
                My Attendance Logs
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Personal history of your GPS-recorded Clock-In, Clock-Out times, and submitted reports.
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl inline-block">
            {filtered.length} Attendance Record{filtered.length !== 1 ? 's' : ''}
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

      {/* Records Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading attendance history...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <CalendarCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-semibold text-slate-800 text-sm">
              {records.length === 0 ? 'No Attendance Records Yet' : 'No Records in This Period'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {records.length === 0
                ? 'Clock in with GPS when starting your supervised work duty.'
                : 'Try selecting a different month or year.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-mono">
                  <th className="py-3 px-6 font-semibold">Attendance Date</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Clock In (GPS & Time)</th>
                  <th className="py-3 px-6 font-semibold">Clock Out (GPS & Time)</th>
                  <th className="py-3 px-6 font-semibold">Duration</th>
                  <th className="py-3 px-6 font-semibold text-right">Map Pin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rec) => {
                  const inLat = rec.clock_in_lat || rec.latitude;
                  const inLng = rec.clock_in_lng || rec.longitude;
                  const inAcc = rec.clock_in_accuracy || rec.accuracy_meters;
                  const inTime = rec.clock_in_time || rec.server_timestamp;
                  const isOut = rec.status === 'clocked_out';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-900 text-xs">
                          {new Date(inTime).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-slate-400">Daily Attendance</div>
                      </td>

                      <td className="py-3.5 px-6">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Completed
                          </span>
                        ) : rec.status === 'forgot_clock_out' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Forgot to Clock Out
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-max">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                            Clocked In
                          </span>
                        )}
                      </td>

                      {/* Clock In */}
                      <td className="py-3.5 px-6">
                        <div className="font-mono text-slate-900 font-semibold tabular-nums">
                          {new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(inTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {inLat.toFixed(5)}, {inLng.toFixed(5)} (±{Math.round(inAcc)}m)
                        </div>
                      </td>

                      {/* Clock Out */}
                      <td className="py-3.5 px-6">
                        {isOut && rec.clock_out_time ? (
                          <>
                            <div className="font-mono text-slate-900 font-semibold tabular-nums">
                              {new Date(rec.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(rec.clock_out_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {(rec.clock_out_lat ?? inLat).toFixed(5)}, {(rec.clock_out_lng ?? inLng).toFixed(5)} (±{Math.round(rec.clock_out_accuracy ?? inAcc)}m)
                            </div>
                          </>
                        ) : (
                          <span className="text-amber-700 font-medium italic text-[11px] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Active (Not Clocked Out)
                          </span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-6 font-mono font-semibold text-slate-700">
                        {formatDuration(rec.duration_minutes) || 'Ongoing'}
                      </td>

                      {/* Map Inspection */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <button
                            onClick={() =>
                              setSelectedMapRecord({
                                title: 'Verified Clock-In Location',
                                subtitle: `Clock-In logged at ${new Date(inTime).toLocaleString()}`,
                                latitude: inLat,
                                longitude: inLng,
                                accuracyMeters: inAcc,
                                timestamp: inTime,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Clock-In
                          </button>
                          {isOut && rec.clock_out_lat != null && rec.clock_out_lng != null && (
                            <button
                              onClick={() =>
                                setSelectedMapRecord({
                                  title: 'Verified Clock-Out Location',
                                  subtitle: `Clock-Out logged at ${new Date(
                                    rec.clock_out_time || ''
                                  ).toLocaleString()}`,
                                  latitude: rec.clock_out_lat!,
                                  longitude: rec.clock_out_lng!,
                                  accuracyMeters: rec.clock_out_accuracy ?? inAcc,
                                  timestamp: rec.clock_out_time || inTime,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Clock-Out
                            </button>
                          )}
                        </div>
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
