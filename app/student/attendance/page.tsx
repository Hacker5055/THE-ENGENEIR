import Link from "next/link";
import { Badge, Icon, Ring } from "@/components/ui";
import { MobileAppBar, SectionTitle } from "@/components/shells/mobile-shell";
import { CheckInSheet } from "@/components/student/check-in-sheet";
import { STATUS_META, METHOD_META, buildMonthGrid } from "@/lib/attendance";
import { db, findCourse, studentAttendance } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDate, makeL, monthName, weekdayShort } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/types";

export const metadata = { title: "الحضور والانصراف" };

const FILTERS: { key: string; ar: string; en: string }[] = [
  { key: "ALL", ar: "الكل", en: "All" },
  { key: "PRESENT", ar: "حاضر", en: "Present" },
  { key: "LATE", ar: "متأخر", en: "Late" },
  { key: "ABSENT", ar: "غائب", en: "Absent" },
  { key: "EXCUSED", ar: "بعذر", en: "Excused" },
];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string; scan?: string }>;
}) {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { status = "ALL", month, scan } = await searchParams;

  const summary = studentAttendance(student.id);
  const today = new Date();
  const [y, m] = month ? month.split("-").map(Number) : [today.getFullYear(), today.getMonth() + 1];
  const grid = buildMonthGrid(y, m - 1, summary.records);

  const prev = new Date(y, m - 2, 1);
  const next = new Date(y, m, 1);
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const filtered = summary.records.filter((r) => status === "ALL" || r.status === status).slice(0, 20);

  const openSessions = db()
    .attendanceSessions.filter((s) => s.status === "OPEN" && courses.some((c) => c.id === s.courseId))
    .map((s) => {
      const course = findCourse(s.courseId)!;
      const already = db().attendanceRecords.find((r) => r.sessionId === s.id && r.studentId === student.id);
      return {
        id: s.id,
        courseAr: course.nameAr,
        courseEn: course.nameEn,
        code: course.code,
        start: s.start,
        end: s.end,
        room: s.room,
        geoLabel: s.geo.label,
        radiusM: s.geo.radiusM,
        expected: s.expectedCount,
        already: !!already,
      };
    })
    .filter((s) => !s.already);

  const tone = summary.rate >= 85 ? "success" : summary.rate >= 75 ? "warning" : "danger";
  const color = summary.rate >= 85 ? "#19B88A" : summary.rate >= 75 ? "#F2A93B" : "#F05252";

  return (
    <div className="pb-5">
      <MobileAppBar title={l("الحضور والانصراف", "Attendance")} subtitle={`${l("نسبة الحضور", "Attendance rate")}: ${summary.rate}%`} unread={unread} avatarName={student.nameAr} avatarHue={student.avatarHue} avatarHref="/student/profile" />

      <div className="space-y-4 px-4 pt-4">
        <CheckInSheet
          autoOpen={scan === "1" && openSessions.length > 0}
          sessions={openSessions.map(({ already: _a, ...rest }) => ({ ...rest, courseAr: rest.courseAr, courseEn: rest.courseEn }))}
        />

        {/* summary */}
        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-center gap-4">
            <Ring value={summary.rate} size={92} thickness={9} tone={color} label={`${summary.rate}%`}>
              <div>
                <p className="tnum text-[18px] font-semibold text-fg">{summary.rate}%</p>
                <p className="text-[8.5px] text-fg-muted">{l("نسبة الحضور", "rate")}</p>
              </div>
            </Ring>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-fg">{l("الفصل الحالي", "Current semester")}</p>
                <Badge tone={tone as "success" | "warning" | "danger"} dot>
                  {summary.rate >= 85 ? l("فوق الحد", "Above threshold") : summary.rate >= 75 ? l("قريب من الحد", "Near threshold") : l("تحت الحد", "Below threshold")}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map((s) => {
                  const counts = { PRESENT: summary.present, LATE: summary.late, ABSENT: summary.absent, EXCUSED: summary.excused };
                  return (
                    <div key={s} className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5">
                      <span className={`size-1.5 rounded-full ${STATUS_META[s].dot}`} />
                      <span className="text-[10px] text-fg-muted">{l(STATUS_META[s].ar, STATUS_META[s].en)}</span>
                      <span className="tnum ms-auto text-[11.5px] font-semibold text-fg">{counts[s]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-3 rounded-lg bg-surface-2 px-2.5 py-2 text-[10px] leading-relaxed text-fg-muted">
            {l(
              "الحد الأدنى للحضور 75%. الغياب بدون عذر لأكثر من 25% يعرّض الطالب للحرمان من دخول الاختبار النهائي وفق اللائحة.",
              "Minimum attendance is 75%. Unexcused absence above 25% bars entry to the final exam under the bylaws.",
            )}
          </p>
        </section>

        {/* calendar */}
        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <Link href={`/student/attendance?month=${monthKey(prev)}`} className="grid size-7 place-items-center rounded-md border border-line text-fg-muted" aria-label={l("الشهر السابق", "Previous month")}>
              <Icon name="chevron-right" size={13} />
            </Link>
            <p className="text-[12px] font-semibold text-fg">
              {monthName(m - 1, locale)} {y}
            </p>
            <Link href={`/student/attendance?month=${monthKey(next)}`} className="grid size-7 place-items-center rounded-md border border-line text-fg-muted" aria-label={l("الشهر التالي", "Next month")}>
              <Icon name="chevron-left" size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <span key={d} className="pb-1 text-[9px] font-medium text-fg-muted">{weekdayShort(d, locale)}</span>
            ))}
            {grid.map((cell, i) => (
              <div key={i} className="aspect-square">
                {cell.day ? (
                  <div
                    className={
                      "relative grid h-full w-full place-items-center rounded-lg text-[10.5px] font-medium transition " +
                      (cell.status === "PRESENT"
                        ? "bg-success-500/15 text-success-500"
                        : cell.status === "LATE"
                          ? "bg-warn-500/15 text-warn-500"
                          : cell.status === "ABSENT"
                            ? "bg-danger-500/15 text-danger-500"
                            : cell.status === "EXCUSED"
                              ? "bg-surface-3 text-fg-muted"
                              : cell.status === "MIXED"
                                ? "bg-accent-500/15 text-accent-400"
                                : "text-fg-muted/70")
                    }
                    title={cell.date}
                  >
                    {cell.day}
                    {cell.count > 1 && <span className="absolute end-1 top-1 size-1 rounded-full bg-current opacity-60" />}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5">
            {(["PRESENT", "LATE", "ABSENT", "EXCUSED"] as AttendanceStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1 text-[9px] text-fg-muted">
                <span className={`size-1.5 rounded-full ${STATUS_META[s].dot}`} />
                {l(STATUS_META[s].ar, STATUS_META[s].en)}
              </span>
            ))}
          </div>
        </section>

        {/* history */}
        <section>
          <SectionTitle action={<span className="text-[10px] text-fg-muted">{summary.total} {l("سجلاً", "records")}</span>}>
            {l("سجل الحضور", "Attendance history")}
          </SectionTitle>
          <div className="no-scrollbar -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/student/attendance?status=${f.key}`}
                className={
                  "shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition " +
                  (status === f.key ? "border-brand/50 bg-brand/15 text-accent-300" : "border-line text-fg-muted hover:text-fg")
                }
              >
                {l(f.ar, f.en)}
              </Link>
            ))}
          </div>

          <div className="space-y-1.5">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-8 text-center">
                <p className="text-[12px] font-medium text-fg-soft">{l("لا توجد سجلات مطابقة", "No matching records")}</p>
                <p className="mt-1 text-[10.5px] text-fg-muted">{l("جرّب فلتراً آخر.", "Try another filter.")}</p>
              </div>
            )}
            {filtered.map((r) => {
              const course = findCourse(r.courseId)!;
              const meta = STATUS_META[r.status];
              return (
                <div key={r.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                  <span className={`h-8 w-1 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-fg">{l(course.nameAr, course.nameEn)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-fg-muted">
                      <span>{fmtDate(r.date, locale)}</span>
                      <span>·</span>
                      <span>{l(METHOD_META[r.method].ar, METHOD_META[r.method].en)}</span>
                      {r.geoDistanceM !== undefined && (
                        <>
                          <span>·</span>
                          <span className="tnum">{r.geoDistanceM}م</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-medium ${meta.chip}`}>{l(meta.ar, meta.en)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-line bg-surface-2/50 p-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-fg-soft">
            <Icon name="shield-check" size={12} className="text-accent-400" />
            {l("كيف يتم التحقق من الحضور؟", "How is attendance verified?")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              [l("كود QR دوّار", "Rotating QR token"), l("يتغير كل 20 ثانية — لا يمكن مشاركته بسهولة.", "Rotates every 20 seconds — hard to share.")],
              [l("نطاق جغرافي", "Geofence"), l("يجب أن تكون داخل نطاق القاعة المسموح.", "You must be inside the room's radius.")],
              [l("منع التكرار", "Duplicate prevention"), l("سجل واحد لكل طالب في الجلسة، بقرار من الخادم.", "One record per student per session, enforced server-side.")],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-2 text-[10px] leading-relaxed text-fg-muted">
                <Icon name="check" size={11} className="mt-0.5 shrink-0 text-success-500" />
                <span><span className="font-medium text-fg-soft">{t}:</span> {d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
