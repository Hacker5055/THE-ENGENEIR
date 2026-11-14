import { BottomNav, PhoneFrame } from "@/components/shells/mobile-shell";
import { STUDENT_MORE } from "@/lib/nav";
import { db } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { student, courses } = await studentContext();
  const liveExams = db().examinations.filter(
    (e) => e.status === "LIVE" && courses.some((c) => c.id === e.courseId),
  ).length;

  const items = [
    { href: "/student", labelAr: "الرئيسية", labelEn: "Home", icon: "home" as const },
    { href: "/student/attendance", labelAr: "الحضور", labelEn: "Attendance", icon: "qr" as const },
    { href: "/student/timetable", labelAr: "الجدول", labelEn: "Timetable", icon: "calendar" as const },
    { href: "/student/exams", labelAr: "الاختبارات", labelEn: "Exams", icon: "file-text" as const, badge: liveExams },
  ];

  return (
    <PhoneFrame>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-slim">{children}</div>
        <BottomNav items={items} more={{ title: "جميع الوحدات", links: STUDENT_MORE }} />
      </div>
    </PhoneFrame>
  );
}
