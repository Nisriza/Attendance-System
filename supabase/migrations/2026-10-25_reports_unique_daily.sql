-- ==============================================================================
-- GeoAttend migration: prevent duplicate daily reports
-- Enforces one report per attendance record at the database level.
-- Run ONCE in the Supabase SQL Editor (non-destructive, safe to re-run).
-- ==============================================================================

-- 1. Remove any existing duplicate reports (keep the earliest submission per
--    attendance record) so the unique index can be created.
DELETE FROM public.reports a
USING public.reports b
WHERE a.attendance_record_id = b.attendance_record_id
  AND a.submitted_at > b.submitted_at;

-- 2. One report per attendance record (database-level duplicate protection).
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_attendance_unique
  ON public.reports(attendance_record_id);
