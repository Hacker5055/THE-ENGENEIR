import type { IconName } from "@/components/icons";

export const CATEGORY_LABEL: Record<string, { ar: string; en: string; icon: IconName }> = {
  ATTENDANCE_CORRECTION: { ar: "تصحيح حضور", en: "Attendance correction", icon: "calendar" },
  GRADE_APPEAL: { ar: "التماس درجة", en: "Grade appeal", icon: "percent" },
  EXAM_INCIDENT: { ar: "حادثة اختبار", en: "Exam incident", icon: "shield-alert" },
  TECHNICAL: { ar: "دعم فني", en: "Technical support", icon: "terminal" },
  GENERAL: { ar: "شكوى عامة", en: "General complaint", icon: "message" },
};
