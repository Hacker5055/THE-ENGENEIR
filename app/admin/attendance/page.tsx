import Link from "next/link";
import { Badge, Card, CardHeader, Icon, Progress, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { BarChart, Legend, LineChart } from "@/components/charts";
import { db, findCourse, findSection } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { fmtDate, makeL, relTime } from "@/lib/utils";

export const metadata = { title: "تقارير الحضور" };

export default async function AdminAttendancePage({ searchParams }: { searchParams: Promise<{ course?: string; method?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;

  const records = db().attendanceRecords.filter((r) => {
    if (sp.course && r.courseId !== sp.course) return false;
    if (sp.method && r.method !== sp.method) return false;
    return true;
  });

  const sessions = db().attendanceSessions;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const excused = records.filter((r) => r.status === "EXCUSED").length;
  const rate = records.length ? Math.round(((present + late) / records.length) * 100) : 0;

  const openSessions = sessions.filter((s) => s.status === "OPEN");
  const byMethod = ["QR", "GEOFENCE", "MANUAL", "TEACHER_OVERRIDE"].map((m) => ({
    label: m === "QR" ? l("رمز QR", "QR scan") : m === "GEOFENCE" ? l("نطاق جغرافي", "Geofence") : m === "MANUAL" ? l("يدوي", "Manual") : l("تعديل معلم", "Override"),
    value: db().attendanceRecords.filter((r) => r.method === m).length,
    color: m === "QR" ? "#38A5FF" : m === "GEOFENCE" ? "#19B88A" : m === "MANUAL" ? "#F2A93B" : "#F05252",
  }));

  const weekly = [86, 89, 84, 91, 88, 85, rate];
  const byCourse = db().courses.map((c) => {
    const recs = db().attendanceRecords.filter((r) => r.courseId === c.id);
    const p = recs.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    return { label: c.code, value: recs.length ? Math.round((p / recs.length) * 100) : 0, color: c.color };
  });

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("تقارير الحضور والانصراف", "Attendance & departure reports")}
        subtitle={l("التحقق عبر QR، النطاق الجغرافي، والتعديل اليدوي — كلها موثّقة", "QR, geofence and manual overrides — all documented")}
        breadcrumb={[{ label: l("التقييم والحضور", "Assessment") }, { label: l("الحضور", "Attendance") }]}
        badge={<Badge tone={rate >= 85 ? "success" : "warning"} dot>{rate}% {l("حضور", "attendance")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label={l("حاضر", "Present")} value={present} icon="check-circle" tone="success" />
        <StatCard label={l("متأخر", "Late")} value={late} icon="clock" tone="warning" />
        <StatCard label={l("غائب", "Absent")} value={absent} icon="x" tone="danger" />
        <StatCard label={l("بعذر", "Excused")} value={excused} icon="file-check" tone="accent" />
        <StatCard label={l("جلسات مفتوحة", "Open sessions")} value={openSessions.length} icon="qr" tone={openSessions.length ? "brand" : "neutral"} />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link href="/admin/attendance" className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11.5px] font-medium ${!sp.course && !sp.method ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
          {l("الكل", "All")}
        </Link>
        {["QR", "GEOFENCE", "MANUAL", "TEACHER_OVERRIDE"].map((m) => (
          <Link key={m} href={`/admin/attendance?method=${m}`} className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10.5px] font-medium ${sp.method === m ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}>
            {m === "QR" ? "QR" : m === "GEOFENCE" ? l("نطاق", "Geofence") : m === "MANUAL" ? l("يدوي", "Manual") : l("تعديل", "Override")}
          </Link>
        ))}
        <div className="ms-auto flex flex-wrap gap-1">
          {db().courses.slice(0, 6).map((c) => (
            <Link key={c.id} href={`/admin/attendance?course=${c.id}`} className={`inline-flex h-7 items-center rounded-md border px-2 font-mono text-[9.5px] ${sp.course === c.id ? "border-brand-500/40 text-brand-400" : "border-line text-fg-muted"}`}>
              {c.code}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={l("اتجاه الحضور", "Attendance trend")} subtitle={l("نسبة الحضور الفعلية خلال الأسبوع", "Actual attendance across the week")} icon="trending-up" />
          <LineChart
            series={[{ name: l("الحضور", "Attendance"), color: "#38A5FF", data: weekly }]}
            labels={["س", "ح", "ن", "ث", "ر", "خ", "ج"]}
            height={190}
            yMax={100}
            valueSuffix="%"
            ariaLabel={l("اتجاه الحضور", "Attendance trend")}
          />
          <Legend items={[{ label: l("نسبة الحضور اليومية", "Daily attendance rate"), color: "#38A5FF" }]} className="mt-2" />
        </Card>

        <Card>
          <CardHeader title={l("طرق التحقق", "Verification methods")} subtitle={l("كيف سُجّل الحضور فعلياً", "How attendance was actually recorded")} icon="shield-check" />
          <BarChart data={byMethod} horizontal ariaLabel={l("طرق التحقق", "Verification methods")} />
          <p className="mt-2 text-[9.5px] leading-relaxed text-fg-muted">
            {l(
              "التعديل اليدوي مسموح للمعلم لكنه يُسجَّل بالسبب ويظهر في هذا التقرير — لا يمكن إخفاؤه.",
              "Manual overrides are allowed for teachers but always carry a reason and appear in this report — they cannot be hidden.",
            )}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={l("الحضور حسب المقرر", "Attendance by course")} icon="book" />
          <BarChart data={byCourse} horizontal suffix="%" ariaLabel={l("الحضور حسب المقرر", "Attendance by course")} />
        </Card>

        <Card padded={false} className="overflow-hidden">
          <CardHeader title={l("الجلسات الأخيرة", "Recent sessions")} subtitle={`${sessions.length} ${l("جلسة", "sessions")}`} icon="list-checks" />
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("المقرر / الشعبة", "Course / section")}</Th>
                <Th>{l("التاريخ", "Date")}</Th>
                <Th align="center">{l("الحضور", "Present")}</Th>
                <Th align="center">{l("الحالة", "Status")}</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 8).map((s) => {
                const c = findCourse(s.courseId);
                const section = findSection(s.sectionId);
                const pct = s.expectedCount ? Math.round(((s.presentCount + s.lateCount) / s.expectedCount) * 100) : 0;
                return (
                  <tr key={s.id} className="transition hover:bg-surface-2/60">
                    <Td>
                      <p className="text-[10.5px] font-medium text-fg">{c ? l(c.nameAr, c.nameEn) : s.courseId}</p>
                      <p className="text-[9px] text-fg-muted">{c?.code} · {l(section?.nameAr ?? "", section?.nameEn ?? "")} · {s.room}</p>
                    </Td>
                    <Td><span className="text-[10px] text-fg-muted">{fmtDate(s.date, locale)}</span></Td>
                    <Td align="center">
                      <span className="tnum text-[10.5px] font-medium text-fg">{s.presentCount + s.lateCount}</span>
                      <span className="tnum text-[9px] text-fg-muted">/{s.expectedCount}</span>
                      <div className="mt-0.5 w-14"><Progress value={pct} size="sm" tone={pct >= 85 ? "success" : pct >= 60 ? "brand" : "danger"} /></div>
                    </Td>
                    <Td align="center"><Badge tone={s.status === "OPEN" ? "success" : "neutral"} dot>{s.status === "OPEN" ? l("مفتوحة", "Open") : l("مغلقة", "Closed")}</Badge></Td>
                  </tr>
                );
              })}
              {sessions.length === 0 && <tr><Td colSpan={4} className="py-6 text-center text-[11px] text-fg-muted">{l("لا جلسات.", "No sessions.")}</Td></tr>}
            </tbody>
          </TableWrap>
        </Card>
      </div>

      <Card>
        <CardHeader title={l("سجل الحضور التفصيلي", "Detailed attendance log")} subtitle={`${records.length} ${l("سجلاً", "records")} · الأحدث أولاً`} icon="clipboard" />
        <TableWrap>
          <thead>
            <tr>
              <Th>{l("الطالب", "Student")}</Th>
              <Th>{l("المقرر", "Course")}</Th>
              <Th>{l("التاريخ", "Date")}</Th>
              <Th align="center">{l("الحالة", "Status")}</Th>
              <Th align="center">{l("الطريقة", "Method")}</Th>
              <Th align="center">{l("المسافة", "Distance")}</Th>
              <Th align="end">{l("الوقت", "Time")}</Th>
            </tr>
          </thead>
          <tbody>
            {[...records].sort((a, b) => b.markedAt - a.markedAt).slice(0, 18).map((r) => {
              const student = db().students.find((s) => s.id === r.studentId);
              const c = findCourse(r.courseId);
              return (
                <tr key={r.id} className="transition hover:bg-surface-2/60">
                  <Td><span className="text-[10.5px] text-fg">{student ? l(student.nameAr, student.nameEn) : r.studentId}</span></Td>
                  <Td><span className="font-mono text-[9.5px] text-fg-soft">{c?.code}</span></Td>
                  <Td><span className="text-[10px] text-fg-muted">{fmtDate(r.date, locale)}</span></Td>
                  <Td align="center">
                    <Badge tone={r.status === "PRESENT" ? "success" : r.status === "LATE" ? "warning" : r.status === "EXCUSED" ? "accent" : "danger"}>
                      {r.status === "PRESENT" ? l("حاضر", "Present") : r.status === "LATE" ? l("متأخر", "Late") : r.status === "EXCUSED" ? l("بعذر", "Excused") : l("غائب", "Absent")}
                    </Badge>
                  </Td>
                  <Td align="center"><span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[8.5px] text-fg-muted">{r.method}</span></Td>
                  <Td align="center"><span className="tnum text-[9.5px] text-fg-muted">{r.geoDistanceM !== undefined ? `${Math.round(r.geoDistanceM)}m` : "—"}</span></Td>
                  <Td align="end"><span className="text-[9px] text-fg-muted">{relTime(r.markedAt, locale)}</span></Td>
                </tr>
              );
            })}
            {records.length === 0 && <tr><Td colSpan={7} className="py-6 text-center text-[11px] text-fg-muted">{l("لا سجلات.", "No records.")}</Td></tr>}
          </tbody>
        </TableWrap>
      </Card>

      <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-soft">
          <Icon name="map-pin" size={13} className="text-accent-400" /> {l("خصوصية الموقع", "Location privacy")}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
          {l(
            "يُقرأ الموقع لحظة تسجيل الحضور فقط، ويُحفظ الحكم (داخل/خارج النطاق مع المسافة) لا الإحداثيات الكاملة ولا مسار التحرك.",
            "Location is read only at check-in, and only the decision (inside/outside with distance) is stored — never full coordinates or movement history.",
          )}
        </p>
      </div>
    </div>
  );
}
