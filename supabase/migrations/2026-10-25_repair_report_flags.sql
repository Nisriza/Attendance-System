-- ==============================================================================
-- GeoAttend repair: sync report_submitted flags with actual saved reports
-- Run ONCE in the Supabase SQL Editor (non-destructive, safe to re-run).
-- Fixes attendance rows whose flag update failed after the report was saved.
-- ==============================================================================

-- 1. Mark attendance records as report-submitted where a saved report exists.
UPDATE public.attendance_records a
SET report_submitted = true, report_id = r.id
FROM public.reports r
WHERE r.attendance_record_id = a.id
  AND a.report_submitted IS DISTINCT FROM true;

-- 2. Ensure every row has attendance_day (NULLs bypass the unique index).
UPDATE public.attendance_records
SET attendance_day = to_char(clock_in_time AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD')
WHERE attendance_day IS NULL;

-- 3. Detect duplicate daily attendance rows for manual review (no deletions).
-- SELECT student_id, attendance_day, COUNT(*)
-- FROM public.attendance_records
-- GROUP BY student_id, attendance_day
-- HAVING COUNT(*) > 1;
