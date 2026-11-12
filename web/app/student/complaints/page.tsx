import Link from "next/link";
import { Badge, Icon, StatusBadge } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { db } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { makeL, relTime } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/lib/complaints";

export const metadata = { title: "الطلبات والاستئنافات" };

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { student, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { status = "ALL" } = await searchParams;
  const all = db().complaints.filter((c) => c.studentId === student.id);
  const list = status === "ALL" ? all : all.filter((c) => c.status === status);

  return (
    <div className="pb-6">
      <MobileAppBar
        back={{ href: "/student" }}
        title={l("الطلبات والاستئنافات", "Requests & appeals")}
        subtitle={`${all.length} ${l("طلباً", "requests")}`}
        unread={unread}
        right={
          <Link href="/student/complaints/new" className="grid size-9 place-items-center rounded-lg bg-brand text-white" aria-label={l("طلب جديد", "New request")}>
            <Icon name="plus" size={16} />
          </Link>
        }
      />
      <div className="space-y-3 px-4 pt-4">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {[
            { key: "ALL", ar: "الكل", en: "All" },
            { key: "OPEN", ar: "مفتوح", en: "Open" },
            { key: "UNDER_REVIEW", ar: "مراجعة", en: "Review" },
            { key: "WAITING_FOR_STUDENT", ar: "بانتظارك", en: "Waiting on you" },
            { key: "RESOLVED", ar: "تم الحل", en: "Resolved" },
          ].map((f) => (
            <Link key={f.key} href={`/student/complaints?status=${f.key}`} className={"shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition " + (status === f.key ? "border-brand/50 bg-brand/15 text-accent-300" : "border-line text-fg-muted")}>
              {l(f.ar, f.en)}
            </Link>
          ))}
        </div>

        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface/50 px-4 py-10 text-center">
            <span className="mx-auto mb-2 grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted"><Icon name="message" size={18} /></span>
            <p className="text-[12px] font-medium text-fg-soft">{l("لا توجد طلبات", "No requests")}</p>
            <p className="mt-1 text-[10.5px] text-fg-muted">{l("يمكنك تقديم طلب تصحيح حضور أو التماس درجة أو الإبلاغ عن حادثة.", "You can request an attendance correction, appeal a grade or report an incident.")}</p>
            <Link href="/student/complaints/new" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-medium text-white">
              <Icon name="plus" size={12} /> {l("تقديم طلب", "New request")}
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {list.map((c) => {
            const meta = CATEGORY_LABEL[c.category];
            const waiting = c.status === "WAITING_FOR_STUDENT";
            return (
              <Link key={c.id} href={`/student/complaints/${c.id}`} className="block rounded-xl border border-line bg-surface p-3.5 transition hover:border-line-strong">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-muted"><Icon name={meta.icon} size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11.5px] font-medium leading-snug text-fg">{c.subject}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-fg-muted">{c.ticket}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-fg-muted">
                      <span>{l(meta.ar, meta.en)}</span>
                      <span>·</span>
                      <span>{relTime(c.updatedAt, locale)}</span>
                      {c.messages.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><Icon name="message" size={9} /> {c.messages.length}</span>
                        </>
                      )}
                      {waiting && <Badge tone="purple">{l("بانتظار ردك", "Waiting on you")}</Badge>}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-xl border border-line bg-surface-2/50 p-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-fg-soft">
            <Icon name="clock" size={12} className="text-accent-400" /> {l("أوقات الاستجابة المستهدفة", "Target response times")}
          </p>
          <ul className="mt-1.5 space-y-1 text-[9.5px] text-fg-muted">
            <li>• {l("الدعم الفني: خلال يوم عمل واحد", "Technical support: within 1 business day")}</li>
            <li>• {l("تصحيح الحضور: خلال 3 أيام عمل", "Attendance correction: within 3 business days")}</li>
            <li>• {l("التماس الدرجات: خلال 5 أيام عمل", "Grade appeals: within 5 business days")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
