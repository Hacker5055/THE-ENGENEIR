import Link from "next/link";
import { Badge, Card, CardHeader, EmptyState, Icon, Progress, StatusBadge, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findCourse, findTeacher } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { fmtDateTime, makeL } from "@/lib/utils";

export const metadata = { title: "الاختبارات" };

export default async function AdminExamsPage({ searchParams }: { searchParams: Promise<{ status?: string; course?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const status = sp.status ?? "ALL";

  const all = db().examinations;
  const list = all.filter((e) => (status === "ALL" || e.status === status) && (!sp.course || e.courseId === sp.course));
  const attempts = db().attempts;
  const graded = attempts.filter((a) => a.score !== undefined);
  const avgScore = graded.length
    ? Math.round((graded.reduce((a, x) => a + (x.score ?? 0), 0) / graded.length / Math.max(1, all.reduce((a, e) => Math.max(a, e.totalMarks), 1))) * 100)
    : 0;

  const integrity = {
    flagged: attempts.filter((a) => a.status === "FLAGGED").length,
    locked: attempts.filter((a) => a.status === "LOCKED").length,
    cancelled: attempts.filter((a) => a.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("إدارة الاختبارات", "Examination operations")}
        subtitle={l("كل الاختبارات، السياسات، والمحاولات على مستوى المؤسسة", "All examinations, policies and attempts institution-wide")}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("الاختبارات", "Examinations") }]}
        actions={
          <Link href="/admin/exam-control" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-600">
            <Icon name="shield-alert" size={14} /> {l("مركز المراقبة", "Control center")}
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("الاختبارات", "Examinations")} value={all.length} icon="file-text" tone="brand" hint={`${all.filter((e) => e.status === "LIVE").length} ${l("جارٍ", "live")}`} />
        <StatCard label={l("المحاولات", "Attempts")} value={attempts.length} icon="users" tone="accent" hint={`${graded.length} ${l("مصححة", "graded")}`} />
        <StatCard label={l("متوسط النتائج", "Average result")} value={`${avgScore}%`} icon="percent" tone="success" />
        <StatCard label={l("إجراءات نزاهة", "Integrity actions")} value={integrity.flagged + integrity.locked + integrity.cancelled} icon="shield-alert" tone="danger" hint={`${integrity.locked} ${l("مجمّدة", "locked")}`} />
      </section>

      <div className="flex flex-wrap items-center gap-1.5">
        {["ALL", "LIVE", "SCHEDULED", "CLOSED", "DRAFT"].map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/exams" : `/admin/exams?status=${s}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium transition ${status === s ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"}`}
          >
            {s === "ALL" ? l("الكل", "All") : s === "LIVE" ? l("جارٍ", "Live") : s === "SCHEDULED" ? l("مجدول", "Scheduled") : s === "CLOSED" ? l("منتهٍ", "Closed") : l("مسودة", "Draft")}
            <span className="tnum rounded bg-surface-3 px-1 text-[9px]">{s === "ALL" ? all.length : all.filter((e) => e.status === s).length}</span>
          </Link>
        ))}
        <span className="ms-auto text-[11px] text-fg-muted">{list.length} {l("نتيجة", "results")}</span>
      </div>

      <Card padded={false} className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon="file-text" title={l("لا اختبارات", "No examinations")} description={l("غيّر التصفية.", "Change the filter.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("الاختبار", "Examination")}</Th>
                <Th>{l("المقرر / المعلم", "Course / faculty")}</Th>
                <Th>{l("النافذة", "Window")}</Th>
                <Th align="center">{l("المحاولات", "Attempts")}</Th>
                <Th>{l("التصحيح", "Grading")}</Th>
                <Th align="center">{l("الحوادث", "Incidents")}</Th>
                <Th align="end">{l("الحالة", "Status")}</Th>
                <Th align="end" />
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const course = findCourse(e.courseId);
                const teacher = findTeacher(e.teacherId);
                const ea = attempts.filter((a) => a.examinationId === e.id);
                const done = ea.filter((a) => ["GRADED", "SUBMITTED"].includes(a.status)).length;
                const violations = ea.reduce((a, x) => a + x.violations, 0);
                return (
                  <tr key={e.id} id={e.id} className="transition hover:bg-surface-2/60">
                    <Td>
                      <p className="text-[11.5px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                      <p className="font-mono text-[9px] text-fg-muted">{e.code} · {e.totalMarks} {l("درجة", "marks")} · {e.durationMin}m</p>
                    </Td>
                    <Td>
                      <p className="text-[10.5px] text-fg-soft">{course ? l(course.nameAr, course.nameEn) : "—"}</p>
                      <p className="text-[9px] text-fg-muted">{teacher ? l(teacher.nameAr, teacher.nameEn) : "—"}</p>
                    </Td>
                    <Td><span className="text-[10px] text-fg-muted">{fmtDateTime(e.startsAt, locale)}</span></Td>
                    <Td align="center"><span className="tnum text-[11px] font-medium text-fg">{ea.length}</span></Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16"><Progress value={ea.length ? (done / ea.length) * 100 : 0} size="sm" tone={e.resultPublished ? "success" : "brand"} /></div>
                        <span className="tnum text-[9px] text-fg-muted">{done}/{ea.length}</span>
                      </div>
                    </Td>
                    <Td align="center">
                      <span className={`tnum text-[11px] ${violations > 0 ? "font-semibold text-warn-500" : "text-fg-muted"}`}>{violations}</span>
                    </Td>
                    <Td align="end">
                      <StatusBadge status={e.status} />
                      {e.resultPublished && <p className="mt-0.5 text-[8.5px] text-success-500">{l("منشورة", "published")}</p>}
                    </Td>
                    <Td align="end">
                      <Link href={`/admin/exam-control?exam=${e.id}`} className="text-[10.5px] font-semibold text-brand-500 hover:underline">{l("مراقبة", "Monitor")}</Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { t: l("محاولات معلّمة", "Flagged attempts"), v: integrity.flagged, d: l("حُدّدت بعد حادثة واحدة موثّقة", "Marked after one documented incident"), tone: "warning" as const },
          { t: l("محاولات مجمّدة", "Locked attempts"), v: integrity.locked, d: l("تجاوزت حد الحوادث — بانتظار قرار بشري", "Passed the cap — awaiting a human decision"), tone: "danger" as const },
          { t: l("محاولات ملغاة", "Voided attempts"), v: integrity.cancelled, d: l("بقرار مراقب موثّق بالسبب", "By a supervisor decision with a reason"), tone: "neutral" as const },
        ].map((x) => (
          <Card key={x.t}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-fg-muted">{x.t}</p>
                <p className="tnum mt-0.5 text-[20px] font-semibold text-fg">{x.v}</p>
              </div>
              <Badge tone={x.tone}>{x.tone === "danger" ? l("حرج", "Critical") : x.tone === "warning" ? l("متابعة", "Watch") : l("مغلق", "Closed")}</Badge>
            </div>
            <p className="mt-1.5 text-[9.5px] text-fg-muted">{x.d}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={l("السياسات الافتراضية", "Default policies")} icon="shield-check" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: l("قياسي", "Standard"), p: l("تسجيل الأحداث، بدون تجميد، إعادة المحاولة مسموحة حسب الإعداد.", "Event logging, no freeze, retakes per settings.") },
            { t: l("صارم", "Strict"), p: l("تحذير الطالب، إخطار المعلم، تجميد عند تجاوز الحد.", "Student warning, teacher notification, freeze past the cap.") },
            { t: l("مقيّد", "Lockdown"), p: l("جهاز مُدار + موقع، تجميد فوري عند تجاوز الحد، بدون تصفح.", "Managed device + location, immediate freeze past the cap.") },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-surface-2/50 p-3">
              <p className="text-[11.5px] font-semibold text-fg">{x.t}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">{x.p}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[9.5px] text-fg-muted">
          {l("تغيير السياسة لا يؤثر على محاولة جارية — يتطلب إعادة جدولة أو قرار مراقب.", "Changing a policy never alters a running attempt — it needs rescheduling or a supervisor decision.")}
        </p>
      </Card>
    </div>
  );
}
