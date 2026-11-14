import Link from "next/link";
import { Avatar, Badge, Icon, Progress } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { db, findTeacher, gpaFor, studentAttendance } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDate, makeL } from "@/lib/utils";

export const metadata = { title: "الملف الشخصي" };

export default async function StudentProfilePage() {
  const { student, department, sectionName, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const attendance = studentAttendance(student.id);
  const advisor = findTeacher(student.advisorId);
  const gpa = gpaFor(student.id) || student.gpa;
  const publishedGrades = db().grades.filter((g) => g.studentId === student.id && g.published);

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("الملف الشخصي", "Profile")} unread={unread} right={
        <Link href="/student/settings" className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted" aria-label={l("الإعدادات", "Settings")}>
          <Icon name="settings" size={16} />
        </Link>
      } />

      <div className="space-y-4 px-4 pt-4">
        <section className="flex flex-col items-center rounded-2xl border border-line bg-surface p-5 text-center">
          <Avatar name={student.nameAr} hue={student.avatarHue} size={78} />
          <h1 className="mt-3 text-[15px] font-semibold text-fg">{student.nameAr}</h1>
          <p className="mt-0.5 text-[10.5px] text-fg-muted" dir="ltr">{student.nameEn}</p>
          <p className="tnum mt-1 font-mono text-[11px] text-accent-400" dir="ltr">{student.studentNumber}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <Badge tone="success" dot>{l("نشط", "Active")}</Badge>
            <Badge tone="neutral">{l(department.nameAr, department.nameEn)}</Badge>
            <Badge tone="accent">{l("المستوى", "Level")} {student.level}</Badge>
          </div>
          <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t border-line pt-3">
            {[
              [gpa.toFixed(2), l("المعدل", "GPA")],
              [`${attendance.rate}%`, l("الحضور", "Attendance")],
              [String(student.credits), l("الساعات", "Credits")],
            ].map(([v, k]) => (
              <div key={k}>
                <p className="tnum text-[15px] font-semibold text-fg">{v}</p>
                <p className="text-[9px] text-fg-muted">{k}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("البيانات الأكاديمية", "Academic record")}</p>
          <dl className="space-y-1.5 text-[10.5px]">
            {[
              [l("المؤسسة", "Institution"), l("أكاديمية المهندس للهندسة والتكنولوجيا", "AL MOHANDES Academy")],
              [l("القسم", "Department"), l(department.nameAr, department.nameEn)],
              [l("الشعبة", "Section"), sectionName],
              [l("المرشد الأكاديمي", "Academic advisor"), advisor?.nameAr ?? "—"],
              [l("تاريخ الالتحاق", "Enrolled on"), fmtDate(student.joinedAt, locale)],
              [l("العام الدراسي", "Academic year"), "2026 / 2027 · " + l("الفصل الأول", "Fall")],
              [l("الحالة الأكاديمية", "Academic status"), student.academicStatus === "ACTIVE" ? l("منتظم", "In good standing") : l("إنذار أكاديمي", "Probation")],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-fg-muted">{k}</dt>
                <dd className="text-end font-medium text-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("بيانات الاتصال", "Contact")}</p>
          <div className="space-y-1.5 text-[10.5px]">
            {[
              ["mail" as const, l("البريد المؤسسي", "Institutional email"), student.email],
              ["smartphone" as const, l("الهاتف", "Phone"), student.phone],
              ["map-pin" as const, l("العنوان", "Address"), student.address],
            ].map(([icon, k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-md bg-surface-2 text-fg-muted"><Icon name={icon} size={12} /></span>
                <span className="text-fg-muted">{k}</span>
                <span className="ms-auto max-w-[60%] truncate text-end font-medium text-fg" dir={icon === "mail" ? "ltr" : undefined}>{v}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-fg-muted">
            {l("تعديل بيانات الاتصال يتطلب طلباً رسمياً للتحقق من الهوية.", "Changing contact details requires a formal identity-verification request.")}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-fg">{l("التقدم الأكاديمي", "Academic progress")}</p>
            <span className="tnum text-[10px] text-fg-muted">{student.credits}/144</span>
          </div>
          <Progress value={(student.credits / 144) * 100} tone="accent" />
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-lg bg-surface-2 p-2">
              <p className="text-fg-muted">{l("مقررات مكتملة", "Completed courses")}</p>
              <p className="tnum mt-0.5 text-[13px] font-semibold text-fg">{publishedGrades.length}</p>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <p className="text-fg-muted">{l("مقررات حالية", "Current courses")}</p>
              <p className="tnum mt-0.5 text-[13px] font-semibold text-fg">{courses.length}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/student/id", icon: "id-card" as const, ar: "الهوية الرقمية", en: "Digital ID" },
            { href: "/student/transcript", icon: "file-text" as const, ar: "السجل الأكاديمي", en: "Transcript" },
            { href: "/student/security", icon: "shield" as const, ar: "الأجهزة والأمان", en: "Security" },
            { href: "/student/analytics", icon: "chart" as const, ar: "تحليلات الأداء", en: "Analytics" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:bg-surface-2">
              <Icon name={a.icon} size={14} className="text-accent-400" />
              <span className="text-[11px] font-medium text-fg">{l(a.ar, a.en)}</span>
            </Link>
          ))}
        </div>

        <p className="text-center text-[9.5px] text-fg-muted">
          {l("آخر تحديث للبيانات", "Data last synced")}: {new Date().toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
