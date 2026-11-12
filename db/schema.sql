-- ============================================================================
--  AL MOHANDES — PostgreSQL 16 schema
--  Multi-tenant academic operations + secure examination engine.
--
--  Conventions
--    · every business table carries institution_id (tenancy by mandatory scope)
--    · UUID primary keys, created_at/updated_at in timestamptz
--    · soft delete via archived_at on academic entities
--    · exam_events and audit_logs are append-only (no UPDATE / DELETE grants)
--
--  Run:  psql "$DATABASE_URL" -f db/schema.sql
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- ---------------------------------------------------------------------------
-- Enumerated domains
-- ---------------------------------------------------------------------------
CREATE TYPE user_role          AS ENUM ('SUPER_ADMIN','INSTITUTION_ADMIN','EXAM_SUPERVISOR','TEACHER','STUDENT');
CREATE TYPE account_status     AS ENUM ('ACTIVE','INVITED','SUSPENDED','DISABLED');
CREATE TYPE academic_standing  AS ENUM ('ACTIVE','PROBATION','GRADUATED','SUSPENDED');
CREATE TYPE semester_status    AS ENUM ('PLANNED','ACTIVE','CLOSED');
CREATE TYPE attendance_status  AS ENUM ('PRESENT','LATE','ABSENT','EXCUSED');
CREATE TYPE attendance_method  AS ENUM ('QR','MANUAL','GEOFENCE','TEACHER_OVERRIDE');
CREATE TYPE session_status     AS ENUM ('OPEN','CLOSED');
CREATE TYPE question_type      AS ENUM ('MCQ','TRUE_FALSE','ESSAY','FILL_BLANK','MATCHING','IMAGE','FILE');
CREATE TYPE difficulty         AS ENUM ('EASY','MEDIUM','HARD');
CREATE TYPE exam_status        AS ENUM ('DRAFT','SCHEDULED','LIVE','CLOSED');
CREATE TYPE security_policy    AS ENUM ('STANDARD','STRICT','LOCKDOWN');
CREATE TYPE attempt_status     AS ENUM ('NOT_STARTED','IN_PROGRESS','SUBMITTED','GRADING','GRADED','FLAGGED','LOCKED','CANCELLED','EXPIRED');
CREATE TYPE event_severity     AS ENUM ('INFO','WARNING','CRITICAL');
CREATE TYPE complaint_status   AS ENUM ('OPEN','UNDER_REVIEW','WAITING_FOR_STUDENT','RESOLVED','REJECTED');
CREATE TYPE complaint_category AS ENUM ('ATTENDANCE_CORRECTION','GRADE_APPEAL','EXAM_INCIDENT','TECHNICAL','GENERAL');

-- ---------------------------------------------------------------------------
-- Tenancy & identity
-- ---------------------------------------------------------------------------
CREATE TABLE institutions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name_ar       text NOT NULL,
  name_en       text NOT NULL,
  city          text NOT NULL,
  domain        citext NOT NULL,
  plan          text NOT NULL CHECK (plan IN ('Enterprise','Campus','Institute')),
  status        text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','TRIAL','SUSPENDED')),
  timezone      text NOT NULL DEFAULT 'Africa/Cairo',
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz
);

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
  email           citext NOT NULL,
  password_hash   text NOT NULL,
  role            user_role NOT NULL,
  name_ar         text NOT NULL,
  name_en         text NOT NULL,
  title           text,
  avatar_hue      int NOT NULL DEFAULT 200,
  status          account_status NOT NULL DEFAULT 'ACTIVE',
  mfa_enabled     boolean NOT NULL DEFAULT true,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, email)
);

-- Short-lived second factor challenges. Rows are purged by a janitor job.
CREATE TABLE otp_challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash     text NOT NULL,
  attempts      smallint NOT NULL DEFAULT 0,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (attempts BETWEEN 0 AND 5)
);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,
  user_agent    text,
  ip            inet,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  expires_at    timestamptz NOT NULL
);

CREATE TABLE devices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL,
  label         text NOT NULL,
  platform      text NOT NULL CHECK (platform IN ('ANDROID','IOS','WEB')),
  model         text,
  fingerprint   text NOT NULL,
  managed       boolean NOT NULL DEFAULT false,
  trusted       boolean NOT NULL DEFAULT false,
  status        text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED')),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, fingerprint)
);

