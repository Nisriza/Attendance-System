import { AttendanceRecord, ReportSubmission } from '../types/index.ts';
import { attendanceDayKey } from './datetime.ts';

export type SubmissionSource = 'clock_in' | 'clock_out' | 'report';

export const SOURCE_LABELS: Record<SubmissionSource, string> = {
  clock_in: 'Clock-in',
  clock_out: 'Clock-out',
  report: 'Report',
};

export interface StudentRef {
  id: string;
  name: string;
}

export interface AuditEvent {
  id: string;
  source: SubmissionSource;
  studentId: string;
  studentName: string;
  day: string;
  timestamp: string;
  deviceId?: string;
  deviceLabel?: string;
  ip?: string;
  attendanceRecordId?: string;
  reportId?: string;
}

export interface SubmissionFlags {
  day: string;
  sharedDevice: boolean;
  sharedIp: boolean;
  sharedBoth: boolean;
  devicePeers: string[];
  ipPeers: string[];
}

export interface SharedDeviceGroup {
  day: string;
  deviceId: string;
  label: string;
  students: StudentRef[];
  eventCount: number;
  sources: SubmissionSource[];
  ips: string[];
}

export interface SharedIpGroup {
  day: string;
  ip: string;
  students: StudentRef[];
  eventCount: number;
  sources: SubmissionSource[];
  devices: string[];
}

export interface SharedPairGroup {
  day: string;
  deviceId: string;
  deviceLabel: string;
  ip: string;
  students: StudentRef[];
  eventCount: number;
  sources: SubmissionSource[];
}

export interface DeviceUsageSummary {
  deviceId: string;
  label: string;
  students: StudentRef[];
  eventCount: number;
  lastSeen: string;
  ips: string[];
}

export interface AuditResult {
  events: AuditEvent[];
  attendanceFlags: Map<string, SubmissionFlags>;
  reportFlags: Map<string, SubmissionFlags>;
  sharedDevices: SharedDeviceGroup[];
  sharedIps: SharedIpGroup[];
  sharedPairs: SharedPairGroup[];
  devices: DeviceUsageSummary[];
  todayFlaggedEvents: AuditEvent[];
  todayFlaggedStudentIds: Set<string>;
}

function normalizeDeviceId(value?: string): string | undefined {
  const trimmed = (value || '').trim().toLowerCase();
  return trimmed || undefined;
}

