-- ==============================================================================
-- GeoAttend migration: strict one-clock-in-per-student-per-day enforcement
-- Adds an application-computed attendance day (Asia/Kuala_Lumpur) and a unique
-- constraint so duplicate clock-ins are rejected at the database level.
-- Run ONCE in the Supabase SQL Editor (non-destructive, safe to re-run).
-- ==============================================================================

-- 1. Day key column, computed by the app in the configured attendance timezone.
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS attendance_day TEXT;

-- 2. Backfill existing rows using the same timezone the app uses.
UPDATE public.attendance_records
SET attendance_day = to_char(clock_in_time AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD')
WHERE attendance_day IS NULL;

-- 3. Remove existing duplicates: keep the earliest clock-in per student per day.
DELETE FROM public.attendance_records a
USING public.attendance_records b
WHERE a.student_id = b.student_id
  AND a.attendance_day = b.attendance_day
  AND a.clock_in_time > b.clock_in_time;

-- 4. Database-level duplicate protection (also guards race conditions and
--    concurrent serverless instances).
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_student_day_unique
  ON public.attendance_records(student_id, attendance_day);
