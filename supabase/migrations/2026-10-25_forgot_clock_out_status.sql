-- ==============================================================================
-- GeoAttend migration: mark missed clock-outs as "forgot_clock_out"
-- - Adds a persisted status for sessions that are open at the end of a day.
-- - Backfills open records from previous attendance days.
-- Run ONCE in the Supabase SQL Editor (non-destructive, safe to re-run).
-- ==============================================================================

ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN ('clocked_in', 'clocked_out', 'forgot_clock_out'));

UPDATE public.attendance_records
SET status = 'forgot_clock_out'
WHERE status = 'clocked_in'
  AND to_char(clock_in_time AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD') <
      to_char(NOW() AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYYY-MM-DD');
