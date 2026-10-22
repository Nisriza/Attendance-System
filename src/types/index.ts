export type UserRole = 'lecturer' | 'student';
export type UserStatus = 'pending_approval' | 'approved' | 'rejected';
export type AttendanceStatus = 'clocked_in' | 'clocked_out';

export interface User {
  id: string;
  name: string;
  username?: string;
  role: UserRole;
  status: UserStatus;
  lecturer_id?: string;
  department?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  lecturer_id: string;

  // Clock In Telemetry
  clock_in_time: string;
  clock_in_lat: number;
  clock_in_lng: number;
  clock_in_accuracy: number;
  clock_in_ip?: string;
  clock_in_user_agent?: string;
  clock_in_device_id?: string;
  clock_in_device_label?: string;

  // Clock Out Telemetry
  clock_out_time?: string;
  clock_out_lat?: number;
  clock_out_lng?: number;
  clock_out_accuracy?: number;
  clock_out_ip?: string;
  clock_out_user_agent?: string;
  clock_out_device_id?: string;
  clock_out_device_label?: string;

  status: AttendanceStatus;
  report_submitted: boolean;
  report_id?: string;
  duration_minutes?: number;

  // Legacy/convenience references
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  server_timestamp: string;
  created_at: string;
}

export interface ReportAttachment {
  id: string;
  report_id: string;
  original_name: string;
  stored_filename: string;
  storage_path?: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface ReportAuditEntry {
  action: string;
  timestamp: string;
  details: string;
}

export interface ReportSubmission {
  id: string;
  attendance_record_id: string;
  student_id: string;
  student_name: string;
  lecturer_id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  submitted_at: string;
  submitted_ip?: string;
  submitted_user_agent?: string;
  submitted_device_id?: string;
  submitted_device_label?: string;
  version: number;
  audit_trail: ReportAuditEntry[];
  attachments: ReportAttachment[];
}

export interface LecturerSummaryMetrics {
  totalApprovedStudents: number;
  totalStudentsRegistered: number;
  pendingStudentApprovals: number;
  todayAttendanceRecords: number;
  currentlyClockedInCount: number;
  totalReportsSubmitted: number;
}
