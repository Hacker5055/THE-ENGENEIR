import Link from "next/link";
import { Badge, Card, EmptyState, Icon, Progress, SearchInput, Select } from "@/components/ui";
import { PageHeader, ToolbarBar } from "@/components/shells/app-shell";
import { db, findSection, studentAttendance } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { makeL, weekdayShort } from "@/lib/utils";

export const metadata = { title: "الفصول" };

export default async function TeacherClassesPage({ searchParams }: { searchParams: Promise<{ q?: string; level?: string }> }) {
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const level = sp.level ?? "all";

  const list = courses.filter((c) => {
    const matchesQ = !q || c.nameAr.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    const matchesLevel = level === "all" || String(c.level) === level;
    return matchesQ && matchesLevel;
  });

  const totalStudents = db().students.filter((s) => courses.some((c) => c.sectionId === s.sectionId)).length;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الفصول والمقررات", "Classes & courses")}
        subtitle={l(
          `${courses.length} مقررات · ${totalStudents} طالباً في هذا الفصل الدراسي`,
          `${courses.length} courses · ${totalStudents} students this semester`,
        )}
        breadcrumb={[{ label: l("التدريس", "Teaching") }, { label: l("الفصول", "Classes") }]}
      />

      <ToolbarBar>
        <form className="flex flex-1 flex-wrap items-center gap-2" action="/teacher/classes">
          <SearchInput name="q" defaultValue={sp.q} placeholder={l("ابحث بالاسم أو الرمز…", "Search name or code…")} className="h-9 w-full max-w-xs" />
          <Select name="level" defaultValue={level} className="h-9 w-auto">
            <option value="all">{l("كل المستويات", "All levels")}</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{l(`المستوى ${n}`, `Level ${n}`)}</option>
            ))}
          </Select>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={13} /> {l("تصفية", "Filter")}
          </button>
          {(q || level !== "all") && (
            <Link href="/teacher/classes" className="text-[11.5px] text-fg-muted hover:text-fg">{l("مسح", "Clear")}</Link>
          )}
        </form>
        <span className="text-[11.5px] text-fg-muted">{l(`${list.length} نتيجة`, `${list.length} results`)}</span>
      </ToolbarBar>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon="book" title={l("لا مقررات مطابقة", "No matching courses")} description={l("جرّب تغيير كلمة البحث أو المستوى.", "Try a different search term or level.")} />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((c) => {
            const section = findSection(c.sectionId);
            const roster = db().students.filter((s) => s.sectionId === c.sectionId);
            const rate = roster.length
              ? Math.round(roster.reduce((a, s) => a + studentAttendance(s.id, c.id).rate, 0) / roster.length)
              : 0;
            const grades = db().grades.filter((g) => g.courseId === c.id);
            const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.total, 0) / grades.length) : 0;
            const slots = db().schedule.filter((s) => s.courseId === c.id);
            return (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="group rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-px hover:border-brand-500/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-1.5 rounded-full" style={{ background: c.color }} />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{c.code}</p>
                      <p className="text-[13px] font-semibold leading-tight text-fg">{l(c.nameAr, c.nameEn)}</p>
                    </div>
                  </div>
                  <Badge tone="neutral">{l(`${c.credits} ساعات`, `${c.credits} cr`)}</Badge>
                </div>

                <p className="mt-2 text-[10.5px] text-fg-muted">
                  {l(section?.nameAr ?? "", section?.nameEn ?? "")} · {l("قاعة", "Room")} {section?.room} · {c.enrolledCount} {l("طالباً", "students")}
                </p>

                <div className="mt-3 space-y-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px] text-fg-muted">
                      <span>{l("تقدم المنهج", "Syllabus")}</span>
                      <span className="tnum">{c.progress}%</span>
                    </div>
                    <Progress value={c.progress} tone="brand" size="sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
                      <p className="text-[9px] text-fg-muted">{l("متوسط الحضور", "Attendance")}</p>
                      <p className={`tnum text-[13px] font-semibold ${rate >= 85 ? "text-success-500" : "text-warn-500"}`}>{rate}%</p>
                    </div>
                    <div className="rounded-lg bg-surface-2 px-2 py-1.5">
                      <p className="text-[9px] text-fg-muted">{l("متوسط الدرجات", "Avg grade")}</p>
                      <p className="tnum text-[13px] font-semibold text-fg">{avg}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {slots.map((s) => (
                    <span key={s.id} className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[9.5px] font-medium text-brand-400">
                      {weekdayShort(s.day, locale)} {s.start}
                    </span>
                  ))}
                  <span className="ms-auto flex items-center gap-1 text-[10.5px] font-semibold text-brand-500 group-hover:underline">
                    {l("فتح الفصل", "Open class")} <Icon name="arrow-right" size={12} className="rtl:rotate-180" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
