import { Badge, Card, CardHeader, Icon } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findCourse, findSection, findTeacher } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL, weekdayName } from "@/lib/utils";

export const metadata = { title: "الجداول" };

const DAYS = [0, 1, 2, 3, 4] as const;
const SLOTS = ["08:00", "09:30", "11:00", "12:30", "14:00", "15:30"];

export default async function AdminTimetablePage({ searchParams }: { searchParams: Promise<{ dept?: string; teacher?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;

  const slots = db().schedule.filter((s) => {
    const course = findCourse(s.courseId);
    if (!course) return false;
    if (sp.dept && course.departmentId !== sp.dept) return false;
    if (sp.teacher && s.teacherId !== sp.teacher) return false;
    return true;
  });

  const cellFor = (day: number, time: string) =>
    slots.filter((s) => s.day === day && s.start.slice(0, 5) === time);

  const conflicts = SLOTS.reduce((acc, time) => {
    let count = 0;
    for (const day of DAYS) {
      const bucket = cellFor(day, time);
      const rooms = bucket.map((b) => b.room);
      if (new Set(rooms).size !== rooms.length) count++;
    }
    return acc + count;
  }, 0);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الجداول الدراسية", "Timetables")}
        subtitle={l("عرض أسبوعي لكل الأقسام مع كشف تعارض القاعات", "Weekly view across departments with room conflict detection")}
        breadcrumb={[{ label: l("الشؤون الأكاديمية", "Academics") }, { label: l("الجداول", "Timetable") }]}
        badge={<Badge tone={conflicts ? "danger" : "success"} dot>{conflicts ? `${conflicts} ${l("تعارض قاعة", "room conflicts")}` : l("لا تعارضات", "No conflicts")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("محاضرات مجدولة", "Scheduled lectures")} value={slots.length} icon="calendar" tone="brand" />
        <StatCard label={l("قاعات مستخدمة", "Rooms in use")} value={new Set(slots.map((s) => s.room)).size} icon="building" tone="accent" />
        <StatCard label={l("معامل", "Labs")} value={slots.filter((s) => s.type === "LAB").length} icon="layers" tone="neutral" />
        <StatCard label={l("تعارضات القاعات", "Room conflicts")} value={conflicts} icon="alert" tone={conflicts ? "danger" : "success"} />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        <a href="/admin/timetable" className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11.5px] font-medium ${!sp.dept && !sp.teacher ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
          {l("كل الجداول", "All")}
        </a>
        {db().departments.map((d) => (
          <a
            key={d.id}
            href={`/admin/timetable?dept=${d.id}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium ${sp.dept === d.id ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.code}
          </a>
        ))}
      </div>

      <Card padded={false} className="overflow-x-auto">
        <div className="min-w-[900px] p-4">
          <div className="grid grid-cols-[70px_repeat(5,1fr)] gap-1.5">
            <div />
            {DAYS.map((d) => (
              <div key={d} className="rounded-lg bg-surface-2 px-2 py-1.5 text-center text-[11px] font-semibold text-fg-soft">{weekdayName(d, locale)}</div>
            ))}
            {SLOTS.map((time) => (
              <div key={time} className="contents">
                <div className="flex items-center justify-end pe-1.5 font-mono text-[9.5px] text-fg-muted">{time}</div>
                {DAYS.map((day) => {
                  const bucket = cellFor(day, time);
                  return (
                    <div key={`${day}-${time}`} className="min-h-[64px] rounded-lg border border-dashed border-line bg-surface-2/30 p-1">
                      {bucket.map((s) => {
                        const c = findCourse(s.courseId);
                        const t = findTeacher(s.teacherId);
                        const section = findSection(s.sectionId);
                        return (
                          <div key={s.id} className="mb-1 rounded-md border-s-2 bg-surface px-1.5 py-1 shadow-sm" style={{ borderColor: c?.color }}>
                            <p className="truncate font-mono text-[8.5px] text-fg-muted">{c?.code}</p>
                            <p className="truncate text-[9.5px] font-medium text-fg">{c ? l(c.nameAr, c.nameEn) : ""}</p>
                            <p className="truncate text-[8px] text-fg-muted">
                              {s.room} · {l(section?.nameAr ?? "", section?.nameEn ?? "")}
                            </p>
                            <p className="truncate text-[8px] text-fg-muted">{t ? l(t.nameAr, t.nameEn) : ""}</p>
                          </div>
                        );
                      })}
                      {bucket.length === 0 && <div className="flex h-full items-center justify-center text-[8.5px] text-fg-muted/50">—</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={l("كيف يُفحص التعارض؟", "How conflicts are detected")} icon="shield-check" />
        <p className="text-[10.5px] leading-relaxed text-fg-muted">
          {l(
            "يقارن النظام القاعة والمعلم والشعبة في نفس اليوم والوقت. أي تطابق في القاعة يُعلَّم كتعارض، وتطابق في المعلم يُعلَّم كتحميل زائد، وتطابق في الشعبة يُعلَّم كتعارض طلابي. لا يُمنع الحفظ آلياً — يُطلب قرار إداري.",
            "The system compares room, teacher and section for the same day and time. A room match is a conflict, a teacher match is an overload, and a section match is a student clash. Saving is never blocked automatically — an administrative decision is required.",
          )}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { t: l("تعارض قاعة", "Room conflict"), tone: "danger" as const },
            { t: l("تحميل زائد", "Teacher overload"), tone: "warning" as const },
            { t: l("تعارض شعبة", "Section clash"), tone: "brand" as const },
          ].map((x) => <Badge key={x.t} tone={x.tone}>{x.t}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
