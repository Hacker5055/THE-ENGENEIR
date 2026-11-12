/* Shared domain types for AL MOHANDES. Mirrors the PostgreSQL schema in /db. */

export type Locale = "ar" | "en";
export type Theme = "dark" | "light";

export type Role =
  | "SUPER_ADMIN"
  | "INSTITUTION_ADMIN"
  | "EXAM_SUPERVISOR"
  | "TEACHER"
  | "STUDENT";

export type Permission =
  | "institution.manage"
  | "institution.view_all"
  | "user.manage"
  | "student.view_all"
  | "teacher.view_all"
  | "academic.manage"
  | "attendance.view_all"
  | "attendance.record"
  | "exam.manage"
  | "exam.monitor"
  | "exam.incident.decide"
  | "question.manage"
  | "grade.view_all"
  | "grade.edit"
  | "device.manage"
  | "complaint.manage"
  | "notification.manage"
  | "report.export"
  | "audit.view"
  | "role.manage"
  | "settings.manage"
  | "self.read";

export interface Institution {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  city: string;
  domain: string;
  students: number;
  teachers: number;
  departments: number;
  plan: "Enterprise" | "Campus" | "Institute";
  status: "ACTIVE" | "TRIAL" | "SUSPENDED";
}

export interface Department {
  id: string;
  institutionId: string;
  nameAr: string;
  nameEn: string;
  code: string;
  headId: string;
  color: string;
  students: number;
  courses: number;
  avgAttendance: number;
  avgGpa: number;
}

export interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "ARCHIVED" | "PLANNED";
  semesters: Semester[];
}

export interface Semester {
  id: string;
  yearId: string;
  nameAr: string;
  nameEn: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "CLOSED" | "PLANNED";
}

export interface Teacher {
  id: string;
  institutionId: string;
  nameAr: string;
  nameEn: string;
  title: string;
  email: string;
  phone: string;
  departmentId: string;
  courseIds: string[];
  officeRoom: string;
  officeHours: string;
  joinedAt: string;
  rating: number;
  status: "ACTIVE" | "ON_LEAVE";
}

export interface Student {
  id: string;
  institutionId: string;
  nameAr: string;
  nameEn: string;
  studentNumber: string;
  email: string;
  phone: string;
  departmentId: string;
  level: 1 | 2 | 3 | 4;
  sectionId: string;
  academicStatus: "ACTIVE" | "PROBATION" | "GRADUATED" | "SUSPENDED";
  gpa: number;

  /** Percentage 0-100 */
  attendanceRate: number;
  credits: number;
  enrolledCourseIds: string[];
  advisorId: string;
  joinedAt: string;
  nationalIdMasked: string;
  avatarHue: number;
  birthDate: string;
  address: string;
  riskBand: "LOW" | "MEDIUM" | "HIGH";
}

export interface Course {
  id: string;
  institutionId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  credits: number;
  departmentId: string;
  level: number;
  teacherId: string;
  sectionId: string;
  enrolledCount: number;
  progress: number;
  color: string;
  descriptionAr: string;
  descriptionEn: string;
  status: "ACTIVE" | "ARCHIVED";
}

