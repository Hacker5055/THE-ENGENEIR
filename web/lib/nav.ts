import type { IconName } from "@/components/icons";
import type { Permission, Role } from "@/lib/types";

export interface NavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  icon: IconName;
  permission?: Permission;
  badgeKey?: "attemptReviews" | "complaints" | "grading" | "incidents";
}

export interface NavGroup {
  labelAr: string;
  labelEn: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    labelAr: "القيادة",
    labelEn: "Command",
    items: [
      { href: "/admin", labelAr: "نظرة عامة", labelEn: "Overview", icon: "grid", permission: "student.view_all" },
      { href: "/admin/exam-control", labelAr: "مركز مراقبة الاختبارات", labelEn: "Exam control center", icon: "shield-alert", permission: "exam.monitor", badgeKey: "incidents" },
      { href: "/admin/analytics", labelAr: "التحليلات", labelEn: "Analytics", icon: "chart", permission: "student.view_all" },
    ],
  },
  {
    labelAr: "الشؤون الأكاديمية",
    labelEn: "Academics",
    items: [
      { href: "/admin/students", labelAr: "الطلاب", labelEn: "Students", icon: "users", permission: "student.view_all" },
      { href: "/admin/teachers", labelAr: "المعلمون", labelEn: "Teachers", icon: "id-card", permission: "teacher.view_all" },
      { href: "/admin/courses", labelAr: "المقررات", labelEn: "Courses", icon: "book", permission: "academic.manage" },
      { href: "/admin/academics", labelAr: "الأقسام والسنوات", labelEn: "Departments & years", icon: "building", permission: "academic.manage" },
      { href: "/admin/timetable", labelAr: "الجداول", labelEn: "Timetable", icon: "calendar", permission: "academic.manage" },
    ],
  },
  {
    labelAr: "التقييم والحضور",
    labelEn: "Assessment",
    items: [
      { href: "/admin/exams", labelAr: "الاختبارات", labelEn: "Examinations", icon: "file-text", permission: "exam.manage" },
      { href: "/admin/questions", labelAr: "بنك الأسئلة", labelEn: "Question bank", icon: "layers", permission: "question.manage" },
      { href: "/admin/grades", labelAr: "الدرجات", labelEn: "Grades", icon: "percent", permission: "grade.view_all" },
      { href: "/admin/attendance", labelAr: "تقارير الحضور", labelEn: "Attendance reports", icon: "qr", permission: "attendance.view_all" },
    ],
  },
  {
    labelAr: "العمليات",
    labelEn: "Operations",
    items: [
      { href: "/admin/complaints", labelAr: "الطلبات والاستئنافات", labelEn: "Requests & appeals", icon: "message", permission: "complaint.manage", badgeKey: "complaints" },
      { href: "/admin/notifications", labelAr: "مركز الإشعارات", labelEn: "Notifications", icon: "bell", permission: "notification.manage" },
      { href: "/admin/devices", labelAr: "الأجهزة والثقة", labelEn: "Devices & trust", icon: "smartphone", permission: "device.manage" },
    ],
  },
  {
    labelAr: "الحوكمة",
    labelEn: "Governance",
    items: [
      { href: "/admin/reports", labelAr: "التقارير والتصدير", labelEn: "Reports & export", icon: "printer", permission: "report.export" },
      { href: "/admin/audit", labelAr: "سجل التدقيق", labelEn: "Audit log", icon: "list-checks", permission: "audit.view" },
      { href: "/admin/roles", labelAr: "الأدوار والصلاحيات", labelEn: "Roles & permissions", icon: "key", permission: "role.manage" },
      { href: "/admin/institutions", labelAr: "المؤسسات", labelEn: "Institutions", icon: "globe", permission: "institution.manage" },
      { href: "/admin/settings", labelAr: "إعدادات المؤسسة", labelEn: "Institution settings", icon: "settings", permission: "settings.manage" },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    labelAr: "التدريس",
    labelEn: "Teaching",
    items: [
      { href: "/teacher", labelAr: "نظرة عامة", labelEn: "Overview", icon: "grid" },
      { href: "/teacher/classes", labelAr: "الفصول", labelEn: "Classes", icon: "users" },
      { href: "/teacher/attendance", labelAr: "جلسات الحضور", labelEn: "Attendance sessions", icon: "qr" },
    ],
  },
  {
    labelAr: "التقييم",
    labelEn: "Assessment",
    items: [
      { href: "/teacher/exams", labelAr: "الاختبارات", labelEn: "Examinations", icon: "file-text" },
      { href: "/teacher/questions", labelAr: "بنك الأسئلة", labelEn: "Question bank", icon: "layers" },
      { href: "/teacher/grading", labelAr: "طابور التصحيح", labelEn: "Grading queue", icon: "edit", badgeKey: "grading" },
      { href: "/teacher/grades", labelAr: "إدارة الدرجات", labelEn: "Grade management", icon: "percent" },
    ],
  },
  {
    labelAr: "الحساب",
    labelEn: "Account",
    items: [{ href: "/teacher/profile", labelAr: "ملفي", labelEn: "My profile", icon: "user" }],
  },
];

export const STUDENT_MORE = [
  { href: "/student/profile", labelAr: "الملف الشخصي", labelEn: "Profile", icon: "user" as IconName },
  { href: "/student/id", labelAr: "الهوية الرقمية", labelEn: "Digital ID", icon: "id-card" as IconName },
  { href: "/student/courses", labelAr: "المقررات", labelEn: "Courses", icon: "book" as IconName },
  { href: "/student/results", labelAr: "النتائج", labelEn: "Results", icon: "percent" as IconName },
  { href: "/student/transcript", labelAr: "السجل الأكاديمي", labelEn: "Transcript", icon: "file-text" as IconName },
  { href: "/student/analytics", labelAr: "تحليلات الأداء", labelEn: "Analytics", icon: "chart" as IconName },
  { href: "/student/notifications", labelAr: "الإشعارات", labelEn: "Notifications", icon: "bell" as IconName },
  { href: "/student/complaints", labelAr: "الطلبات", labelEn: "Requests", icon: "message" as IconName },
  { href: "/student/security", labelAr: "الأمان والأجهزة", labelEn: "Security & devices", icon: "shield" as IconName },
  { href: "/student/settings", labelAr: "الإعدادات", labelEn: "Settings", icon: "settings" as IconName },
];

export function navForRole(role: Role): NavGroup[] {
  if (role === "TEACHER") return TEACHER_NAV;
  return ADMIN_NAV;
}
