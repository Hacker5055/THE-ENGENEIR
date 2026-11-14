import Link from "next/link";
import { Badge, Icon } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { db, findCourse, findTeacher } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { makeL, weekdayName, weekdayShort } from "@/lib/utils";

export const metadata = { title: "الجدول الدراسي" };

const DAYS = [0, 1, 2, 3, 4];

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ view?: string; day?: string }> }) {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { view = "day", day } = await searchParams;
  const today = new Date().getDay();
  const selected = day !== undefined ? Number(day) : DAYS.includes(today) ? today : 0;

  const slots = db().schedule.filter((s) => courses.some((c) => c.id === s.courseId));
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();

  const stateOf = (dayIdx: number, start: string, end: string) => {
    if (dayIdx !== today) return "other";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (minutesNow >= sh * 60 + sm && minutesNow <= eh * 60 + em) return "now";
    if (minutesNow < sh * 60 + sm) return "next";
    return "past";
  };

  return (
    <div className="pb-5">
      <MobileAppBar title={l("الجدول الدراسي", "Timetable")} subtitle={`${courses.length} ${l("مقررات مسجّلة", "enrolled courses")}`} unread={unread} avatarName={student.nameAr} avatarHue={student.avatarHue} avatarHref="/student/profile" />

      <div className="space-y-4 px-4 pt-4">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5">
          {[
            { key: "day", ar: "يومي", en: "Day" },
            { key: "week", ar: "أسبوعي", en: "Week" },
          ].map((v) => (
            <Link
              key={v.key}
              href={`/student/timetable?view=${v.key}${v.key === "day" ? `&day=${selected}` : ""}`}
              className={
                "flex-1 rounded-[7px] py-1.5 text-center text-[11px] font-medium transition " +
                (view === v.key ? "bg-surface-3 text-fg shadow-xs" : "text-fg-muted hover:text-fg")
              }
            >
              {l(v.ar, v.en)}
            </Link>
          ))}
        </div>

        {view === "day" ? (
          <>
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
              {DAYS.map((d) => {
                const active = d === selected;
                const count = slots.filter((s) => s.day === d).length;
                return (
                  <Link
                    key={d}
                    href={`/student/timetable?view=day&day=${d}`}
                    className={
                      "flex min-w-[58px] flex-1 flex-col items-center gap-0.5 rounded-xl border py-2 transition " +
                      (active ? "border-brand/50 bg-brand/15 text-accent-300" : "border-line bg-surface text-fg-muted hover:text-fg")
                    }
                  >
                    <span className="text-[10px] font-medium">{weekdayShort(d, locale)}</span>
                    <span className="tnum text-[14px] font-semibold">{count}</span>
                    {d === today && <span className="text-[8px] text-success-500">{l("اليوم", "today")}</span>}
                  </Link>
                );
              })}
            </div>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-fg">{weekdayName(selected, locale)}</h2>
                <span className="text-[10px] text-fg-muted">{slots.filter((s) => s.day === selected).length} {l("محاضرات", "lectures")}</span>
              </div>
              <div className="space-y-2">
                {slots.filter((s) => s.day === selected).length === 0 && (
                  <div className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-10 text-center">
                    <span className="mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted">
                      <Icon name="calendar" size={18} />
                    </span>
                    <p className="text-[12px] font-medium text-fg-soft">{l("يوم بدون محاضرات", "No lectures this day")}</p>
                    <p className="mt-1 text-[10.5px] text-fg-muted">{l("يمكنك مراجعة مواد المقررات من صفحة المقررات.", "You can review course material from the courses page.")}</p>
                  </div>
                )}
                {slots
                  .filter((s) => s.day === selected)
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((slot) => {
                    const course = findCourse(slot.courseId)!;
                    const teacher = findTeacher(slot.teacherId)!;
                    const state = stateOf(slot.day, slot.start, slot.end);
                    return (
                      <Link
                        key={slot.id}
                        href={`/student/courses/${course.id}`}
                        className={
                          "block rounded-xl border p-3 transition " +
                          (state === "now" ? "border-accent-500/40 bg-accent-500/[0.06]" : "border-line bg-surface hover:bg-surface-2")
                        }
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-[52px] shrink-0 border-e border-line pe-2 text-center">
                            <p className="tnum text-[12px] font-semibold text-fg">{slot.start}</p>
                            <p className="tnum text-[9.5px] text-fg-muted">{slot.end}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-[12.5px] font-medium text-fg">{l(course.nameAr, course.nameEn)}</p>
                              {state === "now" && <Badge tone="accent" dot>{l("الآن", "Now")}</Badge>}
                            </div>
                            <p className="mt-0.5 font-mono text-[9.5px] text-fg-muted">{course.code}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-fg-muted">
                              <span className="flex items-center gap-1"><Icon name="user" size={10} /> {teacher.nameAr}</span>
                              <span className="flex items-center gap-1"><Icon name="map-pin" size={10} /> {slot.room}</span>
                              <span className="flex items-center gap-1">
                                <Icon name={slot.type === "LAB" ? "terminal" : "book"} size={10} />
                                {slot.type === "LAB" ? l("معمل", "Lab") : slot.type === "TUTORIAL" ? l("تمرين", "Tutorial") : l("محاضرة", "Lecture")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </section>
          </>
        ) : (
          <section className="overflow-x-auto scroll-slim">
            <div className="flex min-w-[430px] gap-1.5">
              {DAYS.map((d) => (
                <div key={d} className="flex-1">
                  <div className={"mb-1.5 rounded-md py-1 text-center text-[9.5px] font-medium " + (d === today ? "bg-brand/15 text-accent-300" : "text-fg-muted")}>
                    {weekdayShort(d, locale)}
                  </div>
                  <div className="space-y-1">
                    {slots
                      .filter((s) => s.day === d)
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((slot) => {
                        const course = findCourse(slot.courseId)!;
                        return (
                          <Link
                            key={slot.id}
                            href={`/student/courses/${course.id}`}
                            className="block rounded-lg border border-line bg-surface p-1.5 transition hover:bg-surface-2"
                            style={{ borderInlineStartColor: course.color, borderInlineStartWidth: 2 }}
                          >
                            <p className="tnum text-[8.5px] text-fg-muted">{slot.start}</p>
                            <p className="mt-0.5 line-clamp-2 text-[9px] font-medium leading-tight text-fg">{l(course.nameAr, course.nameEn)}</p>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-fg">
            <Icon name="book" size={13} className="text-accent-400" /> {l("مقرراتي هذا الفصل", "My courses this term")}
          </p>
          <div className="space-y-1">
            {courses.map((c) => (
              <Link key={c.id} href={`/student/courses/${c.id}`} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-surface-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 flex-1 truncate text-[11px] text-fg-soft">{l(c.nameAr, c.nameEn)}</span>
                <span className="font-mono text-[9.5px] text-fg-muted">{c.code}</span>
                <span className="tnum text-[9.5px] text-fg-muted">{c.credits} {l("س", "cr")}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
