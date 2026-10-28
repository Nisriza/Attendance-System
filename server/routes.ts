import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { db, UPLOAD_DIR } from './db.js';
import { supabase } from './supabase.js';
import { User, AttendanceRecord, ReportSubmission, ReportAttachment } from './types.js';
import { clientIp, cleanDeviceId, deviceLabel } from './device.js';
import { isSameAttendanceDay, todayKey } from './time.js';
import {
  allowedExtensionsList,
  downloadStoredFile,
  inferMimeType,
  isAllowedReportFile,
  removeStoredFiles,
  storeReportFile,
} from './storage.js';

export const apiRouter = express.Router();

// Keep the in-memory cache in sync with Supabase: data edited or deleted
// directly in the database is reflected in the app within a few seconds.
const CACHE_REFRESH_TTL_MS = 3000;
apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  db.refreshIfStale(CACHE_REFRESH_TTL_MS)
    .then(() => next())
    .catch(() => next());
});

// Middleware: session-like user auth via Authorization header (e.g. "Bearer <userId>")
export interface AuthenticatedRequest extends Request {
  user?: User;
}

type RouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => unknown;

// Wraps async handlers so rejected promises (e.g. Supabase write failures) reach the error middleware
function asyncHandler(handler: RouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as AuthenticatedRequest, res, next)).catch(next);
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = '';
  const authHeader = req.headers.authorization;
  if (authHeader) {
    token = authHeader.replace(/^Bearer\s+/i, '').trim();
  } else if (req.query.auth) {
    token = String(req.query.auth).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    next();
    return;
  }

  const cached = db.getUserById(token);
  if (cached) {
    req.user = cached;
    next();
    return;
  }

  // Cache miss (e.g. account created on another serverless instance):
  // resolve the token against Supabase before rejecting the request.
  db.getUserByIdFresh(token)
    .then((user) => {
      if (user) req.user = user;
      next();
    })
    .catch(() => next());
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

function requireLecturer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Access restricted to university lecturers.' });
  }
  next();
}

function requireApprovedStudent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access restricted to students.' });
  }
  if (req.user.status !== 'approved') {
    return res.status(403).json({
      error: 'Account Pending Approval. Your selected lecturer has not yet approved your registration.',
      status: req.user.status,
    });
  }
  next();
}

// Multer storage setup for report attachments.
// Memory storage works everywhere (including read-only serverless filesystems like Vercel);
// files are uploaded straight to Supabase Storage from the buffer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Vercel caps serverless request bodies at ~4.5 MB; keep uploads safely under it
    fileSize: 4 * 1024 * 1024, // 4 MB per file
    files: 5,
  },
});

// ==========================================
// DATABASE STATUS ROUTE
// ==========================================
apiRouter.get('/database/status', (_req: Request, res: Response) => {
  res.json({
    provider: 'supabase',
    isSupabaseConfigured: db.isUsingSupabase(),
    totalUsers: db.getUsers().length,
    totalRecords: db.getAttendanceRecords().length,
    totalReports: db.getReports().length,
  });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Login
// Students: passwordless, identified by their registered full name.
// Staff / lecturers: username + password.
apiRouter.post('/auth/login', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { role, name, fullname, username, password } = req.body;

  if (role === 'student') {
    const providedName = String(name || fullname || username || '').trim();
    if (!providedName) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }

    // Fresh lookup: the local cache may not include accounts registered on
    // another serverless instance.
    const matches = await db.getStudentsByNameFresh(providedName);
    if (matches.length === 0) {
      return res.status(401).json({ error: 'No student account found with that full name.' });
    }
    if (matches.length > 1) {
      return res.status(409).json({
        error:
          'Multiple student accounts share this full name. Please contact your lecturer to resolve the duplicate before logging in.',
      });
    }

    const student = matches[0];
    const { password: _, ...safeUser } = student;
    return res.json({
      token: student.id,
      user: safeUser,
    });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) {
    return res.status(400).json({ error: 'Username is required to log in.' });
  }

  const found = db.getUserByUsername(cleanUsername);
  const user = found && (role === undefined || found.role === role) ? found : undefined;

  if (!user || !user.password || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const { password: _, ...safeUser } = user;
  return res.json({
    token: user.id,
    user: safeUser,
  });
}));

// Me (Current session)
apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { password: _, ...safeUser } = req.user;
  return res.json({ user: safeUser });
});