-- ---------------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  code           text NOT NULL,
  name_ar        text NOT NULL,
  name_en        text NOT NULL,
  color          text NOT NULL DEFAULT '#2864D9',
  head_id        uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

CREATE TABLE academic_years (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  label          text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  status         semester_status NOT NULL DEFAULT 'PLANNED',
  UNIQUE (institution_id, label)
);

CREATE TABLE semesters (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year_id        uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name_ar        text NOT NULL,
  name_en        text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  status         semester_status NOT NULL DEFAULT 'PLANNED'
);

CREATE TABLE sections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id  uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  name_ar        text NOT NULL,
  name_en        text NOT NULL,
  level          smallint NOT NULL CHECK (level BETWEEN 1 AND 6),
  room           text,
  advisor_id     uuid,
  student_count  int NOT NULL DEFAULT 0
);

CREATE TABLE teachers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id  uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  title          text NOT NULL,
  phone          text,
  office_room    text,
  office_hours   text,
  rating         numeric(2,1) CHECK (rating BETWEEN 0 AND 5),
  status         text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ON_LEAVE')),
  joined_at      date NOT NULL DEFAULT current_date
);

CREATE TABLE students (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_number  text NOT NULL,
  department_id   uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  section_id      uuid NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  level           smallint NOT NULL CHECK (level BETWEEN 1 AND 6),
  academic_status academic_standing NOT NULL DEFAULT 'ACTIVE',
  gpa             numeric(3,2) NOT NULL DEFAULT 0 CHECK (gpa BETWEEN 0 AND 4),
  advisor_id      uuid REFERENCES teachers(id) ON DELETE SET NULL,
  enrolled_at     date NOT NULL DEFAULT current_date,
  UNIQUE (institution_id, student_number)
);

CREATE TABLE courses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id  uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  section_id     uuid NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  teacher_id     uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  code           text NOT NULL,
  name_ar        text NOT NULL,
  name_en        text NOT NULL,
  credits        smallint NOT NULL CHECK (credits BETWEEN 1 AND 8),
  level          smallint NOT NULL,
  progress       smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  color          text NOT NULL DEFAULT '#2864D9',
  description_ar text,
  description_en text,
  status         text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  archived_at    timestamptz,
  UNIQUE (institution_id, code)
);

CREATE TABLE enrollments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  dropped_at  timestamptz,
  UNIQUE (student_id, course_id, semester_id)
);

CREATE TABLE schedule_slots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id     uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  teacher_id     uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  day_of_week    smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  room           text NOT NULL,
  kind           text NOT NULL DEFAULT 'LECTURE' CHECK (kind IN ('LECTURE','LAB','TUTORIAL')),
  CHECK (end_time > start_time)
);

CREATE TABLE lecture_notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_ar       text NOT NULL,
  week           smallint NOT NULL CHECK (week BETWEEN 1 AND 20),
  kind           text NOT NULL CHECK (kind IN ('SLIDES','VIDEO','PDF','ASSIGNMENT')),
  size_label     text,
  duration_min   int,
  published_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
CREATE TABLE attendance_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id     uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  teacher_id     uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  session_date   date NOT NULL DEFAULT current_date,
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  room           text,
  status         session_status NOT NULL DEFAULT 'OPEN',
  qr_token       text NOT NULL,
  qr_expires_at  timestamptz NOT NULL,
  geo_lat        numeric(9,6) NOT NULL,
  geo_lng        numeric(9,6) NOT NULL,
  geo_radius_m   int NOT NULL CHECK (geo_radius_m BETWEEN 25 AND 500),
  geo_label      text NOT NULL,
  expected_count int NOT NULL DEFAULT 0,
  opened_at      timestamptz NOT NULL DEFAULT now(),
  closed_at      timestamptz,
  UNIQUE (qr_token)
);

CREATE INDEX idx_attendance_sessions_open
  ON attendance_sessions (course_id, status) WHERE status = 'OPEN';

CREATE TABLE attendance_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  record_date   date NOT NULL,
  status        attendance_status NOT NULL,
  method        attendance_method NOT NULL,
  marked_at     timestamptz NOT NULL DEFAULT now(),
  marked_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  note          text,
  geo_distance_m numeric(8,2),
  device_id     uuid REFERENCES devices(id) ON DELETE SET NULL,
  UNIQUE (session_id, student_id)
);

CREATE INDEX idx_attendance_student_course
  ON attendance_records (student_id, course_id, record_date DESC);

