import type { Metadata } from "next";
import { AppShell } from "@/components/shells/app-shell";
import { TEACHER_NAV } from "@/lib/nav";
import { teacherContext } from "@/lib/server/context";
import { db } from "@/lib/server/store";

export const metadata: Metadata = { title: { default: "لوحة المعلم", template: "%s · المهندس" } };

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, unread, courses } = await teacherContext();
  const courseIds = new Set(courses.map((c) => c.id));
  const examIds = new Set(db().examinations.filter((e) => courseIds.has(e.courseId)).map((e) => e.id));
  const grading = db().attempts.filter((a) => examIds.has(a.examinationId) && (a.status === "SUBMITTED" || a.status === "GRADING")).length;

  return (
    <AppShell user={user} nav={TEACHER_NAV} notificationsHref="/teacher" unread={unread} badges={{ grading }}>
      {children}
    </AppShell>
  );
}
