import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, Icon, Select, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findCourse, findSection } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { openAttendanceSession } from "@/app/actions/teacher";
import { fmtDate, makeL, relTime } from "@/lib/utils";

export const metadata = { title: "جلسات الحضور" };

export default async function TeacherAttendancePage({ searchParams }: { searchParams: Promise<{ course?: string; error?: string }> }) {
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const courseIds = new Set(courses.map((c) => c.id));
  const sessions = db()
    .attendanceSessions.filter((s) => s.teacherId === teacher.id)
    .sort((a, b) => b.openedAt - a.openedAt);

  const open = sessions.filter((s) => s.status === "OPEN");
  const totalPresent = sessions.reduce((a, s) => a + s.presentCount, 0);
  const totalExpected = sessions.reduce((a, s) => a + s.expectedCount, 0);
  const rate = totalExpected ? Math.round((totalPresent / totalExpected) * 100) : 0;
  const defaultCourse = sp.course && courseIds.has(sp.course) ? sp.course : courses[0]?.id ?? "";

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("جلسات الحضور", "Attendance sessions")}
        subtitle={l("رمز QR متغيّر كل 20 ثانية — لا يمكن إعادة استخدامه", "A rotating QR token every 20 seconds — never reusable")}
        breadcrumb={[{ label: l("التدريس", "Teaching") }, { label: l("الحضور", "Attendance") }]}
      />

      {sp.error && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" />
          {l("تعذّر تنفيذ العملية — تحقّق من صلاحيتك على المقرر.", "Action failed — check that the course belongs to you.")}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("جلسات هذا الفصل", "Sessions this term")} value={sessions.length} icon="qr" tone="brand" />
        <StatCard label={l("جلسات مفتوحة", "Open sessions")} value={open.length} icon="activity" tone={open.length ? "success" : "neutral"} hint={open.length ? l("مباشرة الآن", "live now") : l("لا شيء مباشر", "none live")} />
        <StatCard label={l("متوسط الحضور", "Average attendance")} value={`${rate}%`} icon="users" tone={rate >= 85 ? "success" : "warning"} hint={`${totalPresent}/${totalExpected}`} />
        <StatCard label={l("غياب بدون عذر", "Unexcused absences")} value={db().attendanceRecords.filter((r) => courseIds.has(r.courseId) && r.status === "ABSENT").length} icon="alert" tone="danger" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader title={l("بدء جلسة حضور", "Start a session")} subtitle={l("يُفتح رمز QR فوراً على الشاشة", "A QR token opens immediately")} icon="play" />
          <form action={openAttendanceSession} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-medium text-fg-soft">{l("المقرر", "Course")}</span>
              <Select name="courseId" defaultValue={defaultCourse} required>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {l(c.nameAr, c.nameEn)}
                  </option>
                ))}
              </Select>
            </label>
            <div className="rounded-lg border border-line bg-surface-2/60 p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-fg-soft">
                <Icon name="map-pin" size={12} className="text-brand-400" /> {l("النطاق الجغرافي", "Geofence")}
              </p>
              <p className="text-[10px] leading-relaxed text-fg-muted">
                {l("الحرم الجامعي — مبنى الهندسة · نصف قطر 120 متراً · دقة الموقع مطلوبة ±50م.", "Engineering building · 120 m radius · location accuracy ±50 m.")}
              </p>
            </div>
            <button type="submit" className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-[12.5px] font-semibold text-white transition hover:bg-brand-600">
              <Icon name="qr" size={15} /> {l("فتح الجلسة وعرض QR", "Open session & show QR")}
            </button>
            <p className="text-[9.5px] leading-relaxed text-fg-muted">
              {l(
                "إذا كانت هناك جلسة مفتوحة لنفس المقرر سيتم توجيهك إليها بدلاً من إنشاء نسخة ثانية.",
                "If a session is already open for this course you will be sent to it instead of creating a duplicate.",
              )}
            </p>
          </form>
        </Card>

        <Card>
          <CardHeader title={l("سجل الجلسات", "Session history")} subtitle={l("أحدث الجلسات أولاً", "Most recent first")} icon="list-checks" />
          {sessions.length === 0 ? (
            <EmptyState icon="qr" title={l("لا جلسات بعد", "No sessions yet")} description={l("ابدأ جلسة من اللوحة المجاورة.", "Start one from the panel beside this.")} />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>{l("المقرر", "Course")}</Th>
                  <Th>{l("التاريخ", "Date")}</Th>
                  <Th>{l("الوقت", "Time")}</Th>
                  <Th align="end">{l("حاضر / متوقع", "Present / expected")}</Th>
                  <Th align="end">{l("الحالة", "Status")}</Th>
                  <Th align="end" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const course = findCourse(s.courseId);
                  const section = findSection(s.sectionId);
                  const pct = s.expectedCount ? Math.round((s.presentCount / s.expectedCount) * 100) : 0;
                  return (
                    <tr key={s.id} className="transition hover:bg-surface-2/70">
                      <Td>
                        <p className="text-[11.5px] font-medium text-fg">{course ? l(course.nameAr, course.nameEn) : s.courseId}</p>
                        <p className="text-[9.5px] text-fg-muted">{course?.code} · {l(section?.nameAr ?? "", section?.nameEn ?? "")}</p>
                      </Td>
                      <Td><span className="text-[11px] text-fg-soft">{fmtDate(s.date, locale)}</span></Td>
                      <Td><span className="tnum text-[10.5px] text-fg-muted">{s.start}–{s.end}</span></Td>
                      <Td align="end">
                        <span className="tnum text-[11.5px] font-semibold text-fg">{s.presentCount + s.lateCount}</span>
                        <span className="tnum text-[10.5px] text-fg-muted"> / {s.expectedCount}</span>
                        <span className={`tnum ms-1.5 text-[9.5px] ${pct >= 85 ? "text-success-500" : "text-warn-500"}`}>{pct}%</span>
                      </Td>
                      <Td align="end">
                        {s.status === "OPEN" ? <Badge tone="success" dot>{l("مفتوحة", "Open")}</Badge> : <Badge tone="neutral">{l("مغلقة", "Closed")}</Badge>}
                      </Td>
                      <Td align="end">
                        <Link href={`/teacher/attendance/${s.id}`} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:underline">
                          {s.status === "OPEN" ? l("شاشة QR", "QR screen") : l("التفاصيل", "Details")}
                          <Icon name="chevron-right" size={11} className="rtl:rotate-180" />
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
          <p className="mt-3 text-[9.5px] text-fg-muted">
            {l(
              "كل تعديل يدوي على الحضور يُسجَّل في سجل التدقيق باسم المعلم والسبب والوقت.",
              "Every manual attendance override is written to the audit log with teacher, reason and timestamp.",
            )}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title={l("سياسة الحضور المعتمدة", "Attendance policy")} icon="shield-check" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: l("رمز متغير", "Rotating token"), d: l("رمز QR صالح 20 ثانية ويُستبدل تلقائياً — لا يمكن مشاركته خارج القاعة.", "The QR token is valid for 20 seconds and auto-replaces — it cannot be shared outside the room.") },
            { t: l("تحقق مزدوج", "Dual verification"), d: l("جهاز مسجّل + نطاق جغرافي + جلسة مفتوحة. أي إخفاق يُسجَّل ولا يمنع الحضور يدوياً.", "Registered device + geofence + open session. Failures are logged, never a block on manual marking.") },
            { t: l("حق التصحيح", "Right to correction"), d: l("يمكن للطالب تقديم طلب تصحيح حضور من التطبيق ويُراجع من المعلم.", "Students can file an attendance correction request from the app for teacher review.") },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-surface-2/50 p-3">
              <p className="text-[11.5px] font-semibold text-fg">{x.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">{x.d}</p>
            </div>
          ))}
        </div>
        {open.length > 0 && (
          <p className="mt-3 text-[10px] text-fg-muted">
            {l("آخر جلسة مفتوحة", "Last opened")} {relTime(open[0].openedAt, locale)}
          </p>
        )}
      </Card>
    </div>
  );
}
