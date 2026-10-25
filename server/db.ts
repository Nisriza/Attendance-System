import fs from 'fs';
import path from 'path';
import { User, AttendanceRecord, ReportSubmission } from './types.js';
import { supabase, isSupabaseConfigured } from './supabase.js';
import { normalizePersonName } from './names.js';
import { isSameAttendanceDay, todayKey } from './time.js';

interface DatabaseSchema {
  users: User[];
  attendance_records: AttendanceRecord[];
  reports: ReportSubmission[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

// Report attachment files are stored on disk; all database rows live in Supabase.
// Serverless environments (e.g. Vercel) have a read-only filesystem, so don't crash there.
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  if (!process.env.VERCEL) throw err;
}

class Database {
  private data: DatabaseSchema = {
    users: [],
    attendance_records: [],
    reports: [],
  };

  isUsingSupabase(): boolean {
    return isSupabaseConfigured;
  }

  async init(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured. This application stores all data in Supabase only. ' +
          'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or the VITE_ variants) in your .env file, ' +
          'then run supabase_schema.sql in the Supabase SQL Editor.'
      );
    }

    console.log('🔄 Loading data from Supabase...');

    const [usersRes, attRes, reportsRes] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('attendance_records').select('*'),
      supabase.from('reports').select('*'),
    ]);

    if (usersRes.error) throw new Error(`Supabase users load failed: ${usersRes.error.message}`);
    if (attRes.error) throw new Error(`Supabase attendance_records load failed: ${attRes.error.message}`);
    if (reportsRes.error) throw new Error(`Supabase reports load failed: ${reportsRes.error.message}`);

    this.data = {
      users: (usersRes.data as User[]) || [],
      attendance_records: (attRes.data as AttendanceRecord[]) || [],
      reports: (reportsRes.data as ReportSubmission[]) || [],
    };

    console.log(
      `✅ Loaded ${this.data.users.length} users, ${this.data.attendance_records.length} attendance records, ${this.data.reports.length} reports from Supabase.`
    );
  }

  private client() {
    if (!supabase) throw new Error('Supabase client is not initialized.');
    return supabase;
  }

  private async insertRow(table: string, row: object, label: string): Promise<void> {
    const { error } = await this.client().from(table).insert(row);
    if (error) {
      // Postgres unique violation — database-level one-per-day enforcement
      if (error.code === '23505' && table === 'reports') {
        throw new Error('Your attendance report has already been submitted for today.');
      }
      if (error.code === '23505' && table === 'attendance_records') {
        throw new Error('You have already clocked in today.');
      }
      throw new Error(`Supabase ${label} insert failed: ${error.message}`);
    }
  }

  private async updateRow(table: string, id: string, updates: object, label: string): Promise<void> {
    const { error } = await this.client().from(table).update(updates).eq('id', id);
    if (error) throw new Error(`Supabase ${label} update failed: ${error.message}`);
  }

  private async deleteRow(table: string, id: string, label: string): Promise<void> {
    const { error } = await this.client().from(table).delete().eq('id', id);
    if (error) throw new Error(`Supabase ${label} delete failed: ${error.message}`);
  }

  // --- Users ---
  getUsers(): User[] {
    return [...this.data.users];
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByUsername(username: string): User | undefined {
    if (!username) return undefined;
    const clean = username.trim().toLowerCase();
    return this.data.users.find((u) => u.username?.toLowerCase() === clean);
  }

  getUserByName(name: string): User | undefined {
    return this.getStudentsByName(name)[0];
  }

  getStudentsByName(name: string): User[] {
    const clean = normalizePersonName(name);
    if (!clean) return [];
    return this.data.users.filter(
      (u) => u.role === 'student' && normalizePersonName(u.name) === clean
    );
  }

  // --- Read-through helpers (serverless-safe) ---
  // The in-memory cache can be stale across concurrent instances, so these
  // fall back to a direct Supabase query and hydrate the cache on a miss.

  async getUserByIdFresh(id: string): Promise<User | undefined> {
    const cached = this.getUserById(id);
    if (cached) return cached;
    if (!supabase) return undefined;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error || !data) return undefined;
    const user = data as User;
    this.data.users.push(user);
    return user;
  }

  async getStudentsByNameFresh(name: string): Promise<User[]> {
    const cached = this.getStudentsByName(name);
    if (cached.length > 0) return cached;
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*').eq('role', 'student');
    if (error || !data) return [];
    const known = new Set(this.data.users.map((u) => u.id));
    (data as User[]).forEach((u) => {
      if (!known.has(u.id)) this.data.users.push(u);
    });
    return this.getStudentsByName(name);
  }

  async refreshStudentAttendance(studentId: string): Promise<void> {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId);
    if (error) {
      console.error('[DB] Failed to refresh student attendance:', error.message);
      return;
    }
    this.data.attendance_records = this.data.attendance_records.filter(
      (r) => r.student_id !== studentId
    );
    this.data.attendance_records.push(...((data as AttendanceRecord[]) || []));
  }

  async addUser(user: User): Promise<User> {
    await this.insertRow('users', user, 'users');
    this.data.users.push(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    const merged: User = {
      ...this.data.users[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await this.updateRow('users', id, { ...updates, updated_at: merged.updated_at }, 'users');
    this.data.users[idx] = merged;
    return merged;
  }

  // --- Clock In / Out Attendance Records ---
  getAttendanceRecords(): AttendanceRecord[] {
    return [...this.data.attendance_records];
  }

  getAttendanceRecordById(id: string): AttendanceRecord | undefined {
    return this.data.attendance_records.find((r) => r.id === id);
  }

  getActiveClockInForStudent(studentId: string): AttendanceRecord | undefined {
    return this.data.attendance_records.find(
      (r) => r.student_id === studentId && r.status === 'clocked_in'
    );
  }

  getAttendanceByStudent(studentId: string): AttendanceRecord[] {
    return this.data.attendance_records.filter((r) => r.student_id === studentId);
  }

  getAttendanceByStudentOnDay(studentId: string, dayKey: string = todayKey()): AttendanceRecord | undefined {
    return this.data.attendance_records.find(
      (r) => r.student_id === studentId && isSameAttendanceDay(r.clock_in_time, dayKey)
    );
  }

  getAttendanceByLecturer(lecturerId: string): AttendanceRecord[] {
    return this.data.attendance_records.filter((r) => r.lecturer_id === lecturerId);
  }

  async addAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
    await this.insertRow('attendance_records', record, 'attendance_records');
    this.data.attendance_records.unshift(record);
    return record;
  }

  async updateAttendanceRecord(
    id: string,
    updates: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord | undefined> {
    const idx = this.data.attendance_records.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    await this.updateRow('attendance_records', id, updates, 'attendance_records');
    this.data.attendance_records[idx] = {
      ...this.data.attendance_records[idx],
      ...updates,
    };
    return this.data.attendance_records[idx];
  }

  // --- Report Submissions ---
  getReports(): ReportSubmission[] {
    return [...this.data.reports];
  }

  getReportById(id: string): ReportSubmission | undefined {
    return this.data.reports.find((r) => r.id === id);
  }

  getReportsByStudent(studentId: string): ReportSubmission[] {
    return this.data.reports.filter((r) => r.student_id === studentId);
  }

  getReportsByLecturer(lecturerId: string): ReportSubmission[] {
    return this.data.reports.filter((r) => r.lecturer_id === lecturerId);
  }

  async addReport(report: ReportSubmission): Promise<ReportSubmission> {
    await this.insertRow('reports', report, 'reports');
    this.data.reports.unshift(report);
    return report;
  }

  async updateReport(id: string, updates: Partial<ReportSubmission>): Promise<ReportSubmission | undefined> {
    const idx = this.data.reports.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    await this.updateRow('reports', id, updates, 'reports');
    this.data.reports[idx] = {
      ...this.data.reports[idx],
      ...updates,
    };
    return this.data.reports[idx];
  }

  async deleteReport(id: string): Promise<boolean> {
    const idx = this.data.reports.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    await this.deleteRow('reports', id, 'reports');
    this.data.reports.splice(idx, 1);
    return true;
  }
}

export const db = new Database();