export interface ClassSection {
  id: string;
  nameAr: string;
  nameEn: string;
  departmentId: string;
  level: number;
  room: string;
  studentCount: number;
  advisorId: string;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleSlot {
  id: string;
  courseId: string;
  sectionId: string;
  teacherId: string;
  day: Weekday;
  start: string; // HH:mm
  end: string;
  room: string;
  type: "LECTURE" | "LAB" | "TUTORIAL";
}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceMethod = "QR" | "MANUAL" | "GEOFENCE" | "TEACHER_OVERRIDE";

export interface AttendanceSession {
  id: string;
  courseId: string;
  sectionId: string;
  teacherId: string;
  date: string;
  start: string;
  end: string;
  room: string;
  status: "OPEN" | "CLOSED";
  openedAt: number;
  closedAt?: number;
  qrToken: string;
  qrExpiresAt: number;
  presentCount: number;
  lateCount: number;
  expectedCount: number;
  geo: { lat: number; lng: number; radiusM: number; label: string };
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  courseId: string;
  date: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  markedAt: number;
  markedBy?: string;
  note?: string;
  geoDistanceM?: number;
  deviceId?: string;
}

export type QuestionType =
  | "MCQ"
  | "TRUE_FALSE"
  | "ESSAY"
  | "FILL_BLANK"
  | "MATCHING"
  | "IMAGE"
  | "FILE";

export interface QuestionOption {
  id: string;
  textAr: string;
  textEn: string;
}

export interface Question {
  id: string;
  courseId: string;
  teacherId: string;
  type: QuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  promptAr: string;
  promptEn: string;
  options: QuestionOption[];
  /** ids of correct options, or accepted text answers for FILL_BLANK */
  correct: string[];
  marks: number;
  imageUrl?: string;
  explanationAr?: string;
  usageCount: number;
  createdAt: string;
}

export type SecurityPolicy = "STANDARD" | "STRICT" | "LOCKDOWN";

export interface Examination {
  id: string;
  code: string;
  courseId: string;
  sectionId: string;
  teacherId: string;
  titleAr: string;
  titleEn: string;
  instructionsAr: string[];
  startsAt: number;
  endsAt: number;
  durationMin: number;
  totalMarks: number;
  passingMarks: number;
  questionIds: string[];
  status: "DRAFT" | "SCHEDULED" | "LIVE" | "CLOSED";
  policy: SecurityPolicy;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowedAttempts: number;
  autoGrade: boolean;
  resultPublished: boolean;
  poolCount: number;
  maxViolations: number;
  lockOnViolation: boolean;
  geoRequired: boolean;
}

export type AttemptStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "GRADING"
  | "GRADED"
  | "FLAGGED"
  | "LOCKED"
  | "CANCELLED"
  | "EXPIRED";

export interface AttemptAnswer {
  questionId: string;
  /** indexes/ids of selected options; text for essays/fill; file name for file uploads */
  value: string[];
  textValue?: string;
  savedAt: number;
  revision: number;
  flagged: boolean;
  awardedMarks?: number;
  gradedBy?: string;
  gradedAt?: number;
  feedback?: string;
}

export interface ExaminationAttempt {
  id: string;
  examinationId: string;
  studentId: string;
  status: AttemptStatus;
  startedAt?: number;
  endsAt?: number;
  submittedAt?: number;
  serverNowOffsetMs: number;
  questionOrder: string[];
  answers: AttemptAnswer[];
  violations: number;
  score?: number;
  maxScore: number;
  passed?: boolean;
  deviceId: string;
  deviceLabel: string;
  ip: string;
  lastHeartbeat: number;
  gradedAt?: number;
  publishedAt?: number;
  extraTimeMin?: number;
}

export type EventSeverity = "INFO" | "WARNING" | "CRITICAL";
export type ExamEventType =
  | "EXAM_STARTED"
  | "APP_BACKGROUNDED"
  | "FOCUS_LOST"
  | "SPLIT_SCREEN"
  | "SCREENSHOT_ATTEMPT"
  | "UNAUTHORIZED_APP"
  | "DEVICE_MISMATCH"
  | "NETWORK_LOST"
  | "NETWORK_RESTORED"
  | "SESSION_FROZEN"
  | "SESSION_RESUMED"
  | "TIME_EXTENDED"
  | "ANSWER_SAVED"
  | "WORK_SAVED_ON_SUBMIT"
  | "EXAM_SUBMITTED"
  | "ATTEMPT_RESET"
  | "ATTEMPT_CANCELLED"
  | "SUPERVISOR_DECISION";

export interface ExaminationEvent {
  id: string;
  attemptId: string;
  examinationId: string;
  studentId: string;
  type: ExamEventType;
  severity: EventSeverity;
  serverTime: number;
  clientTime?: number;
  detailAr: string;
  detailEn: string;
  actorId?: string;
  reason?: string;
  deviceLabel: string;
}

export interface DeviceRegistration {
  id: string;
  studentId: string;
  label: string;
  platform: "ANDROID" | "IOS" | "WEB";
  model: string;
  managed: boolean;
  trusted: boolean;
  lastSeenAt: number;
  registeredAt: string;
  fingerprint: string;
  status: "ACTIVE" | "REVOKED";
}

export interface GradeRecord {
  id: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  coursework: number;
  midterm: number;
  final: number;
  total: number;
  letter: string;
  points: number;
  published: boolean;
}

export type NotificationCategory =
  | "ATTENDANCE"
  | "ABSENCE"
  | "EXAM"
  | "RESULT"
  | "SCHEDULE"
  | "ANNOUNCEMENT"
  | "ADMIN"
  | "COMPLAINT";

export interface AppNotification {
  id: string;
  userId: string;
  audienceRole: Role;
  category: NotificationCategory;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  createdAt: number;
  read: boolean;
  href?: string;
  priority: "NORMAL" | "HIGH";
}

export type ComplaintStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "WAITING_FOR_STUDENT"
  | "RESOLVED"
  | "REJECTED";

export type ComplaintCategory =
  | "ATTENDANCE_CORRECTION"
  | "GRADE_APPEAL"
  | "EXAM_INCIDENT"
  | "TECHNICAL"
  | "GENERAL";

export interface ComplaintMessage {
  id: string;
  authorId: string;
  authorRole: Role;
  authorName: string;
  body: string;
  createdAt: number;
  internal: boolean;
}

export interface Complaint {
  id: string;
  ticket: string;
  studentId: string;
  category: ComplaintCategory;
  subject: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  status: ComplaintStatus;
  assignedToId?: string;
  assignedToName?: string;
  relatedCourseId?: string;
  attachments: { name: string; size: string }[];
  messages: ComplaintMessage[];
  resolution?: string;
}

export interface AuditLog {
  id: string;
  at: number;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  actionAr: string;
  target: string;
  reason?: string;
  ip: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export interface RoleDefinition {
  role: Role;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  permissions: Permission[];
  userCount: number;
  system: boolean;
}

export interface LectureNote {
  id: string;
  courseId: string;
  titleAr: string;
  week: number;
  publishedAt: string;
  type: "SLIDES" | "VIDEO" | "PDF" | "ASSIGNMENT";
  size?: string;
  durationMin?: number;
}

export interface SessionUser {
  id: string;
  nameAr: string;
  nameEn: string;
  role: Role;
  email: string;
  institutionId: string;
  studentId?: string;
  teacherId?: string;
  avatarHue: number;
  title?: string;
}
