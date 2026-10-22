-- ==============================================================================
-- GeoAttend migration: device/IP audit + passwordless student accounts
-- Run this ONCE in the Supabase SQL Editor (non-destructive, safe to re-run).
-- ==============================================================================

-- 1. Students authenticate by full name, so passwords become optional.
ALTER TABLE public.users ALTER COLUMN password DROP NOT NULL;

-- 2. Attendance device / IP telemetry.
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_in_ip TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_in_user_agent TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_in_device_id TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_in_device_label TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_out_ip TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_out_user_agent TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_out_device_id TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS clock_out_device_label TEXT;

-- 3. Report submission origin telemetry.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submitted_ip TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submitted_user_agent TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submitted_device_id TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submitted_device_label TEXT;

-- 4. Indexes for the device audit screen.
CREATE INDEX IF NOT EXISTS idx_attendance_device ON public.attendance_records(clock_in_device_id);
CREATE INDEX IF NOT EXISTS idx_attendance_ip ON public.attendance_records(clock_in_ip);
CREATE INDEX IF NOT EXISTS idx_reports_device ON public.reports(submitted_device_id);
CREATE INDEX IF NOT EXISTS idx_reports_ip ON public.reports(submitted_ip);

-- 5. One attendance session per day is enforced by the application (Asia/Kuala_Lumpur).
--    Remove the old unique index if it exists so a rejected second clock-in returns a
--    friendly message instead of a duplicate-key 500 error.
DROP INDEX IF EXISTS public.idx_attendance_student_day;

-- 6. Private storage bucket for report attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Optional: find duplicate full names before enabling name-based login.
--    (Registration already blocks duplicates, but existing data may contain some.)
-- SELECT lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS normalized_name,
--        array_agg(id) AS user_ids,
--        array_agg(name) AS names
-- FROM public.users
-- WHERE role = 'student'
-- GROUP BY 1
-- HAVING count(*) > 1;