-- ---------------------------------------------------------------------------
-- Question bank & examinations
-- ---------------------------------------------------------------------------
CREATE TABLE questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id     uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  type           question_type NOT NULL,
  difficulty     difficulty NOT NULL DEFAULT 'MEDIUM',
  prompt_ar      text NOT NULL,
  prompt_en      text NOT NULL,
  options        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{id,textAr,textEn}]
  correct        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- option ids or accepted strings
  marks          numeric(4,1) NOT NULL CHECK (marks > 0),
  image_url      text,
  explanation_ar text,
  tags           text[] NOT NULL DEFAULT '{}',
  usage_count    int NOT NULL DEFAULT 0,
  version        int NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  archived_at    timestamptz
);

CREATE TABLE examinations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  course_id           uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  section_id          uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  teacher_id          uuid NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  code                text NOT NULL,
  title_ar            text NOT NULL,
  title_en            text NOT NULL,
  instructions_ar     jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NOT NULL,
  duration_min        int NOT NULL CHECK (duration_min BETWEEN 5 AND 240),
  total_marks         numeric(5,1) NOT NULL,
  passing_marks       numeric(5,1) NOT NULL,
  status              exam_status NOT NULL DEFAULT 'DRAFT',
  policy              security_policy NOT NULL DEFAULT 'STANDARD',
  randomize_questions boolean NOT NULL DEFAULT false,
  randomize_options   boolean NOT NULL DEFAULT false,
  allowed_attempts    smallint NOT NULL DEFAULT 1 CHECK (allowed_attempts BETWEEN 1 AND 3),
  auto_grade          boolean NOT NULL DEFAULT true,
  max_violations      smallint NOT NULL DEFAULT 3 CHECK (max_violations BETWEEN 1 AND 10),
  lock_on_violation   boolean NOT NULL DEFAULT false,
  geo_required        boolean NOT NULL DEFAULT false,
  result_published    boolean NOT NULL DEFAULT false,
  published_at        timestamptz,
  CHECK (ends_at > starts_at)
);

CREATE TABLE exam_questions (
  examination_id uuid NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
  question_id    uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  position       smallint NOT NULL,
  marks_override numeric(4,1),
  PRIMARY KEY (examination_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Attempts, answers, integrity events
-- ---------------------------------------------------------------------------
CREATE TABLE exam_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  examination_id   uuid NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
  student_id       uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status           attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
  started_at       timestamptz,
  ends_at          timestamptz,           -- authoritative deadline (server clock only)
  submitted_at     timestamptz,
  graded_at        timestamptz,
  published_at     timestamptz,
  extra_time_min   int NOT NULL DEFAULT 0,
  question_order   uuid[] NOT NULL DEFAULT '{}',
  violations       smallint NOT NULL DEFAULT 0,
  score            numeric(5,1),
  max_score        numeric(5,1) NOT NULL,
  passed           boolean,
  device_id        text,
  device_label     text,
  ip               inet,
  last_heartbeat   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (examination_id, student_id)
);

CREATE INDEX idx_attempts_exam_status ON exam_attempts (examination_id, status);
CREATE INDEX idx_attempts_student     ON exam_attempts (student_id, started_at DESC);

CREATE TABLE exam_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id    uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  value         jsonb NOT NULL DEFAULT '[]'::jsonb,
  text_value    text,
  revision      int NOT NULL DEFAULT 1,
  flagged       boolean NOT NULL DEFAULT false,
  awarded_marks numeric(4,1),
  feedback      text,
  graded_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  graded_at     timestamptz,
  saved_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- Append-only: the application only INSERTs here.
CREATE TABLE exam_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  attempt_id     uuid NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  examination_id uuid NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type           text NOT NULL,
  severity       event_severity NOT NULL,
  server_time    timestamptz NOT NULL DEFAULT now(),
  client_time    timestamptz,
  detail_ar      text NOT NULL,
  detail_en      text NOT NULL,
  device_label   text,
  actor_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  reason         text
);

CREATE INDEX idx_events_attempt_time ON exam_events (attempt_id, server_time DESC);
CREATE INDEX idx_events_exam_severity ON exam_events (examination_id, severity);

