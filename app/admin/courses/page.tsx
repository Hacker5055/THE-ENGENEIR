import Link from "next/link";
import { Badge, Card, EmptyState, Icon, Progress, StatusBadge, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findDepartment, findSection, findTeacher } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "المقررات" };

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ dept?: string; q?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const courses = db().courses.filter((c) => {
    if (sp.dept && c.departmentId !== sp.dept) return false;
    if (q && !c.nameAr.toLowerCase().includes(q) && !c.nameEn.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalEnrolled = db().students.reduce((a, s) => a + s.enrolledCourseIds.length, 0);
  const avgProgress = Math.round(db().courses.reduce((a, c) => a + c.progress, 0) / Math.max(1, db().courses.length));

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("إدارة المقررات", "Course catalog")}
        subtitle={l("التوزيع على الأقسام والمعلمين، التقدم، والأداء", "Department and faculty assignment, progress, performance")}
        breadcrumb={[{ label: l("الشؤون الأكاديمية", "Academics") }, { label: l("المقررات", "Courses") }]}
        actions={<Badge tone="neutral">{db().courses.length} {l("مقرراً", "courses")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("المقررات", "Courses")} value={db().courses.length} icon="book" tone="brand" />
        <StatCard label={l("التسجيلات", "Enrollments")} value={totalEnrolled} icon="users" tone="accent" />
        <StatCard label={l("متوسط التقدم", "Average progress")} value={`${avgProgress}%`} icon="trending-up" tone="success" />
        <StatCard label={l("ساعات معتمدة", "Credit hours")} value={db().courses.reduce((a, c) => a + c.credits, 0)} icon="percent" tone="neutral" />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link href="/admin/courses" className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11.5px] font-medium ${!sp.dept ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
          {l("كل الأقسام", "All departments")}
        </Link>
        {db().departments.map((d) => (
          <Link
            key={d.id}
            href={`/admin/courses?dept=${d.id}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium ${sp.dept === d.id ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.code}
          </Link>
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        {courses.length === 0 ? (
          <EmptyState icon="book" title={l("لا مقررات", "No courses")} description={l("لا مقررات في هذا القسم.", "No courses in this department.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("المقرر", "Course")}</Th>
                <Th>{l("القسم", "Department")}</Th>
                <Th>{l("المعلم", "Instructor")}</Th>
                <Th>{l("الشعبة", "Section")}</Th>
                <Th align="center">{l("الساعات", "Credits")}</Th>
                <Th align="center">{l("الطلاب", "Students")}</Th>
                <Th>{l("التقدم", "Progress")}</Th>
                <Th align="center">{l("متوسط الدرجات", "Avg score")}</Th>
                <Th align="end">{l("الحالة", "Status")}</Th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const dept = findDepartment(c.departmentId);
                const teacher = findTeacher(c.teacherId);
                const section = findSection(c.sectionId);
                const grades = db().grades.filter((g) => g.courseId === c.id);
                const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.total, 0) / grades.length) : 0;
                return (
                  <tr key={c.id} id={c.id} className="transition hover:bg-surface-2/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-1 rounded-full" style={{ background: c.color }} />
                        <div className="min-w-0">
                          <p className="truncate text-[11.5px] font-medium text-fg">{l(c.nameAr, c.nameEn)}</p>
                          <p className="font-mono text-[9px] text-fg-muted">{c.code}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><span className="text-[10.5px] text-fg-soft">{dept?.code}</span></Td>
                    <Td><span className="truncate text-[10.5px] text-fg-soft">{teacher ? l(teacher.nameAr, teacher.nameEn) : "—"}</span></Td>
                    <Td><span className="text-[10px] text-fg-muted">{section ? l(section.nameAr, section.nameEn) : "—"}</span></Td>
                    <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{c.credits}</span></Td>
                    <Td align="center"><span className="tnum text-[10.5px] font-medium text-fg">{c.enrolledCount}</span></Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-20"><Progress value={c.progress} size="sm" tone="brand" /></div>
                        <span className="tnum text-[9.5px] text-fg-muted">{c.progress}%</span>
                      </div>
                    </Td>
                    <Td align="center"><span className={`tnum text-[10.5px] font-semibold ${avg >= 75 ? "text-success-500" : avg >= 60 ? "text-fg" : "text-warn-500"}`}>{avg}%</span></Td>
                    <Td align="end"><StatusBadge status={c.status} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {db().departments.map((d) => {
          const deptCourses = db().courses.filter((c) => c.departmentId === d.id);
          return (
            <Card key={d.id}>
              <div className="flex items-center gap-2">
                <span className="h-6 w-1.5 rounded-full" style={{ background: d.color }} />
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-semibold text-fg">{l(d.nameAr, d.nameEn)}</p>
                  <p className="text-[9px] text-fg-muted">{deptCourses.length} {l("مقرراً", "courses")} · {d.students} {l("طالباً", "students")}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-[9px] text-fg-muted"><span>{l("متوسط الحضور", "Attendance")}</span><span className="tnum">{d.avgAttendance}%</span></div>
                <Progress value={d.avgAttendance} size="sm" tone={d.avgAttendance >= 85 ? "success" : "warning"} />
              </div>
              <Link href={`/admin/courses?dept=${d.id}`} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-brand-500 hover:underline">
                {l("عرض المقررات", "View courses")} <Icon name="arrow-right" size={10} className="rtl:rotate-180" />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
