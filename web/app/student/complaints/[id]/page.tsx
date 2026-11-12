import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Avatar, Badge, Button, Icon, StatusBadge, Textarea } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { replyComplaint } from "@/app/actions/student";
import { db, findCourse } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { fmtDateTime, makeL, relTime } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/lib/complaints";

export const metadata = { title: "تفاصيل الطلب" };

const FLOW = ["OPEN", "UNDER_REVIEW", "WAITING_FOR_STUDENT", "RESOLVED"] as const;

export default async function ComplaintDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { student, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { id } = await params;
  const { created } = await searchParams;
  const complaint = db().complaints.find((c) => c.id === id && c.studentId === student.id);
  if (!complaint) notFound();
  const meta = CATEGORY_LABEL[complaint.category];
  const course = complaint.relatedCourseId ? findCourse(complaint.relatedCourseId) : undefined;
  const stageIndex = complaint.status === "REJECTED" ? 1 : Math.max(0, FLOW.indexOf(complaint.status as (typeof FLOW)[number]));

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student/complaints" }} title={complaint.ticket} subtitle={l(meta.ar, meta.en)} unread={unread} />
      <div className="space-y-4 px-4 pt-4">
        {created && (
          <Alert tone="success" title={l("تم إرسال طلبك بنجاح", "Request submitted")} icon="check-circle">
            {l(`رقم التذكرة ${complaint.ticket}. يمكنك متابعة الردود من هذه الصفحة.`, `Ticket ${complaint.ticket}. You can follow replies on this page.`)}
          </Alert>
        )}

        <section className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-[13px] font-semibold leading-snug text-fg">{complaint.subject}</h1>
            <StatusBadge status={complaint.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9.5px] text-fg-muted">
            <span className="font-mono">{complaint.ticket}</span>
            <span>·</span>
            <span>{fmtDateTime(complaint.createdAt, locale)}</span>
            {course && (
              <>
                <span>·</span>
                <span className="font-mono">{course.code}</span>
              </>
            )}
            {complaint.assignedToName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1"><Icon name="user-check" size={10} /> {complaint.assignedToName}</span>
              </>
            )}
          </div>

          {complaint.status !== "REJECTED" && (
            <div className="mt-3 flex items-center gap-1">
              {FLOW.map((stage, i) => (
                <div key={stage} className="flex flex-1 items-center gap-1">
                  <span className={"h-1 flex-1 rounded-full " + (i <= stageIndex ? "bg-accent-500" : "bg-surface-3")} />
                </div>
              ))}
            </div>
          )}
          {complaint.status !== "REJECTED" && (
            <div className="mt-1.5 flex justify-between text-[8px] text-fg-muted">
              <span>{l("مفتوح", "Open")}</span>
              <span>{l("مراجعة", "Review")}</span>
              <span>{l("بانتظارك", "Waiting")}</span>
              <span>{l("تم الحل", "Resolved")}</span>
            </div>
          )}
        </section>

        {complaint.resolution && (
          <div className="rounded-xl border border-success-500/25 bg-success-500/[0.06] p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-success-500">
              <Icon name="check-circle" size={12} /> {complaint.status === "REJECTED" ? l("قرار الطلب", "Decision") : l("الحل", "Resolution")}
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-fg-soft">{complaint.resolution}</p>
          </div>
        )}

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 flex items-center justify-between text-[11px] font-semibold text-fg">
            {l("المحادثة", "Conversation")}
            <span className="text-[9px] font-normal text-fg-muted">{complaint.messages.length} {l("رسالة", "messages")}</span>
          </p>
          <ol className="space-y-2.5">
            {complaint.messages.map((msg, i) => {
              const mine = msg.authorRole === "STUDENT";
              return (
                <li key={msg.id} className="flex gap-2">
                  <Avatar name={msg.authorName} hue={mine ? student.avatarHue : 210} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10.5px] font-medium text-fg">{msg.authorName}</p>
                      <span className="text-[8.5px] text-fg-muted">{relTime(msg.createdAt, locale)}</span>
                      {msg.authorRole !== "STUDENT" && <Badge tone="brand">{l("الإدارة", "Admin")}</Badge>}
                    </div>
                    <p className={"mt-1 rounded-lg px-2.5 py-2 text-[10.5px] leading-relaxed " + (mine ? "bg-surface-2 text-fg-soft" : "border border-accent-500/20 bg-accent-500/[0.06] text-fg")}>
                      {msg.body}
                    </p>
                    {i === 0 && complaint.attachments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {complaint.attachments.map((a) => (
                          <span key={a.name} className="flex items-center gap-1 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[9px] text-fg-muted">
                            <Icon name="file-text" size={9} /> {a.name} · {a.size}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {["OPEN", "UNDER_REVIEW", "WAITING_FOR_STUDENT"].includes(complaint.status) && (
          <form action={replyComplaint} className="rounded-xl border border-line bg-surface p-3.5">
            <input type="hidden" name="id" value={complaint.id} />
            <p className="mb-1.5 text-[11px] font-semibold text-fg">{l("إضافة رد", "Add a reply")}</p>
            <Textarea name="message" required minLength={2} rows={3} placeholder={l("اكتب ردك هنا…", "Write your reply…")} className="text-[11px]" />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[9px] text-fg-muted">{l("سيُعلم المسؤول بالرد", "The assigned admin is notified")}</span>
              <Button type="submit" size="sm" icon="send">{l("إرسال", "Send")}</Button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 p-3">
          <div>
            <p className="text-[10.5px] font-medium text-fg">{l("طلب غير متعلق بهذه التذكرة؟", "Not about this ticket?")}</p>
            <p className="text-[9px] text-fg-muted">{l("أنشئ طلباً جديداً للحصول على رقم تذكرة مستقل.", "Create a new request for its own ticket number.")}</p>
          </div>
          <Link href="/student/complaints/new" className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-medium text-fg-soft">
            {l("طلب جديد", "New request")}
          </Link>
        </div>
      </div>
    </div>
  );
}