// Profile Update
apiRouter.put('/users/profile', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, fullname, newPassword, password, department, phone } = req.body;

  const updates: Partial<User> = {};
  const updatedName = String(fullname || name || '').trim().replace(/\s+/g, ' ');
  if (updatedName) {
    if (user.role === 'student') {
      const duplicate = db
        .getStudentsByName(updatedName)
        .find((u) => u.id !== user.id);
      if (duplicate) {
        return res.status(409).json({
          error: 'Another student is already registered with this full name.',
        });
      }
    }
    updates.name = updatedName;
  }

  const passToUpdate = newPassword || password;
  if (passToUpdate && user.role === 'lecturer') {
    if (typeof passToUpdate !== 'string' || passToUpdate.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    updates.password = passToUpdate;
  }

  if (department && typeof department === 'string') updates.department = department.trim();
  if (phone && typeof phone === 'string') updates.phone = phone.trim();

  const updatedUser = await db.updateUser(user.id, updates);
  if (!updatedUser) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
  const { password: _, ...safeUser } = updatedUser;
  return res.json({ message: 'Profile updated successfully.', user: safeUser });
}));

// Change Password Endpoint
apiRouter.post('/auth/change-password', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { currentPassword, newPassword } = req.body;

  if (user.role !== 'lecturer') {
    return res.status(403).json({ error: 'Student accounts sign in with their full name and do not use a password.' });
  }

  if (currentPassword && user.password !== currentPassword) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  await db.updateUser(user.id, { password: newPassword });
  return res.json({ success: true, message: 'Password updated successfully!' });
}));

// Public List of Lecturers
apiRouter.get('/lecturers', (_req: Request, res: Response) => {
  const lecturers = db
    .getUsers()
    .filter((u) => u.role === 'lecturer')
    .map((l) => ({
      id: l.id,
      name: l.name,
      department: l.department,
    }));
  return res.json(lecturers);
});

// ==========================================
// LECTURER DASHBOARD & STUDENT MANAGEMENT
// ==========================================

// Get summary metrics for lecturer (Total Students Registered, Attendance, Reports)
apiRouter.get('/lecturer/metrics', requireAuth, requireLecturer, (req: AuthenticatedRequest, res: Response) => {
  const lecturerId = req.user!.id;
  const allUsers = db.getUsers();

  const registeredStudents = allUsers.filter(
    (u) => u.role === 'student' && (!u.lecturer_id || u.lecturer_id === lecturerId)
  );

  const today = todayKey();
  const allAttendance = db.getAttendanceByLecturer(lecturerId);
  const todayAttendance = allAttendance.filter((a) => isSameAttendanceDay(a.clock_in_time, today));
  const currentlyClockedIn = allAttendance.filter((a) => a.status === 'clocked_in');
  const allReports = db.getReportsByLecturer(lecturerId);

  return res.json({
    totalApprovedStudents: registeredStudents.length,
    totalStudentsRegistered: registeredStudents.length,
    pendingStudentApprovals: 0,
    todayAttendanceRecords: todayAttendance.length,
    currentlyClockedInCount: currentlyClockedIn.length,
    totalReportsSubmitted: allReports.length,
  });
});

// Staff (Admin) Register a Student by Full Name only (students sign in by name)
apiRouter.post('/lecturer/register-student', requireAuth, requireLecturer, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const lecturerId = req.user!.id;
  const { fullname, name } = req.body;
  const studentName = String(fullname || name || '').trim().replace(/\s+/g, ' ');

  if (!studentName) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  const duplicate = db.getStudentsByName(studentName)[0];
  if (duplicate) {
    return res.status(409).json({
      error: `A student named "${studentName}" is already registered. Full names must be unique for name-based login.`,
    });
  }

  const newStudent: User = {
    id: 'stu_' + crypto.randomUUID().slice(0, 8),
    name: studentName,
    role: 'student',
    status: 'approved',
    lecturer_id: lecturerId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.addUser(newStudent);
  const { password: _, ...safe } = newStudent;
  return res.status(201).json({
    message: `Student ${studentName} successfully registered!`,
    student: safe,
  });
}));

