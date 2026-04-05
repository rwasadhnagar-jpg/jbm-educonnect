-- JBM EduConnect — Supabase Database Schema
-- Run this FIRST in the Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  location   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLASS GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS class_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  grade      INT NOT NULL CHECK (grade BETWEEN -1 AND 12),  -- -1=Nursery, 0=Prep, 1-12=Class 1-12
  section    TEXT NOT NULL DEFAULT 'A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, grade, section)
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID REFERENCES schools(id) ON DELETE SET NULL,
  username          TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('student','teacher','admin','sub_admin','parent')),
  full_name         TEXT NOT NULL,
  email             TEXT,
  class_group_id    UUID REFERENCES class_groups(id) ON DELETE SET NULL,
  parent_of_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  fcm_token         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_class_group ON users(class_group_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);

-- ============================================================
-- HOMEWORK
-- ============================================================
CREATE TABLE IF NOT EXISTS homework (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  type           TEXT NOT NULL CHECK (type IN ('text','pdf','quiz')),
  due_date       DATE NOT NULL,
  file_path      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_class_group ON homework(class_group_id);
CREATE INDEX IF NOT EXISTS idx_homework_created_by  ON homework(created_by);
CREATE INDEX IF NOT EXISTS idx_homework_due_date    ON homework(due_date);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id    UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  options        JSONB NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 0 AND 9),
  order_index    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_homework ON quiz_questions(homework_id);

-- ============================================================
-- QUIZ ANSWERS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option INT,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_student  ON quiz_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);

-- ============================================================
-- SESSIONS (VIDEO CLASSES)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  teacher_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  meet_uri        TEXT,
  meet_space_name TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_sessions_class_group ON sessions(class_group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher     ON sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status      ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time  ON sessions(start_time);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('homework','session','info','alert')),
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER homework_updated_at BEFORE UPDATE ON homework FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id             UUID REFERENCES schools(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  message               TEXT NOT NULL,
  target_class_group_id UUID REFERENCES class_groups(id) ON DELETE SET NULL,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_school ON announcements(school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class  ON announcements(target_class_group_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS max_marks INT;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Homework' CHECK (category IN ('Homework','Classwork','Project','Test'));

-- ============================================================
-- HOMEWORK SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS homework_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id   UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_response TEXT,
  marks_obtained NUMERIC,
  graded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at     TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (homework_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_homework ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student  ON homework_submissions(student_id);

-- ============================================================
-- SESSION ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS session_attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent')),
  marked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON session_attendance(student_id);

-- Additional columns for existing tables
ALTER TABLE users    ADD COLUMN IF NOT EXISTS last_login  TIMESTAMPTZ;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS teacher_remark TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
