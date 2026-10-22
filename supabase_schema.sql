-- ==============================================================================
-- STUDENT ATTENDANCE & REPORTING SYSTEM
-- Complete Supabase Database Setup & Seed Script (Admin-Only Seed)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to: SQL Editor (left sidebar)
-- 3. Click "New query", paste the entirety of this file, and click "Run" (or Ctrl/Cmd + Enter)
--
-- RESULT:
-- * Tables are re-created from scratch (any previous data is dropped).
-- * No "sessions" table: students clock in / out and report directly.
-- * No matriculation numbers anywhere.
-- * Students sign in with their registered full name (no password).
-- * Staff / lecturers sign in with username + password.
-- * One attendance session per calendar day (Asia/Kuala_Lumpur), enforced by the app.
-- * Report attachments are stored in the private "report-attachments" bucket.
-- * The only seeded account is the admin:
--     name:     admin
--     username: admin
--     password: admin123
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 0: REMOVE ANY PREVIOUS TABLES (CLEAN SLATE)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ------------------------------------------------------------------------------
-- STEP 1: CREATE TABLES
-- ------------------------------------------------------------------------------

-- 1.1 USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT NOT NULL CHECK (role IN ('lecturer', 'student')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  lecturer_id TEXT,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.2 ATTENDANCE RECORDS TABLE (Clock In / Out Telemetry)
--     One session per day is enforced by the application. Includes IP/device audit data.
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  lecturer_id TEXT NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_lat DOUBLE PRECISION NOT NULL,
  clock_in_lng DOUBLE PRECISION NOT NULL,
  clock_in_accuracy DOUBLE PRECISION NOT NULL,
  clock_in_ip TEXT,
  clock_in_user_agent TEXT,
  clock_in_device_id TEXT,
  clock_in_device_label TEXT,
  clock_out_time TIMESTAMPTZ,
  clock_out_lat DOUBLE PRECISION,
  clock_out_lng DOUBLE PRECISION,
  clock_out_accuracy DOUBLE PRECISION,
  clock_out_ip TEXT,
  clock_out_user_agent TEXT,
  clock_out_device_id TEXT,
  clock_out_device_label TEXT,
  status TEXT NOT NULL DEFAULT 'clocked_in' CHECK (status IN ('clocked_in', 'clocked_out')),
  report_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  report_id TEXT,
  duration_minutes INTEGER,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.3 REPORTS TABLE (Linked directly to the day's attendance record)
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  attendance_record_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  lecturer_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_meters DOUBLE PRECISION NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_ip TEXT,
  submitted_user_agent TEXT,
  submitted_device_id TEXT,
  submitted_device_label TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ------------------------------------------------------------------------------
-- STEP 2: PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
DROP INDEX IF EXISTS public.idx_attendance_student_day;
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecturer ON public.attendance_records(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_device ON public.attendance_records(clock_in_device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_ip ON public.attendance_records(clock_in_ip);
CREATE INDEX IF NOT EXISTS idx_reports_student ON public.reports(student_id);
CREATE INDEX IF NOT EXISTS idx_reports_lecturer ON public.reports(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_reports_attendance ON public.reports(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_reports_device ON public.reports(submitted_device_id);
CREATE INDEX IF NOT EXISTS idx_reports_ip ON public.reports(submitted_ip);

-- ------------------------------------------------------------------------------
-- STEP 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
-- NOTE: The backend accesses Supabase with the service role key, which bypasses
-- RLS. These permissive policies are provided for completeness only.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to users" ON public.users;
DROP POLICY IF EXISTS "Allow full access to attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow full access to reports" ON public.reports;

CREATE POLICY "Allow full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access to reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- STEP 4: SEED ADMIN ACCOUNT
-- ------------------------------------------------------------------------------
-- name: admin, password: admin123 (staff portals sign in with username + password)
INSERT INTO public.users (id, name, username, password, role, status, department, created_at, updated_at)
VALUES
  (
    'lec_admin',
    'admin',
    'admin',
    'admin123',
    'lecturer',
    'approved',
    'Administration',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  department = EXCLUDED.department,
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- STEP 5: PRIVATE STORAGE BUCKET FOR REPORT ATTACHMENTS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', false)
ON CONFLICT (id) DO NOTHING;