// My Students (all registered students)
apiRouter.get('/lecturer/students', requireAuth, requireLecturer, (req: AuthenticatedRequest, res: Response) => {
  const lecturerId = req.user!.id;
  const students = db
    .getUsers()
    .filter((u) => u.role === 'student' && (!u.lecturer_id || u.lecturer_id === lecturerId))
    .map((u) => {
      const { password: _, ...safe } = u;
      const attendanceCount = db.getAttendanceByStudent(u.id).length;
      const reportsCount = db.getReportsByStudent(u.id).length;
      return {
        ...safe,
        attendanceCount,
        reportsCount,
      };
    });
  return res.json(students);
});

// Specific Student Detail (with full history)
apiRouter.get('/lecturer/students/:studentId', requireAuth, requireLecturer, (req: AuthenticatedRequest, res: Response) => {
  const lecturerId = req.user!.id;
  const { studentId } = req.params;
  const student = db.getUserById(studentId);

  if (!student || student.role !== 'student') {
    return res.status(404).json({ error: 'Student record not found.' });
  }
  if (student.lecturer_id !== lecturerId) {
    return res.status(403).json({ error: 'You are not authorized to view this student.' });
  }

  const { password: _, ...safeStudent } = student;
  const attendance = db.getAttendanceByStudent(studentId);
  const reports = db.getReportsByStudent(studentId);

  return res.json({
    student: safeStudent,
    attendance,
    reports,
  });
});

// ==========================================
// ATTENDANCE (CLOCK IN / OUT)
// ==========================================

// Get Active Clock-In Status for Current Student
apiRouter.get('/attendance/active', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== 'student') {
    return res.status(400).json({ error: 'Only students have active clock-in sessions.' });
  }
  // Lazily mark any still-open session from a previous attendance day as a
  // missed clock-out, then read the current (today's) session state.
  await db.expireForgottenClockIns();
  // Read-through: refresh this student's records from Supabase so state is
  // truthful across serverless instances, refreshes, and re-logins.
  await db.refreshStudentAttendance(user.id);
  const activeRecord = db.getActiveClockInForStudent(user.id) || null;
  const todayRecord = db.getAttendanceByStudentOnDay(user.id) || null;
  return res.json({
    activeRecord,
    todayRecord,
    canClockIn: !todayRecord,
    canClockOut: !!activeRecord?.report_submitted,
  });
}));

// Student Clock-In (Captures real-time GPS coordinates, date, and time)
apiRouter.post('/attendance/clock-in', requireAuth, requireApprovedStudent, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const student = req.user!;
  const { latitude, longitude, accuracy_meters } = req.body;

  // 1. Prevent duplicate active clock-in (today only — a stale 'clocked_in'
  //    record from a previous day must not block a valid new clock-in)
  const active = db.getActiveClockInForStudent(student.id);
  if (active && isSameAttendanceDay(active.clock_in_time || active.server_timestamp)) {
    return res.status(400).json({
      error: 'You have already clocked in today. Please submit your report and clock out before starting a new session.',
      activeRecord: active,
    });
  }

  // 2. Allow only one attendance session per calendar day (Asia/Kuala_Lumpur)
  const todayRecord = db.getAttendanceByStudentOnDay(student.id);
  if (todayRecord) {
    return res.status(400).json({
      error: 'You have already clocked in today. You can clock in again tomorrow.',
      todayRecord,
    });
  }

  // 2b. Authoritative check directly against Supabase — the in-memory cache can
  //     be stale across concurrent serverless instances, multiple devices, or
  //     after a re-login. The unique index on (student_id, attendance_day) is
  //     the final backstop against simultaneous requests.
  const dayKey = todayKey();
  if (supabase) {
    const { data: existing, error: lookupError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('student_id', student.id)
      .eq('attendance_day', dayKey)
      .limit(1)
      .maybeSingle();
    if (!lookupError && existing) {
      return res.status(400).json({
        error: 'You have already clocked in today. You can clock in again tomorrow.',
      });
    }
  }

  // 3. Validate GPS coordinates
  if (latitude === undefined || longitude === undefined || accuracy_meters === undefined) {
    return res.status(400).json({
      error: 'Device GPS location is required to Clock In. Please grant location permissions on your device.',
    });
  }

  const numLat = Number(latitude);
  const numLng = Number(longitude);
  const numAcc = Number(accuracy_meters);

  if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
    return res.status(400).json({ error: 'Invalid GPS coordinates received.' });
  }

  // 4. Server-generated authoritative timestamp + device/IP telemetry
  const serverTimestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'];

  const newRecord: AttendanceRecord = {
    id: 'att_' + crypto.randomUUID().slice(0, 8),
    student_id: student.id,
    student_name: student.name,
    lecturer_id: student.lecturer_id || '',
    clock_in_time: serverTimestamp,
    clock_in_lat: numLat,
    clock_in_lng: numLng,
    clock_in_accuracy: numAcc,
    clock_in_ip: clientIp(req),
    clock_in_user_agent: userAgent,
    clock_in_device_id: cleanDeviceId(req.body.device_id),
    clock_in_device_label: deviceLabel(userAgent),
    status: 'clocked_in',
    report_submitted: false,
    attendance_day: dayKey,
    latitude: numLat,
    longitude: numLng,
    accuracy_meters: numAcc,
    server_timestamp: serverTimestamp,
    created_at: serverTimestamp,
  };

  await db.addAttendanceRecord(newRecord);
  return res.status(201).json({
    message: 'Clock-in verified! Device GPS coordinates and timestamp securely recorded.',
    record: newRecord,
  });
}));

