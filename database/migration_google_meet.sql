-- Migration: Replace Jitsi with Google Meet
-- Run this in Supabase SQL Editor if you already ran schema.sql
-- (If setting up fresh, the updated schema.sql below replaces this)

ALTER TABLE sessions
  DROP COLUMN IF EXISTS jitsi_room_id,
  ADD COLUMN IF NOT EXISTS meet_uri        TEXT,
  ADD COLUMN IF NOT EXISTS meet_space_name TEXT;

COMMENT ON COLUMN sessions.meet_uri IS 'Google Meet URL e.g. https://meet.google.com/abc-defg-hij';
COMMENT ON COLUMN sessions.meet_space_name IS 'Google Meet API space name e.g. spaces/abc123';
