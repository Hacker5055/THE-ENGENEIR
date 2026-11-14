import Link from "next/link";
import { Avatar, Badge, Card, EmptyState, Icon, Progress, SearchInput } from "@/components/ui";
import { PageHeader, StatCard, ToolbarBar } from "@/components/shells/app-shell";
import { CreateTeacherButton } from "@/components/admin/create-registry-dialog";
import { db, findDepartment } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "المعلمون" };

export default async function AdminTeachersPage({ searchParams }: { searchParams: Promise<{ q?: string; dept?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const teachers = db().teachers.filter((t) => {
    if (q && !t.nameAr.toLowerCase().includes(q) && !t.nameEn.toLowerCase().includes(q) && !t.email.includes(q)) return false;
    if (sp.dept && t.departmentId !== sp.dept) return false;
    return true;
  });

  const avgRating = (db().teachers.reduce((a, t) => a + t.rating, 0) / Math.max(1, db().teachers.length)).toFixed(2);
  const avgLoad = Math.round(db().teachers.reduce((a, t) => a + t.courseIds.length, 0) / Math.max(1, db().teachers.length) * 10) / 10;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("هيئة التدريس", "Faculty")}
        subtitle={l("الأعباء التدريسية، التقييم، وحالة الأعضاء", "Teaching load, ratings, and member status")}
        breadcrumb={[{ label: l("الشؤون الأكاديمية", "Academics") }, { label: l("المعلمون", "Faculty") }]}
        actions={
          <CreateTeacherButton
            departments={db().departments.map((d) => ({ id: d.id, nameAr: d.nameAr, nameEn: d.nameEn }))}
            courses={db().courses.map((c) => ({ id: c.id, code: c.code, nameAr: c.nameAr, nameEn: c.nameEn }))}
          />
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("أعضاء هيئة التدريس", "Faculty members")} value={db().teachers.length} icon="id-card" tone="brand" />
        <StatCard label={l("متوسط التقييم", "Average rating")} value={avgRating} icon="check-circle" tone="accent" />
        <StatCard label={l("متوسط الحمل", "Average load")} value={`${avgLoad} ${l("مقررات", "courses")}`} icon="book" tone="neutral" />
        <StatCard label={l("في إجازة", "On leave")} value={db().teachers.filter((t) => t.status === "ON_LEAVE").length} icon="user" tone="warning" />
      </section>

      <ToolbarBar>
        <form action="/admin/teachers" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput name="q" defaultValue={sp.q} placeholder={l("اسم أو بريد…", "Name or email…")} className="h-9 w-full max-w-[260px]" />
          <select name="dept" defaultValue={sp.dept ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل الأقسام", "All departments")}</option>
            {db().departments.map((d) => <option key={d.id} value={d.id}>{l(d.nameAr, d.nameEn)}</option>)}
          </select>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={13} /> {l("تصفية", "Filter")}
          </button>
        </form>
        <span className="text-[11.5px] text-fg-muted">{teachers.length} {l("عضواً", "members")}</span>
      </ToolbarBar>

      {teachers.length === 0 ? (
        <Card><EmptyState icon="id-card" title={l("لا نتائج", "No results")} description={l("جرّب بحثاً آخر.", "Try another search.")} /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {teachers.map((t) => {
            const dept = findDepartment(t.departmentId);
            const courses = db().courses.filter((c) => c.teacherId === t.id);
            const students = db().students.filter((s) => courses.some((c) => c.sectionId === s.sectionId)).length;
            const load = Math.min(100, (t.courseIds.length / 5) * 100);
            return (
              <Card key={t.id} className="transition hover:border-brand-500/40">
                <div className="flex items-start gap-2.5">
                  <Avatar name={t.nameAr} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[12.5px] font-semibold text-fg">{l(t.nameAr, t.nameEn)}</p>
                      {t.status === "ON_LEAVE" && <Badge tone="warning">{l("إجازة", "Leave")}</Badge>}
                    </div>
                    <p className="truncate text-[10px] text-fg-muted">{t.title}</p>
                    <p className="mt-0.5 font-mono text-[9px] text-fg-muted">{t.email}</p>
                  </div>
                  <div className="text-end">
                    <p className="tnum text-[13px] font-semibold text-accent-400">{t.rating.toFixed(1)}</p>
                    <p className="text-[8px] text-fg-muted">{l("تقييم", "rating")}</p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  <Badge tone="brand">{dept?.code}</Badge>
                  <Badge tone="neutral">{t.officeRoom}</Badge>
                  <Badge tone="neutral">{students} {l("طالباً", "students")}</Badge>
                </div>

                <div className="mt-2.5">
                  <div className="mb-1 flex items-center justify-between text-[9.5px] text-fg-muted">
                    <span>{l("الحمل التدريسي", "Teaching load")} · {t.courseIds.length}/5</span>
                    <span>{t.officeHours}</span>
                  </div>
                  <Progress value={load} size="sm" tone={load > 80 ? "warning" : "brand"} />
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {courses.map((c) => (
                    <Link key={c.id} href={`/admin/courses#${c.id}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[8.5px] text-fg-muted hover:text-brand-400">
                      {c.code}
                    </Link>
                  ))}
                  {courses.length === 0 && <span className="text-[9px] text-fg-muted">{l("لا مقررات مسندة.", "No assigned courses.")}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