// Student Clock-Out (CRITICAL RULE: Cannot clock out without submitting a report!)
apiRouter.post('/attendance/clock-out', requireAuth, requireApprovedStudent, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const student = req.user!;
  const { latitude, longitude, accuracy_meters } = req.body;

  // 1. Verify student has an active clock-in record (refreshed so a session
  //    started on another serverless instance is recognized). Sessions from
  //    previous attendance days are auto-expired as forgotten clock-outs
  //    before this runs, so only the current-day session can be clocked out.
  await db.refreshStudentAttendance(student.id);
  await db.expireForgottenClockIns();
  const activeRecord: AttendanceRecord | undefined = db.getActiveClockInForStudent(student.id);
  if (!activeRecord) {
    return res.status(400).json({ error: 'No active clocked-in record found to clock out from.' });
  }

  // 2. MANDATORY BUSINESS RULE: Cannot clock out without submitting report.
  //    Self-heal: if a report was saved (possibly on another instance or in a
  //    request where the follow-up update failed), trust the database record
  //    and repair the flag instead of forcing a resubmission.
  if (!activeRecord.report_submitted && supabase) {
    const { data: savedReport } = await supabase
      .from('reports')
      .select('id')
      .eq('attendance_record_id', activeRecord.id)
      .limit(1)
      .maybeSingle();
    if (savedReport) {
      await db.updateAttendanceRecord(activeRecord.id, {
        report_submitted: true,
        report_id: savedReport.id,
      });
      activeRecord.report_submitted = true;
    }
  }

  if (!activeRecord.report_submitted) {
    return res.status(403).json({
      error: 'Report Required. You cannot clock out until you have submitted your required progress report.',
      code: 'REPORT_REQUIRED',
      activeRecord,
    });
  }

  // 3. Validate Clock-Out GPS coordinates
  if (latitude === undefined || longitude === undefined || accuracy_meters === undefined) {
    return res.status(400).json({
      error: 'Device GPS location is required to Clock Out. Please grant location permissions on your device.',
    });
  }

  const numLat = Number(latitude);
  const numLng = Number(longitude);
  const numAcc = Number(accuracy_meters);

  if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
    return res.status(400).json({ error: 'Invalid GPS coordinates received for clock-out.' });
  }

  // 4. Server-generated authoritative timestamp & duration calculation
  const serverTimestamp = new Date().toISOString();
  const startTime = new Date(activeRecord.clock_in_time).getTime();
  const endTime = new Date(serverTimestamp).getTime();
  const durationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));

  const userAgent = req.headers['user-agent'];
  const updated = await db.updateAttendanceRecord(activeRecord.id, {
    status: 'clocked_out',
    clock_out_time: serverTimestamp,
    clock_out_lat: numLat,
    clock_out_lng: numLng,
    clock_out_accuracy: numAcc,
    clock_out_ip: clientIp(req),
    clock_out_user_agent: userAgent,
    clock_out_device_id: cleanDeviceId(req.body.device_id),
    clock_out_device_label: deviceLabel(userAgent),
    duration_minutes: durationMinutes,
  });

  return res.json({
    message: `Clock-out verified! Session duration: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m. All GPS records saved.`,
    record: updated,
  });
}));

