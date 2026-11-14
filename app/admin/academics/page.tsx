import { Badge, Card, CardHeader, Icon, KeyValue, Progress, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { BarChart } from "@/components/charts";
import { db, findDepartment, findTeacher } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { fmtDate, makeL } from "@/lib/utils";

export const metadata = { title: "الأقسام والسنوات" };

export default async function AdminAcademicsPage() {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const years = db().academicYears;
  const sections = db().sections;

  const deptPerf = db().departments.map((d) => ({ label: d.code, value: Math.round(d.avgGpa * 25), color: d.color }));

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الأقسام والسنوات الأكاديمية", "Departments & academic years")}
        subtitle={l("الهيكل الأكاديمي، الشعب، والمؤشرات لكل قسم", "Academic structure, sections, and department indicators")}
        breadcrumb={[{ label: l("الشؤون الأكاديمية", "Academics") }, { label: l("الأقسام", "Departments") }]}
        actions={<Badge tone="success" dot>{l("الفصل الثاني 2026 نشط", "Spring 2026 active")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("الأقسام", "Departments")} value={db().departments.length} icon="building" tone="brand" />
        <StatCard label={l("الشعب", "Sections")} value={sections.length} icon="users" tone="accent" />
        <StatCard label={l("السنوات الأكاديمية", "Academic years")} value={years.length} icon="calendar" tone="neutral" />
        <StatCard label={l("متوسط المعدل العام", "Institution GPA")} value={(db().students.reduce((a, s) => a + s.gpa, 0) / Math.max(1, db().students.length)).toFixed(2)} icon="percent" tone="success" />
      </section>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {db().departments.map((d) => {
          const head = findTeacher(d.headId);
          const deptCourses = db().courses.filter((c) => c.departmentId === d.id);
          const deptSections = sections.filter((s) => s.departmentId === d.id);
          return (
            <Card key={d.id} className="transition hover:border-brand-500/40">
              <div className="flex items-start gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg text-[12px] font-semibold text-white" style={{ background: d.color }}>
                  {d.code.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-fg">{l(d.nameAr, d.nameEn)}</p>
                  <p className="truncate text-[10px] text-fg-muted">{head ? l(head.nameAr, head.nameEn) : "—"} · {l("رئيس القسم", "Head")}</p>
                </div>
                <Badge tone="neutral">{d.code}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { k: l("طلاب", "Students"), v: d.students },
                  { k: l("مقررات", "Courses"), v: deptCourses.length },
                  { k: l("شعب", "Sections"), v: deptSections.length },
                ].map((x) => (
                  <div key={x.k} className="rounded-lg bg-surface-2 px-1 py-1.5">
                    <p className="tnum text-[13px] font-semibold text-fg">{x.v}</p>
                    <p className="text-[8.5px] text-fg-muted">{x.k}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 space-y-1.5">
                <div>
                  <div className="mb-0.5 flex justify-between text-[9px] text-fg-muted"><span>{l("المعدل", "GPA")}</span><span className="tnum">{d.avgGpa.toFixed(2)}</span></div>
                  <Progress value={(d.avgGpa / 4) * 100} size="sm" tone="brand" />
                </div>
                <div>
                  <div className="mb-0.5 flex justify-between text-[9px] text-fg-muted"><span>{l("الحضور", "Attendance")}</span><span className="tnum">{d.avgAttendance}%</span></div>
                  <Progress value={d.avgAttendance} size="sm" tone={d.avgAttendance >= 85 ? "success" : "warning"} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title={l("مؤشر أداء الأقسام", "Department performance index")} subtitle={l("معدل تراكمي معياري", "Normalised GPA index")} icon="chart" />
          <BarChart data={deptPerf} horizontal showValues ariaLabel={l("مؤشر أداء الأقسام", "Department performance index")} />
        </Card>

        <Card>
          <CardHeader title={l("السنوات والفصول", "Academic years & semesters")} icon="calendar" />
          <div className="space-y-2.5">
            {years.map((y) => (
              <div key={y.id} className="rounded-lg border border-line bg-surface-2/50 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-fg">{y.label}</p>
                  <Badge tone={y.status === "ACTIVE" ? "success" : y.status === "PLANNED" ? "brand" : "neutral"}>
                    {y.status === "ACTIVE" ? l("نشط", "Active") : y.status === "PLANNED" ? l("مخطط", "Planned") : l("مؤرشف", "Archived")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[9px] text-fg-muted">{fmtDate(y.startDate, locale)} — {fmtDate(y.endDate, locale)}</p>
                <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                  {y.semesters.map((sem) => (
                    <div key={sem.id} className="flex items-center gap-1.5 rounded-md bg-surface px-2 py-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${sem.status === "ACTIVE" ? "bg-success-500" : sem.status === "CLOSED" ? "bg-fg-muted" : "bg-brand-400"}`} />
                      <span className="min-w-0 flex-1 truncate text-[10px] text-fg-soft">{l(sem.nameAr, sem.nameEn)}</span>
                      <span className="text-[8.5px] text-fg-muted">{sem.status === "ACTIVE" ? l("جارٍ", "current") : fmtDate(sem.startDate, locale).slice(0, 7)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <CardHeader title={l("الشعب الدراسية", "Class sections")} subtitle={`${sections.length} ${l("شعبة", "sections")}`} icon="users" />
        <TableWrap>
          <thead>
            <tr>
              <Th>{l("الشعبة", "Section")}</Th>
              <Th>{l("القسم", "Department")}</Th>
              <Th align="center">{l("المستوى", "Level")}</Th>
              <Th>{l("القاعة", "Room")}</Th>
              <Th align="center">{l("الطلاب", "Students")}</Th>
              <Th>{l("المرشد", "Advisor")}</Th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => {
              const dept = findDepartment(s.departmentId);
              const advisor = findTeacher(s.advisorId);
              return (
                <tr key={s.id} className="transition hover:bg-surface-2/60">
                  <Td><span className="text-[11px] font-medium text-fg">{l(s.nameAr, s.nameEn)}</span></Td>
                  <Td><span className="text-[10.5px] text-fg-soft">{dept ? l(dept.nameAr, dept.nameEn) : "—"}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{s.level}</span></Td>
                  <Td><span className="font-mono text-[10px] text-fg-muted">{s.room}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] font-medium text-fg">{s.studentCount}</span></Td>
                  <Td><span className="text-[10.5px] text-fg-soft">{advisor ? l(advisor.nameAr, advisor.nameEn) : "—"}</span></Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Card>

      <Card>
        <CardHeader title={l("قواعد الهيكل الأكاديمي", "Structural rules")} icon="info" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: l("شعبة واحدة لكل مقرر", "One section per course"), d: l("كل مقرر مرتبط بشعبة ومستوى وقسم واحد — لا تعارض في الجداول.", "Each course maps to one section, level and department — no timetable collisions.") },
            { t: l("مرشد لكل شعبة", "Advisor per section"), d: l("المرشد يتابع الحضور والمعدل بصلاحية قراءة فقط.", "The advisor follows attendance and GPA with read-only access.") },
            { t: l("أرشفة لا حذف", "Archive, never delete"), d: l("الفصول المنتهية تُغلق ويبقى سجلها متاحاً للتدقيق.", "Closed semesters are locked and remain available for audit.") },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-surface-2/50 p-3">
              <p className="text-[11.5px] font-semibold text-fg">{x.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
