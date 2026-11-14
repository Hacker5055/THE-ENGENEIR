import Link from "next/link";
import { Badge, Card, EmptyState, Icon, SearchInput, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard, ToolbarBar } from "@/components/shells/app-shell";
import { db, findCourse } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { CATEGORY_LABEL } from "@/lib/complaints";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "الطلبات والاستئنافات" };

const STATUS_META = {
  OPEN: { ar: "جديد", en: "Open", tone: "warning" },
  UNDER_REVIEW: { ar: "قيد المراجعة", en: "Under review", tone: "brand" },
  WAITING_FOR_STUDENT: { ar: "بانتظار الطالب", en: "Awaiting student", tone: "accent" },
  RESOLVED: { ar: "محلول", en: "Resolved", tone: "success" },
  REJECTED: { ar: "مرفوض", en: "Rejected", tone: "danger" },
} as const;

export default async function AdminComplaintsPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string; q?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const status = sp.status ?? "ACTIVE";

  const all = db().complaints;
  const list = all.filter((c) => {
    if (status === "ACTIVE" && (c.status === "RESOLVED" || c.status === "REJECTED")) return false;
    if (status !== "ACTIVE" && status !== "ALL" && c.status !== status) return false;
    if (sp.category && c.category !== sp.category) return false;
    if (q && !c.subject.toLowerCase().includes(q) && !c.ticket.toLowerCase().includes(q)) return false;
    return true;
  });

  const overdue = all.filter((c) => ["OPEN", "UNDER_REVIEW"].includes(c.status) && Date.now() - c.createdAt > 48 * 3600_000).length;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الطلبات والاستئنافات", "Requests & appeals")}
        subtitle={l("تصحيح حضور، التماس درجات، حوادث اختبار — بمسار واحد موثّق", "Attendance fixes, grade appeals, exam incidents — one documented workflow")}
        breadcrumb={[{ label: l("العمليات", "Operations") }, { label: l("الطلبات", "Requests") }]}
        badge={<Badge tone={overdue ? "danger" : "success"} dot>{overdue ? `${overdue} ${l("متأخرة عن 48 ساعة", "overdue > 48h")}` : l("ضمن زمن الاستجابة", "within SLA")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("مفتوحة", "Open")} value={all.filter((c) => c.status === "OPEN").length} icon="message" tone="warning" />
        <StatCard label={l("قيد المراجعة", "Under review")} value={all.filter((c) => c.status === "UNDER_REVIEW").length} icon="eye" tone="brand" />
        <StatCard label={l("محلولة", "Resolved")} value={all.filter((c) => c.status === "RESOLVED").length} icon="check-circle" tone="success" />
        <StatCard label={l("متأخرة", "Overdue")} value={overdue} icon="alert" tone={overdue ? "danger" : "neutral"} hint={l("أكثر من 48 ساعة", "more than 48h")} />
      </section>

      <ToolbarBar>
        <form action="/admin/complaints" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput name="q" defaultValue={sp.q} placeholder={l("رقم التذكرة أو الموضوع…", "Ticket or subject…")} className="h-9 w-full max-w-[240px]" />
          <select name="status" defaultValue={status} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            {[
              ["ACTIVE", l("المفتوحة", "Active")],
              ["OPEN", l("جديدة", "Open")],
              ["UNDER_REVIEW", l("قيد المراجعة", "Under review")],
              ["WAITING_FOR_STUDENT", l("بانتظار الطالب", "Awaiting student")],
              ["RESOLVED", l("محلولة", "Resolved")],
              ["REJECTED", l("مرفوضة", "Rejected")],
              ["ALL", l("الكل", "All")],
            ].map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <select name="category" defaultValue={sp.category ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل التصنيفات", "All categories")}</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{l(v.ar, v.en)}</option>)}
          </select>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={13} /> {l("تصفية", "Filter")}
          </button>
        </form>
        <span className="text-[11.5px] text-fg-muted">{list.length} {l("تذكرة", "tickets")}</span>
      </ToolbarBar>

      <Card padded={false} className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon="message" title={l("لا طلبات", "No requests")} description={l("لا تذاكر بهذه التصفية.", "No tickets for this filter.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("التذكرة", "Ticket")}</Th>
                <Th>{l("الموضوع", "Subject")}</Th>
                <Th>{l("الطالب", "Student")}</Th>
                <Th>{l("التصنيف", "Category")}</Th>
                <Th align="center">{l("الرسائل", "Messages")}</Th>
                <Th>{l("آخر تحديث", "Updated")}</Th>
                <Th align="end">{l("الحالة", "Status")}</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const student = db().students.find((s) => s.id === c.studentId);
                const course = c.relatedCourseId ? findCourse(c.relatedCourseId) : null;
                const cat = CATEGORY_LABEL[c.category];
                const st = STATUS_META[c.status];
                return (
                  <tr key={c.id} className="cursor-pointer transition hover:bg-surface-2/60">
                    <Td>
                      <Link href={`/admin/complaints/${c.id}`} className="font-mono text-[10px] font-medium text-brand-500 hover:underline">{c.ticket}</Link>
                      {c.messages.some((m) => m.internal) && <p className="text-[8.5px] text-fg-muted">{l("به ملاحظات داخلية", "has internal notes")}</p>}
                    </Td>
                    <Td>
                      <Link href={`/admin/complaints/${c.id}`} className="block max-w-[320px] truncate text-[11px] text-fg">{c.subject}</Link>
                      {course && <p className="font-mono text-[9px] text-fg-muted">{course.code}</p>}
                    </Td>
                    <Td>
                      <p className="truncate text-[10.5px] text-fg-soft">{student ? l(student.nameAr, student.nameEn) : c.studentId}</p>
                      <p className="font-mono text-[9px] text-fg-muted">{student?.studentNumber}</p>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-[10px] text-fg-muted">
                        <Icon name={cat.icon} size={11} /> {l(cat.ar, cat.en)}
                      </span>
                    </Td>
                    <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{c.messages.filter((m) => !m.internal).length}</span></Td>
                    <Td><span className="text-[9.5px] text-fg-muted">{relTime(c.updatedAt, locale)}</span></Td>
                    <Td align="end">
                      <Badge tone={st.tone}>{l(st.ar, st.en)}</Badge>
                      {Date.now() - c.createdAt > 48 * 3600_000 && ["OPEN", "UNDER_REVIEW"].includes(c.status) && (
                        <p className="mt-0.5 text-[8.5px] font-semibold text-danger-500">{l("متأخر", "overdue")}</p>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { t: l("زمن الاستجابة المستهدف", "Target response"), d: l("24 ساعة للرد الأول، 48 ساعة للقرار — يُحسب من وقت التقديم.", "24h for first reply, 48h for a decision — measured from submission.") },
            { t: l("حق الاستئناف", "Right to appeal"), d: l("لكل قرار رفض مسار استئناف ثانٍ يُراجعه مسؤول مختلف.", "Every rejection has a second-level appeal reviewed by a different officer.") },
            { t: l("خصوصية المحادثة", "Conversation privacy"), d: l("الملاحظات الداخلية لا تظهر للطالب؛ كل رسالة تُسجَّل باسم كاتبها.", "Internal notes stay hidden from students; every message is attributed.") },
          ].map((x) => (
            <div key={x.t} className="rounded-lg border border-line bg-surface-2/50 p-3">
              <p className="text-[11px] font-semibold text-fg">{x.t}</p>
              <p className="mt-1 text-[9.5px] leading-relaxed text-fg-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