// List Attendance Records
apiRouter.get('/attendance', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { studentId } = req.query;

  // Lazily mark open sessions from previous attendance days as missed
  // clock-outs so logs and admin views stay consistent.
  await db.expireForgottenClockIns();

  if (user.role === 'lecturer') {
    let records = db.getAttendanceByLecturer(user.id);
    if (studentId && typeof studentId === 'string') {
      records = records.filter((r) => r.student_id === studentId);
    }
    return res.json(records);
  } else if (user.role === 'student') {
    if (user.status !== 'approved') return res.status(403).json({ error: 'Pending approval.' });
    const records = db.getAttendanceByStudent(user.id);
    return res.json(records);
  }
  return res.status(400).json({ error: 'Invalid role.' });
}));

// =========================================================================
// MANDATORY ATTENDANCE BEFORE REPORT SUBMISSION (CRITICAL BUSINESS RULE)
// =========================================================================

// Submit Report
apiRouter.post(
  '/reports/submit',
  requireAuth,
  requireApprovedStudent,
  upload.array('files', 5),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const student = req.user!;
    const { title, description, latitude, longitude, accuracy_meters } = req.body;
    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];

    const cleanupTempFiles = () => {
      uploadedFiles.forEach((file) => {
        try {
          if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (_) {}
      });
    };

    // 1. Resolve attendance / clock-in record (active first, else most recent)
    let attendanceRecord = db.getActiveClockInForStudent(student.id);
    if (!attendanceRecord) {
      const studentRecords = db.getAttendanceByStudent(student.id);
      if (studentRecords.length > 0) {
        attendanceRecord = studentRecords[0];
      }
    }

    if (!attendanceRecord) {
      cleanupTempFiles();
      return res.status(403).json({
        error: 'Clock-In Required. You must clock in and record your location before submitting your report.',
        code: 'ATTENDANCE_REQUIRED',
      });
    }

    // 1b. The resolved record must belong to TODAY (Asia/Kuala_Lumpur) —
    // prevents reports being attached to a previous day's attendance.
    if (!isSameAttendanceDay(attendanceRecord.clock_in_time || attendanceRecord.server_timestamp)) {
      cleanupTempFiles();
      return res.status(403).json({
        error: 'Clock-In Required. You must clock in today before submitting your report.',
        code: 'ATTENDANCE_REQUIRED',
      });
    }

    // 1c. Prevent duplicate daily report submissions for the same attendance record
    if (attendanceRecord.report_submitted) {
      cleanupTempFiles();
      return res.status(409).json({
        error: 'Your attendance report has already been submitted for today.',
        code: 'REPORT_ALREADY_SUBMITTED',
      });
    }

    // 1d. Authoritative check directly against Supabase — guards against stale
    //     in-memory caches across concurrent serverless instances or devices.
    if (supabase) {
      const { data: existingReport, error: reportLookupError } = await supabase
        .from('reports')
        .select('id')
        .eq('attendance_record_id', attendanceRecord.id)
        .limit(1)
        .maybeSingle();
      if (!reportLookupError && existingReport) {
        cleanupTempFiles();
        return res.status(409).json({
          error: 'Your attendance report has already been submitted for today.',
          code: 'REPORT_ALREADY_SUBMITTED',
        });
      }
    }

    if (!title || !title.trim()) {
      cleanupTempFiles();
      return res.status(400).json({ error: 'Report title or task summary is required.' });
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'At least one report file or document attachment is required.' });
    }

    const unsupported = uploadedFiles.find((file) => !isAllowedReportFile(file.originalname));
    if (unsupported) {
      cleanupTempFiles();
      return res.status(400).json({
        error: `Unsupported file type for "${unsupported.originalname}". Allowed types: ${allowedExtensionsList()}.`,
      });
    }

    // 2. Capture Separate Report GPS Telemetry
    const reportLat = latitude !== undefined ? Number(latitude) : attendanceRecord.clock_in_lat || attendanceRecord.latitude;
    const reportLng = longitude !== undefined ? Number(longitude) : attendanceRecord.clock_in_lng || attendanceRecord.longitude;
    const reportAcc = accuracy_meters !== undefined ? Number(accuracy_meters) : attendanceRecord.clock_in_accuracy || attendanceRecord.accuracy_meters;

    const reportId = 'rep_' + crypto.randomUUID().slice(0, 8);
    const submissionTime = new Date().toISOString();
    const submitUserAgent = req.headers['user-agent'];
    const submitIp = clientIp(req);
    const submitDeviceId = cleanDeviceId(req.body.device_id);
    const submitDeviceLabel = deviceLabel(submitUserAgent);

    const attachments: ReportAttachment[] = [];
    const storedPaths: string[] = [];

    try {
      for (const file of uploadedFiles) {
        const stored = await storeReportFile(reportId, file);
        storedPaths.push(stored.storage_path);
        attachments.push({
          id: 'att_file_' + crypto.randomUUID().slice(0, 8),
          report_id: reportId,
          original_name: stored.original_name,
          stored_filename: stored.stored_filename,
          storage_path: stored.storage_path,
          mime_type: stored.mime_type,
          file_size: stored.file_size,
          created_at: submissionTime,
        });
      }
    } catch (err) {
      await removeStoredFiles(storedPaths);
      cleanupTempFiles();
      throw err;
    }

    cleanupTempFiles();

    const newReport: ReportSubmission = {
      id: reportId,
      attendance_record_id: attendanceRecord.id, // Linked strictly to the day's attendance record
      student_id: student.id,
      student_name: student.name,
      lecturer_id: student.lecturer_id || attendanceRecord.lecturer_id || '',
      title: title.trim(),
      description: description?.trim() || '',
      latitude: reportLat,
      longitude: reportLng,
      accuracy_meters: reportAcc,
      submitted_at: submissionTime,
      submitted_ip: submitIp,
      submitted_user_agent: submitUserAgent,
      submitted_device_id: submitDeviceId,
      submitted_device_label: submitDeviceLabel,
      version: 1,
      audit_trail: [
        {
          action: 'CREATED',
          timestamp: submissionTime,
          details: `Initial report submission with ${attachments.length} file(s). Verified against attendance record ${attendanceRecord.id}. Origin: ${submitDeviceLabel} · ${submitIp}${submitDeviceId ? ` · device ${submitDeviceId}` : ''}.`,
        },
      ],
      attachments,
    };

    await db.addReport(newReport);

    // CRITICAL: Mark attendance record as report_submitted = true, unlocking Clock Out!
    // Retry once on transient failure; if it still fails, the report is safely
    // saved and the clock-out route self-heals the flag from the database.
    try {
      await db.updateAttendanceRecord(attendanceRecord.id, {
        report_submitted: true,
        report_id: reportId,
      });
    } catch (flagErr) {
      console.warn('[Reports] report_submitted update failed, retrying once:', flagErr);
      try {
        await db.updateAttendanceRecord(attendanceRecord.id, {
          report_submitted: true,
          report_id: reportId,
        });
      } catch (retryErr) {
        console.error(
          `[Reports] Could not set report_submitted for attendance ${attendanceRecord.id} after report ${reportId} was saved. The clock-out route will self-heal from the database.`,
          retryErr
        );
      }
    }

    return res.status(201).json({
      message: 'Report successfully submitted and verified! You are now permitted to Clock Out.',
      report: newReport,
      unlockedClockOut: true,
    });
  })
);

