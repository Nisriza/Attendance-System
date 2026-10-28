export type UserRole = 'lecturer' | 'student';
export type UserStatus = 'pending_approval' | 'approved' | 'rejected';
export type AttendanceStatus = 'clocked_in' | 'clocked_out' | 'forgot_clock_out';

export interface User {
  id: string;
  name: string;
  username?: string;
  password?: string; // Students log in by full name and have no password
  role: UserRole;
  status: UserStatus;
  lecturer_id?: string; // For students: foreign key to their assigned lecturer
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
  clock_in_time: string; // Server authoritative timestamp
  clock_in_lat: number;
  clock_in_lng: number;
  clock_in_accuracy: number;
  clock_in_ip?: string;
  clock_in_user_agent?: string;
  clock_in_device_id?: string;
  clock_in_device_label?: string;

  // Clock Out Telemetry
  clock_out_time?: string; // Server authoritative timestamp
  clock_out_lat?: number;
  clock_out_lng?: number;
  clock_out_accuracy?: number;
  clock_out_ip?: string;
  clock_out_user_agent?: string;
  clock_out_device_id?: string;
  clock_out_device_label?: string;

  status: AttendanceStatus;
  report_submitted: boolean; // Gating condition for Clock Out
  report_id?: string;
  attendance_day?: string; // YYYY-MM-DD in ATTENDANCE_TIME_ZONE; one record per student per day
  duration_minutes?: number;

  // Backward compatibility fields
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
  storage_path?: string; // Path inside the private Supabase Storage bucket
  file_path?: string; // Legacy local disk path (only for pre-migration attachments)
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
  attendance_record_id: string; // Linked directly to the Clock In/Out day record
  student_id: string;
  student_name: string;
  lecturer_id: string;
  title: string;
  description?: string;
  latitude: number; // Report location captured separately
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