-- ---------------------------------------------------------------------------
-- Grades
-- ---------------------------------------------------------------------------
CREATE TABLE grades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id      uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  semester_id    uuid NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  coursework     numeric(4,1) NOT NULL DEFAULT 0 CHECK (coursework BETWEEN 0 AND 20),
  midterm        numeric(4,1) NOT NULL DEFAULT 0 CHECK (midterm BETWEEN 0 AND 20),
  final          numeric(4,1) NOT NULL DEFAULT 0 CHECK (final BETWEEN 0 AND 60),
  total          numeric(4,1) NOT NULL DEFAULT 0 CHECK (total BETWEEN 0 AND 100),
  letter         text NOT NULL DEFAULT 'F',
  points         numeric(3,2) NOT NULL DEFAULT 0,
  published      boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, semester_id)
);

-- ---------------------------------------------------------------------------
-- Communications, requests, audit
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audience_role  user_role NOT NULL,
  category       text NOT NULL,
  title_ar       text NOT NULL,
  title_en       text NOT NULL,
  body_ar        text NOT NULL,
  body_en        text NOT NULL,
  href           text,
  priority       text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','HIGH')),
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE complaints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  ticket          text NOT NULL UNIQUE,
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category        complaint_category NOT NULL,
  subject         text NOT NULL,
  body            text NOT NULL,
  status          complaint_status NOT NULL DEFAULT 'OPEN',
  related_course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  assigned_to     uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution      text,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE complaint_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role user_role NOT NULL,
  body        text NOT NULL,
  internal    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaints_status ON complaints (institution_id, status, updated_at DESC);

CREATE TABLE audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  at             timestamptz NOT NULL DEFAULT now(),
  actor_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name     text NOT NULL,
  actor_role     user_role NOT NULL,
  action         text NOT NULL,
  action_ar      text NOT NULL,
  target         text NOT NULL,
  reason         text,
  ip             inet,
  severity       event_severity NOT NULL DEFAULT 'INFO'
);

CREATE INDEX idx_audit_actor_time ON audit_logs (actor_id, at DESC);
CREATE INDEX idx_audit_institution_time ON audit_logs (institution_id, at DESC);

CREATE TABLE role_permissions (
  role       user_role NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);

-- ---------------------------------------------------------------------------
-- Integrity guards
-- ---------------------------------------------------------------------------
-- A student may never hold two live attempts for the same examination.
CREATE UNIQUE INDEX uq_attempt_single_live
  ON exam_attempts (examination_id, student_id)
  WHERE status IN ('IN_PROGRESS','FLAGGED','LOCKED');

-- Attendance can only be recorded into an open session.
CREATE OR REPLACE FUNCTION assert_session_open() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM attendance_sessions s
    WHERE s.id = NEW.session_id AND s.status = 'OPEN'
  ) AND NEW.method <> 'TEACHER_OVERRIDE' THEN
    RAISE EXCEPTION 'attendance_session_closed: %', NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assert_session_open
  BEFORE INSERT ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION assert_session_open();

-- Never allow an answer write to go backwards in revision.
CREATE OR REPLACE FUNCTION guard_answer_revision() RETURNS trigger AS $$
BEGIN
  IF NEW.revision < OLD.revision THEN
    RAISE EXCEPTION 'stale_revision: attempt % question %', NEW.attempt_id, NEW.question_id;
  END IF;
  NEW.saved_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guard_answer_revision
  BEFORE UPDATE ON exam_answers
  FOR EACH ROW EXECUTE FUNCTION guard_answer_revision();

-- Deny mutation of append-only tables at the database level.
REVOKE UPDATE, DELETE ON exam_events, audit_logs FROM PUBLIC;

COMMIT;

-- ---------------------------------------------------------------------------
-- Reporting views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_student_attendance AS
SELECT r.student_id,
       r.course_id,
       count(*)                                                          AS records,
       count(*) FILTER (WHERE r.status IN ('PRESENT','LATE'))             AS attended,
       round(100.0 * count(*) FILTER (WHERE r.status IN ('PRESENT','LATE'))
             / NULLIF(count(*), 0), 1)                                    AS rate
FROM attendance_records r
GROUP BY r.student_id, r.course_id;

CREATE OR REPLACE VIEW v_exam_integrity AS
SELECT a.examination_id,
       a.id                    AS attempt_id,
       a.student_id,
       a.status,
       a.violations,
       count(e.id)             AS events,
       count(e.id) FILTER (WHERE e.severity = 'CRITICAL') AS critical_events
FROM exam_attempts a
LEFT JOIN exam_events e ON e.attempt_id = a.id
GROUP BY a.examination_id, a.id, a.student_id, a.status, a.violations;