// Get Reports
apiRouter.get('/reports', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'lecturer') {
    return res.json(db.getReportsByLecturer(user.id));
  } else if (user.role === 'student') {
    if (user.status !== 'approved') return res.status(403).json({ error: 'Pending approval.' });
    return res.json(db.getReportsByStudent(user.id));
  }
  return res.status(400).json({ error: 'Invalid role.' });
});

// Get Single Report Detail
apiRouter.get('/reports/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const report = db.getReportById(id);

  if (!report) return res.status(404).json({ error: 'Report not found.' });

  // Security check: Only author student or assigned lecturer may access
  if (user.role === 'student' && report.student_id !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this report.' });
  }
  if (user.role === 'lecturer' && report.lecturer_id !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this report.' });
  }

  const attendance = db.getAttendanceRecordById(report.attendance_record_id);

  return res.json({
    report,
    attendance,
  });
});

// Update Report Title / Description (Maintains audit trail)
apiRouter.put('/reports/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { title, description } = req.body;

  const report = db.getReportById(id);
  if (!report) return res.status(404).json({ error: 'Report not found.' });

  if (user.role === 'student' && report.student_id !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to edit this report.' });
  }

  const timestamp = new Date().toISOString();
  const newAudit = [
    ...report.audit_trail,
    {
      action: 'UPDATED',
      timestamp,
      details: `Report metadata updated by ${user.name} (${user.role}). Version bumped to ${report.version + 1}.`,
    },
  ];

  const updated = await db.updateReport(id, {
    title: title ? title.trim() : report.title,
    description: description !== undefined ? description.trim() : report.description,
    version: report.version + 1,
    audit_trail: newAudit,
  });

  return res.json({ message: 'Report updated successfully.', report: updated });
}));

