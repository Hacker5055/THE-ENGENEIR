import { Badge, Icon } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { PrintButton } from "@/components/print-button";
import { db, findCourse, gpaFor } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDate, makeL } from "@/lib/utils";

export const metadata = { title: "السجل الأكاديمي" };

export default async function TranscriptPage() {
  const { student, department, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const grades = db().grades.filter((g) => g.studentId === student.id && g.published);
  const semesters = [
    { id: "sem_2025_fall", label: l("الفصل الأول 2025/2026", "Fall 2025/2026") },
    { id: "sem_2025_spring", label: l("الفصل الثاني 2025/2026", "Spring 2025/2026") },
  ];
  const gpa = gpaFor(student.id) || student.gpa;
  const totalCredits = grades.reduce((a, g) => a + (findCourse(g.courseId)?.credits ?? 0), 0);

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("السجل الأكاديمي", "Academic transcript")} subtitle={l("سجل غير رسمي — للعرض", "Unofficial copy — for viewing")} unread={unread} />
      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-fg-muted">{l("المؤسسة", "Institution")}</p>
              <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-fg">{l("أكاديمية المهندس للهندسة والتكنولوجيا", "AL MOHANDES Academy of Engineering & Technology")}</p>
              <p className="mt-1 text-[10.5px] text-fg-muted">{student.nameAr} · <span className="font-mono">{student.studentNumber}</span></p>
              <p className="text-[10px] text-fg-muted">{l(department.nameAr, department.nameEn)} · {l("المستوى", "Level")} {student.level}</p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-[9px] text-fg-muted">{l("المعدل التراكمي", "Cumulative GPA")}</p>
              <p className="tnum text-[24px] font-semibold leading-none text-fg">{gpa.toFixed(2)}</p>
              <p className="text-[9px] text-fg-muted">/ 4.00</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-center">
            {[
              [`${totalCredits}`, l("ساعات مكتسبة", "credits earned")],
              [String(grades.length), l("مقررات", "courses")],
              [String(courses.length), l("قيد الدراسة", "in progress")],
            ].map(([v, k]) => (
              <div key={k}>
                <p className="tnum text-[14px] font-semibold text-fg">{v}</p>
                <p className="text-[9px] text-fg-muted">{k}</p>
              </div>
            ))}
          </div>
        </section>

        {semesters.map((sem) => {
          const rows = grades.filter((g) => g.semesterId === sem.id);
          if (!rows.length) return null;
          const semCredits = rows.reduce((a, g) => a + (findCourse(g.courseId)?.credits ?? 0), 0);
          const semPoints = rows.reduce((a, g) => a + g.points * (findCourse(g.courseId)?.credits ?? 0), 0);
          const semGpa = semCredits ? (semPoints / semCredits).toFixed(2) : "—";
          return (
            <section key={sem.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-3.5 py-2">
                <p className="text-[11px] font-semibold text-fg">{sem.label}</p>
                <span className="text-[9.5px] text-fg-muted">
                  {l("معدل الفصل", "Term GPA")}: <span className="tnum font-semibold text-fg">{semGpa}</span>
                </span>
              </div>
              <table className="w-full text-[10.5px]">
                <thead>
                  <tr className="text-[9px] uppercase text-fg-muted">
                    <th className="px-3 py-1.5 text-start font-medium">{l("المقرر", "Course")}</th>
                    <th className="px-1.5 py-1.5 text-center font-medium">{l("ساعات", "Cr.")}</th>
                    <th className="px-1.5 py-1.5 text-center font-medium">{l("الدرجة", "Mark")}</th>
                    <th className="px-3 py-1.5 text-center font-medium">{l("التقدير", "Grade")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => {
                    const c = findCourse(g.courseId)!;
                    return (
                      <tr key={g.id} className="border-t border-line/60">
                        <td className="px-3 py-2">
                          <p className="font-medium text-fg">{l(c.nameAr, c.nameEn)}</p>
                          <p className="font-mono text-[8.5px] text-fg-muted">{c.code}</p>
                        </td>
                        <td className="tnum px-1.5 py-2 text-center text-fg-muted">{c.credits}</td>
                        <td className="tnum px-1.5 py-2 text-center font-medium text-fg">{g.total}</td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-grid min-w-6 place-items-center rounded px-1 text-[9.5px] font-semibold ${
                              g.total >= 85 ? "bg-success-500/12 text-success-500" : g.total >= 70 ? "bg-accent-500/12 text-accent-400" : "bg-warn-500/12 text-warn-500"
                            }`}
                          >
                            {g.letter}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}

        <section className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2">
            <Icon name="printer" size={14} className="text-accent-400" />
            <div>
              <p className="text-[11px] font-medium text-fg">{l("نسخة PDF للطباعة", "Printable PDF copy")}</p>
              <p className="text-[9px] text-fg-muted">{l("A4 · عربي / إنجليزي", "A4 · Arabic / English")}</p>
            </div>
          </div>
          <PrintButton size="sm" />
        </section>

        <div className="rounded-xl border border-dashed border-line bg-surface/40 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-medium text-fg-soft">
            <Icon name="info" size={11} /> {l("هذه نسخة غير رسمية", "This is an unofficial copy")}
          </p>
          <p className="mt-1 text-[9.5px] leading-relaxed text-fg-muted">
            {l(
              `النسخة الرسمية تصدر من شؤون الطلاب بختم إلكتروني قابل للتحقق. تاريخ التوليد: ${fmtDate(new Date(), locale, { year: true })}.`,
              `The official copy is issued by student affairs with a verifiable e-seal. Generated: ${fmtDate(new Date(), locale, { year: true })}.`,
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="neutral" icon="shield-check">{l("متوافق مع A4", "A4 ready")}</Badge>
            <Badge tone="neutral" icon="lock">{l("بيانات مقيدة بالمؤسسة", "Tenant-scoped")}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
