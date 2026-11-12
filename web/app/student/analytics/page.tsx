import Link from "next/link";
import { Badge, Card, CardHeader, Icon, Progress, Ring } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { BarChart, Legend, LineChart } from "@/components/charts";
import { db, findCourse, gpaFor, studentAttendance } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "تحليلات الأداء" };

export default async function StudentAnalyticsPage() {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const grades = db().grades.filter((g) => g.studentId === student.id && g.published);
  const attendance = studentAttendance(student.id);

  const bySemester = [
    { id: "sem_2025_fall", label: l("ف1 25/26", "F25/26") },
    { id: "sem_2025_spring", label: l("ف2 25/26", "S25/26") },
  ].map((sem) => {
    const rows = grades.filter((g) => g.semesterId === sem.id);
    const credits = rows.reduce((a, g) => a + (findCourse(g.courseId)?.credits ?? 0), 0);
    const points = rows.reduce((a, g) => a + g.points * (findCourse(g.courseId)?.credits ?? 0), 0);
    return { label: sem.label, gpa: Number((credits ? points / credits : 0).toFixed(2)), avg: Number((rows.reduce((a, g) => a + g.total, 0) / Math.max(1, rows.length)).toFixed(1)) };
  });

  const gpaSeries = [...bySemester.map((s) => s.gpa), gpaFor(student.id) || student.gpa];
  const coursePerformance = courses.map((c) => {
    const g = db().grades.find((x) => x.studentId === student.id && x.courseId === c.id && x.published);
    const cur = db().grades.find((x) => x.studentId === student.id && x.courseId === c.id && !x.published);
    const score = g ? g.total : cur ? Math.round(((cur.coursework + cur.midterm) / 40) * 100) : 0;
    return { label: c.code, value: score, color: c.color, name: l(c.nameAr, c.nameEn) };
  }).sort((a, b) => b.value - a.value);

  const strongest = coursePerformance.slice(0, 2);
  const weakest = [...coursePerformance].reverse().slice(0, 2);
  const attendanceByCourse = courses.map((c) => {
    const att = studentAttendance(student.id, c.id);
    return { label: `${c.code}`, value: att.rate, color: att.rate >= 85 ? "#19B88A" : att.rate >= 75 ? "#F2A93B" : "#F05252" };
  });

  const gradeTrendLabels = [l("ف1 25/26", "F25/26"), l("ف2 25/26", "S25/26"), l("ف1 26/27", "F26/27")];
  const riskScore = Math.round(
    Math.max(0, Math.min(100, (100 - attendance.rate) * 1.6 + Math.max(0, 3.0 - student.gpa) * 18)),
  );

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("تحليلات الأداء", "Performance analytics")} subtitle={l("مؤشرات هذا الفصل الدراسي", "This semester indicators")} unread={unread} />
      <div className="space-y-4 px-4 pt-4">
        <section className="grid grid-cols-3 gap-2">
          {[
            { v: (gpaFor(student.id) || student.gpa).toFixed(2), k: l("المعدل", "GPA"), tone: "text-accent-400" },
            { v: `${attendance.rate}%`, k: l("الحضور", "Attendance"), tone: attendance.rate >= 85 ? "text-success-500" : "text-warn-500" },
            { v: String(grades.length), k: l("مقررات مكتملة", "Completed"), tone: "text-fg" },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-line bg-surface p-2.5 text-center">
              <p className={`tnum text-[16px] font-semibold ${s.tone}`}>{s.v}</p>
              <p className="text-[9px] text-fg-muted">{s.k}</p>
            </div>
          ))}
        </section>

        <Card>
          <CardHeader title={l("اتجاه المعدل التراكمي", "GPA trend")} subtitle={l("آخر ثلاثة فصول دراسية", "Last three semesters")} icon="trending-up" />
          <LineChart
            series={[{ name: l("المعدل", "GPA"), color: "#38A5FF", data: gpaSeries }]}
            labels={gradeTrendLabels}
            height={170}
            yMax={4}
            ariaLabel={l("اتجاه المعدل التراكمي", "GPA trend")}
          />
          <Legend items={[{ label: l("المعدل التراكمي (من 4.00)", "Cumulative GPA (of 4.00)"), color: "#38A5FF" }]} className="mt-2" />
        </Card>

        <Card>
          <CardHeader title={l("الأداء حسب المقرر", "Performance by course")} subtitle={l("النسبة المئوية الموزونة", "Weighted percentage")} icon="bar-chart" />
          <BarChart data={coursePerformance} horizontal suffix="%" ariaLabel={l("الأداء حسب المقرر", "Performance by course")} />
          <p className="mt-2 text-[9px] leading-relaxed text-fg-muted">
            {l("يشمل المقررات الجارية (أعمال السنة + النصفي) بنسبة موزونة.", "Includes in-progress courses (coursework + midterm) weighted.")}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card padded={false} className="p-3">
            <p className="mb-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-success-500">
              <Icon name="trending-up" size={12} /> {l("نقاط القوة", "Strengths")}
            </p>
            {strongest.map((c) => (
              <div key={c.label} className="mb-1.5">
                <p className="truncate text-[9.5px] text-fg-soft">{c.name}</p>
                <Progress value={c.value} size="sm" tone="success" />
              </div>
            ))}
          </Card>
          <Card padded={false} className="p-3">
            <p className="mb-1.5 flex items-center gap-1 text-[10.5px] font-semibold text-warn-500">
              <Icon name="alert" size={12} /> {l("تحتاج تحسيناً", "Needs focus")}
            </p>
            {weakest.map((c) => (
              <div key={c.label} className="mb-1.5">
                <p className="truncate text-[9.5px] text-fg-soft">{c.name}</p>
                <Progress value={c.value} size="sm" tone="warning" />
              </div>
            ))}
          </Card>
        </div>

        <Card>
          <CardHeader title={l("الحضور مقابل الأداء", "Attendance vs performance")} icon="activity" subtitle={l("علاقة وصفية وليست سببية", "Descriptive, not causal")} />
          <div className="flex items-center gap-4">
            <Ring value={attendance.rate} size={84} thickness={8} tone={attendance.rate >= 85 ? "#19B88A" : "#F2A93B"} label={`${attendance.rate}%`}>
              <div>
                <p className="tnum text-[15px] font-semibold text-fg">{attendance.rate}%</p>
                <p className="text-[8px] text-fg-muted">{l("حضور", "attendance")}</p>
              </div>
            </Ring>
            <div className="flex-1 space-y-1.5">
              <p className="text-[10px] leading-relaxed text-fg-muted">
                {l(
                  "الطلاب في نطاق حضورك (85%+) يحققون عادةً معدلاً أعلى بـ0.3 نقطة في المتوسط على مستوى المؤسسة.",
                  "Students in your attendance band (85%+) typically score about 0.3 GPA points higher institution-wide.",
                )}
              </p>
              <BarChart data={attendanceByCourse} horizontal suffix="%" ariaLabel={l("الحضور حسب المقرر", "Attendance by course")} showValues />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={l("سجل الاختبارات", "Examination history")} icon="file-text" />
          <div className="space-y-1.5">
            {db()
              .attempts.filter((a) => a.studentId === student.id && ["GRADED", "SUBMITTED", "GRADING"].includes(a.status))
              .map((a) => {
                const e = db().examinations.find((x) => x.id === a.examinationId)!;
                return (
                  <Link key={a.id} href={`/student/results?exam=${e.id}`} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-2 transition hover:bg-surface-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                      <p className="font-mono text-[8.5px] text-fg-muted">{e.code}</p>
                    </div>
                    <span className="tnum text-[11px] font-semibold text-fg">{e.resultPublished ? `${a.score}/${e.totalMarks}` : "—"}</span>
                    <Badge tone={e.resultPublished ? "success" : "warning"}>{e.resultPublished ? l("معلن", "Published") : l("معلق", "Pending")}</Badge>
                  </Link>
                );
              })}
            {db().attempts.filter((a) => a.studentId === student.id).length === 0 && (
              <p className="text-[10px] text-fg-muted">{l("لا محاولات بعد.", "No attempts yet.")}</p>
            )}
          </div>
        </Card>

        <div className="rounded-xl border border-warn-500/25 bg-warn-500/[0.06] p-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-warn-500">
            <Icon name="alert" size={12} /> {l("مؤشر تقديري — ليس حكماً", "An estimate — not a verdict")}
          </p>
          <p className="mt-1 text-[9.5px] leading-relaxed text-fg-muted">
            {l(
              `مؤشر خطر الغياب المحسوب لك ${riskScore}/100 يعتمد على الحضور والمعدل فقط، ويُعرض للمرشد الأكاديمي كاحتمال للمساعدة لا للعقاب.`,
              `Your computed absence-risk indicator is ${riskScore}/100, based only on attendance and GPA, shown to advisors as a probability to help — never to punish.`,
            )}
          </p>
          <div className="mt-2"><Progress value={riskScore} tone={riskScore > 60 ? "danger" : riskScore > 30 ? "warning" : "success"} size="sm" /></div>
        </div>
      </div>
    </div>
  );
}