function normalizeIp(value?: string): string | undefined {
  const trimmed = (value || '').trim().toLowerCase();
  if (!trimmed || trimmed === 'unknown' || trimmed === '-') return undefined;
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

function addToMap(map: Map<string, Map<string, string>>, key: string, id: string, name: string) {
  const students = map.get(key) || new Map<string, string>();
  students.set(id, name);
  map.set(key, students);
}

function toStudentRefs(students: Map<string, string>): StudentRef[] {
  return [...students.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function uniqueSources(events: AuditEvent[]): SubmissionSource[] {
  const order: SubmissionSource[] = ['clock_in', 'clock_out', 'report'];
  const present = new Set(events.map((event) => event.source));
  return order.filter((source) => present.has(source));
}

function latestLabel(events: AuditEvent[], fallback = 'Unknown device'): string {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted.find((event) => event.deviceLabel)?.deviceLabel || fallback;
}

function peersFor(
  students: Map<string, string> | undefined,
  currentStudentId: string
): string[] {
  if (!students) return [];
  return [...students.entries()]
    .filter(([id]) => id !== currentStudentId)
    .map(([, name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

function mergeFlags(
  target: Map<string, SubmissionFlags>,
  key: string,
  incoming: SubmissionFlags
) {
  const existing = target.get(key);
  if (!existing) {
    target.set(key, { ...incoming });
    return;
  }
  target.set(key, {
    ...existing,
    sharedDevice: existing.sharedDevice || incoming.sharedDevice,
    sharedIp: existing.sharedIp || incoming.sharedIp,
    sharedBoth: existing.sharedBoth || incoming.sharedBoth,
    devicePeers: [...new Set([...existing.devicePeers, ...incoming.devicePeers])].sort(),
    ipPeers: [...new Set([...existing.ipPeers, ...incoming.ipPeers])].sort(),
  });
}

function buildEvents(
  attendance: AttendanceRecord[],
  reports: ReportSubmission[]
): AuditEvent[] {
  const events: AuditEvent[] = [];
  const attendanceDayById = new Map<string, string>();

  attendance.forEach((record) => {
    const day = attendanceDayKey(record.clock_in_time || record.server_timestamp);
    attendanceDayById.set(record.id, day);

    const inDevice = normalizeDeviceId(record.clock_in_device_id);
    const inIp = normalizeIp(record.clock_in_ip);
    if (record.clock_in_time && (inDevice || inIp)) {
      events.push({
        id: `clock_in:${record.id}`,
        source: 'clock_in',
        studentId: record.student_id,
        studentName: record.student_name,
        day,
        timestamp: record.clock_in_time || record.server_timestamp,
        deviceId: inDevice,
        deviceLabel: record.clock_in_device_label || 'Unknown device',
        ip: inIp,
        attendanceRecordId: record.id,
      });
    }

    const outDevice = normalizeDeviceId(record.clock_out_device_id);
    const outIp = normalizeIp(record.clock_out_ip);
    if (record.clock_out_time && (outDevice || outIp)) {
      events.push({
        id: `clock_out:${record.id}`,
        source: 'clock_out',
        studentId: record.student_id,
        studentName: record.student_name,
        day,
        timestamp: record.clock_out_time,
        deviceId: outDevice,
        deviceLabel: record.clock_out_device_label || 'Unknown device',
        ip: outIp,
        attendanceRecordId: record.id,
      });
    }
  });

  reports.forEach((report) => {
    const deviceId = normalizeDeviceId(report.submitted_device_id);
    const ip = normalizeIp(report.submitted_ip);
    if (!report.submitted_at || (!deviceId && !ip)) return;
    events.push({
      id: `report:${report.id}`,
      source: 'report',
      studentId: report.student_id,
      studentName: report.student_name,
      day:
        attendanceDayById.get(report.attendance_record_id) ||
        attendanceDayKey(report.submitted_at),
      timestamp: report.submitted_at,
      deviceId,
      deviceLabel: report.submitted_device_label || 'Unknown device',
      ip,
      reportId: report.id,
    });
  });

  return events;
}

export function buildSubmissionAudit(
  attendance: AttendanceRecord[],
  reports: ReportSubmission[],
  today: string = attendanceDayKey()
): AuditResult {
  const events = buildEvents(attendance, reports);
  const flagsByEventId = new Map<string, SubmissionFlags>();
  const attendanceFlags = new Map<string, SubmissionFlags>();
  const reportFlags = new Map<string, SubmissionFlags>();
  const sharedDevices: SharedDeviceGroup[] = [];
  const sharedIps: SharedIpGroup[] = [];
  const sharedPairs: SharedPairGroup[] = [];

  const eventsByDay = new Map<string, AuditEvent[]>();
  events.forEach((event) => {
    const list = eventsByDay.get(event.day) || [];
    list.push(event);
    eventsByDay.set(event.day, list);
  });

  eventsByDay.forEach((dayEvents, day) => {
    const deviceStudents = new Map<string, Map<string, string>>();
    const ipStudents = new Map<string, Map<string, string>>();
    const pairStudents = new Map<string, Map<string, string>>();

    dayEvents.forEach((event) => {
      if (event.deviceId) {
        addToMap(deviceStudents, event.deviceId, event.studentId, event.studentName);
        if (event.ip) {
          addToMap(
            pairStudents,
            `${event.deviceId}\u0000${event.ip}`,
            event.studentId,
            event.studentName
          );
        }
      }
      if (event.ip) {
        addToMap(ipStudents, event.ip, event.studentId, event.studentName);
      }
    });

    dayEvents.forEach((event) => {
      const deviceGroup = event.deviceId ? deviceStudents.get(event.deviceId) : undefined;
      const ipGroup = event.ip ? ipStudents.get(event.ip) : undefined;
      const pairGroup =
        event.deviceId && event.ip
          ? pairStudents.get(`${event.deviceId}\u0000${event.ip}`)
          : undefined;

      const sharedDevice = (deviceGroup?.size || 0) > 1;
      const sharedIp = (ipGroup?.size || 0) > 1;
      if (!sharedDevice && !sharedIp) return;

      const flags: SubmissionFlags = {
        day,
        sharedDevice,
        sharedIp,
        sharedBoth: (pairGroup?.size || 0) > 1,
        devicePeers: sharedDevice ? peersFor(deviceGroup, event.studentId) : [],
        ipPeers: sharedIp ? peersFor(ipGroup, event.studentId) : [],
      };

      flagsByEventId.set(event.id, flags);
      if (event.attendanceRecordId) {
        mergeFlags(attendanceFlags, event.attendanceRecordId, flags);
      }
      if (event.reportId) {
        mergeFlags(reportFlags, event.reportId, flags);
      }
    });

    deviceStudents.forEach((students, deviceId) => {
      if (students.size < 2) return;
      const deviceEvents = dayEvents.filter((event) => event.deviceId === deviceId);
      sharedDevices.push({
        day,
        deviceId,
        label: latestLabel(deviceEvents),
        students: toStudentRefs(students),
        eventCount: deviceEvents.length,
        sources: uniqueSources(deviceEvents),
        ips: [...new Set(deviceEvents.map((event) => event.ip).filter((ip): ip is string => !!ip))],
      });
    });

    ipStudents.forEach((students, ip) => {
      if (students.size < 2) return;
      const ipEvents = dayEvents.filter((event) => event.ip === ip);
      sharedIps.push({
        day,
        ip,
        students: toStudentRefs(students),
        eventCount: ipEvents.length,
        sources: uniqueSources(ipEvents),
        devices: [
          ...new Set(
            ipEvents.map((event) => event.deviceId).filter((id): id is string => !!id)
          ),
        ],
      });
    });

    pairStudents.forEach((students, key) => {
      if (students.size < 2) return;
      const [deviceId, ip] = key.split('\u0000');
      const pairEvents = dayEvents.filter(
        (event) => event.deviceId === deviceId && event.ip === ip
      );
      sharedPairs.push({
        day,
        deviceId,
        deviceLabel: latestLabel(pairEvents),
        ip,
        students: toStudentRefs(students),
        eventCount: pairEvents.length,
        sources: uniqueSources(pairEvents),
      });
    });
  });

  sharedDevices.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      b.students.length - a.students.length ||
      a.label.localeCompare(b.label)
  );
  sharedIps.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      b.students.length - a.students.length ||
      a.ip.localeCompare(b.ip)
  );
  sharedPairs.sort(
    (a, b) =>
      b.day.localeCompare(a.day) ||
      b.students.length - a.students.length ||
      a.deviceLabel.localeCompare(b.deviceLabel)
  );

  const deviceAggregate = new Map<
    string,
    {
      label: string;
      students: Map<string, string>;
      eventCount: number;
      lastSeen: string;
      ips: Set<string>;
    }
  >();

  events.forEach((event) => {
    if (!event.deviceId) return;
    const existing = deviceAggregate.get(event.deviceId);
    if (existing) {
      existing.students.set(event.studentId, event.studentName);
      existing.eventCount += 1;
      if (event.ip) existing.ips.add(event.ip);
      if (new Date(event.timestamp).getTime() > new Date(existing.lastSeen).getTime()) {
        existing.lastSeen = event.timestamp;
        existing.label = event.deviceLabel || existing.label;
      }
    } else {
      deviceAggregate.set(event.deviceId, {
        label: event.deviceLabel || 'Unknown device',
        students: new Map([[event.studentId, event.studentName]]),
        eventCount: 1,
        lastSeen: event.timestamp,
        ips: new Set(event.ip ? [event.ip] : []),
      });
    }
  });

  const devices: DeviceUsageSummary[] = [...deviceAggregate.entries()]
    .map(([deviceId, usage]) => ({
      deviceId,
      label: usage.label,
      students: toStudentRefs(usage.students),
      eventCount: usage.eventCount,
      lastSeen: usage.lastSeen,
      ips: [...usage.ips].sort(),
    }))
    .sort(
      (a, b) =>
        b.students.length - a.students.length || b.eventCount - a.eventCount
    );

  const todayFlaggedEvents = events.filter(
    (event) => event.day === today && flagsByEventId.has(event.id)
  );

  return {
    events,
    attendanceFlags,
    reportFlags,
    sharedDevices,
    sharedIps,
    sharedPairs,
    devices,
    todayFlaggedEvents,
    todayFlaggedStudentIds: new Set(todayFlaggedEvents.map((event) => event.studentId)),
  };
}
