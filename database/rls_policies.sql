-- JBM EduConnect — Row Level Security Policies
-- Run AFTER schema.sql

ALTER TABLE schools        ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_groups   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'role',
    'anonymous'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb->>'id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_class_group_id()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb->>'class_group_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE POLICY "schools_read" ON schools
  FOR SELECT USING (current_user_role() IN ('student','teacher','admin','parent'));

CREATE POLICY "schools_admin" ON schools
  FOR ALL USING (current_user_role() = 'admin');

-- ============================================================
-- CLASS GROUPS
-- ============================================================
CREATE POLICY "class_groups_read" ON class_groups
  FOR SELECT USING (current_user_role() IN ('student','teacher','admin','parent'));

CREATE POLICY "class_groups_admin" ON class_groups
  FOR ALL USING (current_user_role() = 'admin');

-- ============================================================
-- USERS — never expose password_hash to non-admins
-- ============================================================
CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (current_user_role() = 'admin');

CREATE POLICY "users_student_self" ON users
  FOR SELECT USING (
    current_user_role() = 'student' AND id = current_user_id()
  );

CREATE POLICY "users_teacher_read" ON users
  FOR SELECT USING (
    current_user_role() = 'teacher'
    AND school_id = (SELECT school_id FROM users WHERE id = current_user_id())
  );

CREATE POLICY "users_parent_read" ON users
  FOR SELECT USING (
    current_user_role() = 'parent'
    AND (
      id = current_user_id()
      OR id = (SELECT parent_of_user_id FROM users WHERE id = current_user_id())
    )
  );

CREATE POLICY "users_self_update_fcm" ON users
  FOR UPDATE USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- ============================================================
-- HOMEWORK
-- ============================================================
CREATE POLICY "homework_student_read" ON homework
  FOR SELECT USING (
    current_user_role() = 'student'
    AND class_group_id = current_class_group_id()
  );

CREATE POLICY "homework_teacher_read" ON homework
  FOR SELECT USING (
    current_user_role() = 'teacher' AND created_by = current_user_id()
  );

CREATE POLICY "homework_teacher_write" ON homework
  FOR INSERT WITH CHECK (
    current_user_role() = 'teacher' AND created_by = current_user_id()
  );

CREATE POLICY "homework_teacher_update" ON homework
  FOR UPDATE USING (
    current_user_role() = 'teacher' AND created_by = current_user_id()
  );

CREATE POLICY "homework_parent_read" ON homework
  FOR SELECT USING (
    current_user_role() = 'parent'
    AND class_group_id = (
      SELECT class_group_id FROM users
      WHERE id = (SELECT parent_of_user_id FROM users WHERE id = current_user_id())
    )
  );

CREATE POLICY "homework_admin_all" ON homework
  FOR ALL USING (current_user_role() = 'admin');

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE POLICY "quiz_questions_student_read" ON quiz_questions
  FOR SELECT USING (
    current_user_role() = 'student'
    AND homework_id IN (
      SELECT id FROM homework WHERE class_group_id = current_class_group_id()
    )
  );

CREATE POLICY "quiz_questions_teacher_admin" ON quiz_questions
  FOR ALL USING (current_user_role() IN ('teacher','admin'));

CREATE POLICY "quiz_questions_parent_read" ON quiz_questions
  FOR SELECT USING (current_user_role() = 'parent');

-- ============================================================
-- QUIZ ANSWERS
-- ============================================================
CREATE POLICY "quiz_answers_student_own" ON quiz_answers
  FOR ALL USING (
    current_user_role() = 'student' AND student_id = current_user_id()
  );

CREATE POLICY "quiz_answers_teacher_admin_read" ON quiz_answers
  FOR SELECT USING (current_user_role() IN ('teacher','admin'));

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE POLICY "sessions_student_read" ON sessions
  FOR SELECT USING (
    current_user_role() = 'student'
    AND class_group_id = current_class_group_id()
  );

CREATE POLICY "sessions_teacher_all" ON sessions
  FOR ALL USING (
    current_user_role() = 'teacher' AND teacher_id = current_user_id()
  );

CREATE POLICY "sessions_parent_read" ON sessions
  FOR SELECT USING (
    current_user_role() = 'parent'
    AND class_group_id = (
      SELECT class_group_id FROM users
      WHERE id = (SELECT parent_of_user_id FROM users WHERE id = current_user_id())
    )
  );

CREATE POLICY "sessions_admin_all" ON sessions
  FOR ALL USING (current_user_role() = 'admin');

-- ============================================================
-- NOTIFICATIONS — own rows only
-- ============================================================
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = current_user_id());

CREATE POLICY "notifications_admin" ON notifications
  FOR ALL USING (current_user_role() = 'admin');
