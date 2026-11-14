import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, EmptyState, Icon, KeyValue, Progress } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { LiveQr } from "@/components/teacher/live-qr";
import { db, findCourse, findSection } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { closeAttendanceSession, overrideAttendance } from "@/app/actions/teacher";
import { fmtDate, makeL, relTime } from "@/lib/utils";

export default async function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { teacher, locale } = await teacherContext();
  const session = db().attendanceSessions.find((s) => s.id === id);
  if (!session || session.teacherId !== teacher.id) notFound();
  const l = makeL(locale);

  const course = findCourse(session.courseId);
  const section = findSection(session.sectionId);
  const roster = db().students.filter((s) => s.sectionId === session.sectionId);
  const records = db().attendanceRecords.filter((r) => r.sessionId === session.id);
  const statusOf = (studentId: string) => records.find((r) => r.studentId === studentId);
  const scanned = records.filter((r) => r.method !== "TEACHER_OVERRIDE").length;
  const pct = roster.length ? Math.round(((session.presentCount + session.lateCount) / roster.length) * 100) : 0;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("جلسة حضور مباشرة", "Live attendance session")}
        subtitle={`${course ? l(course.nameAr, course.nameEn) : ""} · ${l(section?.nameAr ?? "", section?.nameEn ?? "")} · ${l("قاعة", "Room")} ${session.room}`}
        breadcrumb={[{ label: l("الحضور", "Attendance"), href: "/teacher/attendance" }, { label: session.id }]}
        badge={session.status === "OPEN" ? <Badge tone="success" dot>{l("مفتوحة", "Open")}</Badge> : <Badge tone="neutral">{l("مغلقة", "Closed")}</Badge>}
        actions={
          session.status === "OPEN" ? (
            <form action={closeAttendanceSession}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger-500/40 bg-danger-500/[0.08] px-3.5 text-[12.5px] font-semibold text-danger-500 transition hover:bg-danger-500/[0.14]">
                <Icon name="lock" size={14} /> {l("إغلاق الجلسة", "Close session")}
              </button>
            </form>
          ) : (
            <Link href="/teacher/attendance" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
              <Icon name="arrow-right" size={14} className="rtl:rotate-180" /> {l("كل الجلسات", "All sessions")}
            </Link>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
        <div className="space-y-4">
          {session.status === "OPEN" ? (
            <LiveQr
              sessionId={session.id}
              initialExpiresAt={session.qrExpiresAt}
              expected={roster.length}
              present={session.presentCount + session.lateCount}
              geoLabel={session.geo.label}
            />
          ) : (
            <Card>
              <EmptyState
                icon="lock"
                title={l("الجلسة مغلقة", "Session closed")}
                description={l("أُغلق التحقق في " + relTime(session.closedAt ?? Date.now(), locale) + ". السجل النهائي محفوظ.", "Check-in closed " + relTime(session.closedAt ?? Date.now(), locale) + ". The final record is preserved.")}
              />
            </Card>
          )}

          <Card>
            <CardHeader title={l("ملخص الجلسة", "Session summary")} icon="activity" />
            <div className="mb-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between text-[10.5px] text-fg-muted">
                  <span>{l("نسبة الحضور", "Attendance rate")}</span>
                  <span className="tnum font-semibold text-fg">{pct}%</span>
                </div>
                <Progress value={pct} tone={pct >= 85 ? "success" : pct >= 60 ? "brand" : "warning"} />
              </div>
              <div className="text-center">
                <p className="tnum text-[20px] font-semibold text-fg">{session.presentCount + session.lateCount}</p>
                <p className="text-[9px] text-fg-muted">{l("من", "of")} {roster.length}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: l("حاضر", "Present"), value: records.filter((r) => r.status === "PRESENT").length, tone: "text-success-500" },
                { label: l("متأخر", "Late"), value: records.filter((r) => r.status === "LATE").length, tone: "text-warn-500" },
                { label: l("غياب", "Absent"), value: records.filter((r) => r.status === "ABSENT").length, tone: "text-danger-500" },
                { label: l("بعذر", "Excused"), value: records.filter((r) => r.status === "EXCUSED").length, tone: "text-accent-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-surface-2 px-2.5 py-2">
                  <p className="text-[9.5px] text-fg-muted">{s.label}</p>
                  <p className={`tnum text-[15px] font-semibold ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <KeyValue label={l("التاريخ", "Date")} value={fmtDate(session.date, locale)} />
              <KeyValue label={l("الوقت", "Window")} value={`${session.start} – ${session.end}`} mono />
              <KeyValue label={l("فتحت", "Opened")} value={relTime(session.openedAt, locale)} />
              <KeyValue label={l("مسحوا الرمز", "QR scans")} value={`${scanned}`} />
              <KeyValue label={l("النطاق", "Geofence")} value={`${session.geo.radiusM} ${l("م", "m")}`} />
            </div>
          </Card>

          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-fg-soft">
              <Icon name="shield-check" size={12} className="text-success-500" /> {l("لماذا هذا آمن؟", "Why is this safe?")}
            </p>
            <ul className="mt-1.5 space-y-1 text-[9.5px] leading-relaxed text-fg-muted">
              <li>· {l("الرمز يُولَّد ويُوقّع على الخادم فقط، ولمدة 20 ثانية.", "The token is minted and signed server-side, for 20 seconds only.")}</li>
              <li>· {l("الجهاز يجب أن يكون مسجّلاً ومربوطاً بالطالب.", "The device must be registered and bound to the student.")}</li>
              <li>· {l("لا يُطلب الموقع إلا لحظة التحقق، ولا يُخزَّن مسار التحرك.", "Location is read only at check-in; no movement history is stored.")}</li>
            </ul>
          </div>
        </div>

        <Card>
          <CardHeader
            title={l("كشف الحضور", "Live roster")}
            subtitle={l("يمكنك تصحيح أي حالة يدوياً — يُسجَّل التعديل في التدقيق", "Override any status manually — every change is audited")}
            icon="users"
            action={<Badge tone={session.status === "OPEN" ? "success" : "neutral"}>{session.status === "OPEN" ? l("يتحدث تلقائياً", "Auto-refreshing") : l("مغلق", "Closed")}</Badge>}
          />
          <div className="space-y-1.5">
            {roster.map((s) => {
              const rec = statusOf(s.id);
              const meta = rec
                ? { PRESENT: { t: l("حاضر", "Present"), tone: "success" as const }, LATE: { t: l("متأخر", "Late"), tone: "warning" as const }, ABSENT: { t: l("غائب", "Absent"), tone: "danger" as const }, EXCUSED: { t: l("بعذر", "Excused"), tone: "accent" as const } }[rec.status]
                : { t: l("لم يسجّل", "Not yet"), tone: "neutral" as const };
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-fg">{l(s.nameAr, s.nameEn)}</p>
                    <p className="font-mono text-[9.5px] text-fg-muted">
                      {s.studentNumber}
                      {rec ? ` · ${relTime(rec.markedAt, locale)}` : ""}
                      {rec?.geoDistanceM !== undefined ? ` · ${Math.round(rec.geoDistanceM)}m` : ""}
                    </p>
                  </div>
                  {rec && <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[8.5px] text-fg-muted">{rec.method}</span>}
                  <Badge tone={meta.tone} dot>{meta.t}</Badge>
                  <form action={overrideAttendance} className="flex items-center gap-1">
                    <input type="hidden" name="sessionId" value={session.id} />
                    <input type="hidden" name="studentId" value={s.id} />
                    <select
                      name="status"
                      defaultValue={rec?.status ?? "PRESENT"}
                      aria-label={l("تعديل الحالة", "Override status")}
                      className="h-7 rounded-md border border-line-strong bg-surface px-1 text-[10px] text-fg-soft"
                    >
                      <option value="PRESENT">{l("حاضر", "Present")}</option>
                      <option value="LATE">{l("متأخر", "Late")}</option>
                      <option value="ABSENT">{l("غائب", "Absent")}</option>
                      <option value="EXCUSED">{l("بعذر", "Excused")}</option>
                    </select>
                    <button type="submit" className="grid h-7 w-7 place-items-center rounded-md border border-line-strong bg-surface text-fg-soft transition hover:text-brand-500" title={l("حفظ", "Save")}>
                      <Icon name="check" size={12} />
                    </button>
                  </form>
                </div>
              );
            })}
            {roster.length === 0 && <p className="py-6 text-center text-[11.5px] text-fg-muted">{l("لا طلاب في هذه الشعبة.", "No students in this section.")}</p>}
          </div>
          <p className="mt-3 text-[9.5px] leading-relaxed text-fg-muted">
            {l(
              "التعديل اليدوي يتطلب صلاحية المعلم على الجلسة، ويُخزَّن مع الطابع الزمني ومعرّف المعلم والسبب.",
              "Manual overrides require course ownership and are stored with timestamp, teacher id and reason.",
            )}
          </p>
        </Card>
      </div>
    </div>
  );
}
