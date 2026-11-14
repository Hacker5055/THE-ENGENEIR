import Link from "next/link";
import { Badge, Card, CardHeader, Icon, Progress, Ring, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { BarChart } from "@/components/charts";
import { db, findCourse, findDepartment } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "الدرجات" };

const LETTER_BANDS = [
  { key: "A", label: "A / A+", min: 90 },
  { key: "B", label: "B / B+", min: 80 },
  { key: "C", label: "C / C+", min: 70 },
  { key: "D", label: "D / D+", min: 60 },
  { key: "F", label: "F", min: 0 },
];

export default async function AdminGradesPage({ searchParams }: { searchParams: Promise<{ course?: string; dept?: string; publish?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;

  const all = db().grades;
  const filtered = all.filter((g) => {
    if (sp.course && g.courseId !== sp.course) return false;
    const course = findCourse(g.courseId);
    if (sp.dept && course?.departmentId !== sp.dept) return false;
    if (sp.publish === "published" && !g.published) return false;
    if (sp.publish === "draft" && g.published) return false;
    return true;
  });

  const avg = all.length ? Math.round(all.reduce((a, g) => a + g.total, 0) / all.length) : 0;
  const passRate = all.length ? Math.round((all.filter((g) => g.total >= 60).length / all.length) * 100) : 0;
  const published = all.filter((g) => g.published).length;

  const bandData = LETTER_BANDS.map((b, i) => {
    const next = LETTER_BANDS[i - 1]?.min ?? 101;
    return {
      label: b.label,
      value: all.filter((g) => g.total >= b.min && g.total < next).length,
      color: ["#19B88A", "#38A5FF", "#2864D9", "#F2A93B", "#F05252"][i],
    };
  });

  const courseRows = db().courses.map((c) => {
    const grades = all.filter((g) => g.courseId === c.id);
    return {
      course: c,
      count: grades.length,
      avg: grades.length ? Math.round(grades.reduce((a, g) => a + g.total, 0) / grades.length) : 0,
      pass: grades.length ? Math.round((grades.filter((g) => g.total >= 60).length / grades.length) * 100) : 0,
      published: grades.filter((g) => g.published).length,
    };
  });

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الدرجات والنتائج", "Grades & results")}
        subtitle={l("الرقابة على النشر، معدلات النجاح، وتوزيع التقديرات", "Publication control, pass rates, and grade distribution")}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("الدرجات", "Grades") }]}
        actions={<Badge tone={published === all.length ? "success" : "warning"} dot>{published}/{all.length} {l("منشورة", "published")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("سجلات الدرجات", "Grade records")} value={all.length} icon="clipboard" tone="brand" />
        <StatCard label={l("المتوسط العام", "Institution average")} value={`${avg}%`} icon="percent" tone="accent" />
        <StatCard label={l("معدل النجاح", "Pass rate")} value={`${passRate}%`} icon="check-circle" tone={passRate >= 85 ? "success" : "warning"} />
        <StatCard label={l("بانتظار النشر", "Awaiting publication")} value={all.length - published} icon="send" tone={all.length - published > 0 ? "warning" : "success"} />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link href="/admin/grades" className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11.5px] font-medium ${!sp.course && !sp.dept && !sp.publish ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
          {l("الكل", "All")}
        </Link>
        <Link href="/admin/grades?publish=draft" className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium ${sp.publish === "draft" ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
          <Icon name="eye-off" size={12} /> {l("غير منشورة", "Unpublished")}
        </Link>
        <Link href="/admin/grades?publish=published" className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium ${sp.publish === "published" ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
          <Icon name="send" size={12} /> {l("منشورة", "Published")}
        </Link>
        <div className="ms-auto flex flex-wrap gap-1">
          {db().departments.map((d) => (
            <Link key={d.id} href={`/admin/grades?dept=${d.id}`} className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] ${sp.dept === d.id ? "border-brand-500/40 text-brand-400" : "border-line text-fg-muted"}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} /> {d.code}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title={l("توزيع التقديرات", "Grade distribution")} subtitle={`${all.length} ${l("سجلاً", "records")}`} icon="chart" />
          <BarChart data={bandData} height={190} ariaLabel={l("توزيع التقديرات", "Grade distribution")} />
          <div className="mt-3 flex items-center gap-4 rounded-lg bg-surface-2 p-2.5">
            <Ring value={passRate} size={72} thickness={8} tone={passRate >= 85 ? "#19B88A" : "#F2A93B"}>
              <p className="tnum text-[13px] font-semibold text-fg">{passRate}%</p>
            </Ring>
            <div className="text-[10px] leading-relaxed text-fg-muted">
              <p><span className="font-semibold text-fg">{all.filter((g) => g.total >= 60).length}</span> {l("ناجح", "passing")} · <span className="font-semibold text-fg">{all.filter((g) => g.total < 60).length}</span> {l("دون النجاح", "below pass")}</p>
              <p>{l("الحد الأدنى للنجاح 60% وفق اللائحة المعتمدة.", "The regulatory pass mark is 60%.")}</p>
            </div>
          </div>
        </Card>

        <Card padded={false} className="overflow-hidden">
          <CardHeader title={l("ملخص المقررات", "Course summary")} subtitle={l("الدرجات مقابل النشر", "Scores versus publication")} icon="book" />
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("المقرر", "Course")}</Th>
                <Th align="center">{l("السجلات", "Records")}</Th>
                <Th align="center">{l("المتوسط", "Average")}</Th>
                <Th align="center">{l("النجاح", "Pass")}</Th>
                <Th>{l("النشر", "Publication")}</Th>
              </tr>
            </thead>
            <tbody>
              {courseRows.map((r) => (
                <tr key={r.course.id} className="transition hover:bg-surface-2/60">
                  <Td>
                    <p className="truncate text-[11px] font-medium text-fg">{l(r.course.nameAr, r.course.nameEn)}</p>
                    <p className="font-mono text-[9px] text-fg-muted">{r.course.code}</p>
                  </Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{r.count}</span></Td>
                  <Td align="center"><span className={`tnum text-[10.5px] font-semibold ${r.avg >= 70 ? "text-success-500" : "text-fg"}`}>{r.avg}%</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{r.pass}%</span></Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <div className="w-14"><Progress value={r.count ? (r.published / r.count) * 100 : 0} size="sm" tone={r.published === r.count ? "success" : "warning"} /></div>
                      <span className="tnum text-[9px] text-fg-muted">{r.published}/{r.count}</span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <CardHeader title={l("سجلات الدرجات", "Grade records")} subtitle={`${filtered.length} ${l("سجلاً بعد التصفية", "records after filtering")}`} icon="clipboard" />
        <TableWrap>
          <thead>
            <tr>
              <Th>{l("الطالب", "Student")}</Th>
              <Th>{l("المقرر", "Course")}</Th>
              <Th align="center">{l("أعمال السنة", "Coursework")}</Th>
              <Th align="center">{l("النصفي", "Midterm")}</Th>
              <Th align="center">{l("النهائي", "Final")}</Th>
              <Th align="center">{l("المجموع", "Total")}</Th>
              <Th align="center">{l("التقدير", "Grade")}</Th>
              <Th align="end">{l("النشر", "Status")}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 30).map((g) => {
              const student = db().students.find((s) => s.id === g.studentId);
              const course = findCourse(g.courseId);
              const dept = course ? findDepartment(course.departmentId) : undefined;
              return (
                <tr key={g.id} className="transition hover:bg-surface-2/60">
                  <Td>
                    <p className="truncate text-[11px] text-fg">{student ? l(student.nameAr, student.nameEn) : g.studentId}</p>
                    <p className="font-mono text-[9px] text-fg-muted">{student?.studentNumber} · {dept?.code}</p>
                  </Td>
                  <Td><span className="font-mono text-[9.5px] text-fg-soft">{course?.code}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{g.coursework}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{g.midterm}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{g.final}</span></Td>
                  <Td align="center"><span className="tnum text-[11px] font-semibold text-fg">{g.total}%</span></Td>
                  <Td align="center"><Badge tone={["A+", "A"].includes(g.letter) ? "success" : g.letter.startsWith("B") ? "brand" : g.letter === "F" ? "danger" : "warning"}>{g.letter}</Badge></Td>
                  <Td align="end"><Badge tone={g.published ? "success" : "neutral"} dot>{g.published ? l("منشورة", "Published") : l("مسودة", "Draft")}</Badge></Td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><Td colSpan={8} className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا سجلات.", "No records.")}</Td></tr>}
          </tbody>
        </TableWrap>
        {filtered.length > 30 && <p className="px-4 py-2.5 text-[10px] text-fg-muted">{l(`تُعرض أول 30 من ${filtered.length} سجلاً.`, `Showing first 30 of ${filtered.length} records.`)}</p>}
      </Card>

      <p className="text-center text-[9.5px] text-fg-muted">
        {l("لا يمكن للإدارة تعديل درجة معلم دون طلب رسمي — التعديل يمر بمسار الطلبات ويُسجَّل في التدقيق.", "Administration cannot silently change a teacher's mark — changes go through the request workflow and are audited.")}
      </p>
    </div>
  );
}
