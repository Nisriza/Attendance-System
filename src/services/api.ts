import {
  User,
  AttendanceRecord,
  ReportSubmission,
  LecturerSummaryMetrics,
} from '../types/index.ts';

const TOKEN_KEY = 'geoattend_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'An error occurred');
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  async login(
    payload:
      | {
          role?: 'lecturer' | 'student';
          fullname?: string;
          name?: string;
          username?: string;
          password?: string;
        }
      | string,
    passwordArg?: string
  ): Promise<{ token: string; user: User }> {
    const body =
      typeof payload === 'string'
        ? { username: payload, password: passwordArg }
        : payload;

    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setStoredToken(res.token);
    return res;
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  async logout(): Promise<void> {
    setStoredToken(null);
  },

  async changePassword(payload: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProfile(updates: Partial<User> & { newPassword?: string }): Promise<{ message: string; user: User }> {
    return request<{ message: string; user: User }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getLecturers(): Promise<Array<{ id: string; name: string; department?: string }>> {
    return request<Array<{ id: string; name: string; department?: string }>>('/lecturers');
  },

  // Lecturer Endpoints
  async registerStudent(payload: {
    fullname: string;
  }): Promise<{ message: string; student: User }> {
    return request<{ message: string; student: User }>('/lecturer/register-student', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getLecturerMetrics(): Promise<LecturerSummaryMetrics> {
    return request<LecturerSummaryMetrics>('/lecturer/metrics');
  },

  async getPendingStudents(): Promise<User[]> {
    return request<User[]>('/lecturer/students/pending');
  },

  async approveStudent(studentId: string): Promise<{ message: string; student: User }> {
    return request<{ message: string; student: User }>(`/lecturer/students/${studentId}/approve`, {
      method: 'POST',
    });
  },

  async rejectStudent(studentId: string): Promise<{ message: string; student: User }> {
    return request<{ message: string; student: User }>(`/lecturer/students/${studentId}/reject`, {
      method: 'POST',
    });
  },

  async getApprovedStudents(): Promise<Array<User & { attendanceCount: number; reportsCount: number }>> {
    return request<Array<User & { attendanceCount: number; reportsCount: number }>>('/lecturer/students');
  },

  async getStudentDetail(studentId: string): Promise<{
    student: User;
    attendance: AttendanceRecord[];
    reports: ReportSubmission[];
  }> {
    return request<{
      student: User;
      attendance: AttendanceRecord[];
      reports: ReportSubmission[];
    }>(`/lecturer/students/${studentId}`);
  },

  // Attendance (Clock In / Out)
  async getActiveClockIn(): Promise<{
    activeRecord: AttendanceRecord | null;
    staleOpenRecord: AttendanceRecord | null;
    todayRecord: AttendanceRecord | null;
    canClockIn: boolean;
    canClockOut: boolean;
  }> {
    return request<{
      activeRecord: AttendanceRecord | null;
      staleOpenRecord: AttendanceRecord | null;
      todayRecord: AttendanceRecord | null;
      canClockIn: boolean;
      canClockOut: boolean;
    }>('/attendance/active');
  },

  async clockIn(payload: {
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    device_id?: string;
  }): Promise<{ message: string; record: AttendanceRecord }> {
    return request<{ message: string; record: AttendanceRecord }>('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async clockOut(payload: {
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    device_id?: string;
    record_id?: string;
  }): Promise<{ message: string; record: AttendanceRecord }> {
    return request<{ message: string; record: AttendanceRecord }>('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAttendanceRecords(params?: { studentId?: string }): Promise<AttendanceRecord[]> {
    const query = new URLSearchParams();
    if (params?.studentId) query.set('studentId', params.studentId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<AttendanceRecord[]>(`/attendance${qs}`);
  },

  // Reports
  async submitReport(formData: FormData): Promise<{ message: string; report: ReportSubmission }> {
    return request<{ message: string; report: ReportSubmission }>('/reports/submit', {
      method: 'POST',
      body: formData,
    });
  },

  async getReports(): Promise<ReportSubmission[]> {
    return request<ReportSubmission[]>('/reports');
  },

  async getReportDetail(reportId: string): Promise<{
    report: ReportSubmission;
    attendance?: AttendanceRecord;
  }> {
    return request<{
      report: ReportSubmission;
      attendance?: AttendanceRecord;
    }>(`/reports/${reportId}`);
  },

  async updateReport(reportId: string, updates: { title?: string; description?: string }): Promise<{ message: string; report: ReportSubmission }> {
    return request<{ message: string; report: ReportSubmission }>(`/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteReport(reportId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/reports/${reportId}`, {
      method: 'DELETE',
    });
  },

  getAttachmentDownloadUrl(reportId: string, attachmentId: string): string {
    const token = getStoredToken();
    return `/api/reports/${reportId}/attachments/${attachmentId}/download?auth=${encodeURIComponent(token || '')}`;
  },

  // Fetches the file with auth headers and triggers the browser's native
  // download flow via a temporary object URL — works on desktop and mobile,
  // and preserves the original filename/extension.
  async downloadAttachment(reportId: string, attachmentId: string, filename: string): Promise<void> {
    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(
      `/api/reports/${reportId}/attachments/${attachmentId}/download`,
      { headers }
    );

    if (!response.ok) {
      let message = 'Download failed. Please try again.';
      const contentType = response.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data?.error) message = data.error;
        } else {
          const text = await response.text();
          if (text) message = text;
        }
      } catch (_) {}
      throw new Error(message);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },

  getAttachmentPreviewUrl(reportId: string, attachmentId: string): string {
    const token = getStoredToken();
    return `/api/reports/${reportId}/attachments/${attachmentId}/preview?auth=${encodeURIComponent(token || '')}`;
  },
};