// Delete Report (Retains associated attendance record)
apiRouter.delete('/reports/:id', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const report = db.getReportById(id);

  if (!report) return res.status(404).json({ error: 'Report not found.' });

  if (user.role === 'student' && report.student_id !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to delete this report.' });
  }

  // Delete attachments from secure storage (plus any legacy local files)
  const storagePaths = report.attachments
    .map((att) => att.storage_path)
    .filter((p): p is string => Boolean(p));
  await removeStoredFiles(storagePaths);

  report.attachments.forEach((att) => {
    if (att.storage_path || !att.file_path) return;
    try {
      if (fs.existsSync(att.file_path)) {
        fs.unlinkSync(att.file_path);
      }
    } catch (e) {
      console.error('Error removing file:', e);
    }
  });

  await db.deleteReport(id);
  // ATTENDANCE RECORD REMAINS INTACT AS REQUIRED
  return res.json({ message: 'Report deleted successfully. Your attendance record remains verified.' });
}));

// Resolve a legacy local attachment file (pre-Supabase Storage migration)
function getLegacyAttachmentPath(attachment: ReportAttachment): string | null {
  if (!attachment.file_path) return null;
  let resolvedPath = path.resolve(attachment.file_path);
  if (!fs.existsSync(resolvedPath)) {
    const candidate = path.join(
      UPLOAD_DIR,
      attachment.stored_filename || path.basename(attachment.file_path)
    );
    if (fs.existsSync(candidate)) resolvedPath = candidate;
  }
  return fs.existsSync(resolvedPath) ? resolvedPath : null;
}

async function sendAttachment(
  res: Response,
  attachment: ReportAttachment,
  disposition: 'attachment' | 'inline'
) {
  // RFC 5987: ASCII-safe fallback plus UTF-8 filename* so the original
  // filename (spaces, Unicode) is preserved exactly on download.
  const asciiFallback = attachment.original_name
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`
  );
  res.setHeader('Content-Type', inferMimeType(attachment.original_name, attachment.mime_type));

  if (attachment.storage_path) {
    try {
      const buffer = await downloadStoredFile(attachment.storage_path);
      return res.send(buffer);
    } catch (err) {
      console.error(
        `[Storage] Download failed for report attachment ${attachment.id} (path: ${attachment.storage_path}):`,
        err
      );
      return res.status(404).json({
        error: 'This file could not be found in secure storage. It may have been removed. Please contact your lecturer.',
      });
    }
  }

  const legacyPath = getLegacyAttachmentPath(attachment);
  if (!legacyPath) {
    console.warn(
      `[Storage] Legacy attachment ${attachment.id} ("${attachment.original_name}") has no storage_path and no local file — likely uploaded before cloud storage was enabled.`
    );
    return res.status(404).json({
      error:
        'This attachment was uploaded before secure cloud storage was enabled and is no longer available on the server. Please ask the student to re-submit the file if it is still needed.',
    });
  }
  return res.sendFile(legacyPath);
}

// Download Attachment
apiRouter.get(
  '/reports/:id/attachments/:attachmentId/download',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { id, attachmentId } = req.params;
    const report = db.getReportById(id);

    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Security check
    if (user.role === 'student' && report.student_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to download this file.' });
    }
    if (user.role === 'lecturer' && report.lecturer_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to download this file.' });
    }

    const attachment = report.attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'File attachment record not found.' });
    }

    return sendAttachment(res, attachment, 'attachment');
  })
);

// Preview Attachment (In-App)
apiRouter.get(
  '/reports/:id/attachments/:attachmentId/preview',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { id, attachmentId } = req.params;
    const report = db.getReportById(id);

    if (!report) return res.status(404).json({ error: 'Report not found.' });

    // Security check
    if (user.role === 'student' && report.student_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to preview this file.' });
    }
    if (user.role === 'lecturer' && report.lecturer_id !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to preview this file.' });
    }

    const attachment = report.attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'File attachment record not found.' });
    }

    return sendAttachment(res, attachment, 'inline');
  })
);
