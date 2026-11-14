import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, Field, Icon, KeyValue, Select, Textarea } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { db, findCourse } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { staffReplyComplaint, resolveComplaint } from "@/app/actions/admin";
import { CATEGORY_LABEL } from "@/lib/complaints";
import { fmtDateTime, makeL, relTime } from "@/lib/utils";

const STATUS_LABEL: Record<string, { ar: string; en: string; tone: "warning" | "brand" | "accent" | "success" | "danger" }> = {
  OPEN: { ar: "جديد", en: "Open", tone: "warning" },
  UNDER_REVIEW: { ar: "قيد المراجعة", en: "Under review", tone: "brand" },
  WAITING_FOR_STUDENT: { ar: "بانتظار الطالب", en: "Awaiting student", tone: "accent" },
  RESOLVED: { ar: "محلول", en: "Resolved", tone: "success" },
  REJECTED: { ar: "مرفوض", en: "Rejected", tone: "danger" },
};

export default async function AdminComplaintDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { locale } = await adminContext();
  const l = makeL(locale);
  const complaint = db().complaints.find((c) => c.id === id);
  if (!complaint) notFound();

  const student = db().students.find((s) => s.id === complaint.studentId);
  const course = complaint.relatedCourseId ? findCourse(complaint.relatedCourseId) : null;
  const cat = CATEGORY_LABEL[complaint.category];
  const status = STATUS_LABEL[complaint.status];
  const messages = [...complaint.messages].sort((a, b) => a.createdAt - b.createdAt);
  const relatedExam = db().attempts.find((a) => a.studentId === complaint.studentId && a.status !== "IN_PROGRESS");

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={complaint.subject}
        subtitle={`${complaint.ticket} · ${l(cat.ar, cat.en)} · ${l("قُدّم", "filed")} ${fmtDateTime(complaint.createdAt, locale)}`}
        breadcrumb={[{ label: l("الطلبات", "Requests"), href: "/admin/complaints" }, { label: complaint.ticket }]}
        badge={<Badge tone={status.tone} dot>{l(status.ar, status.en)}</Badge>}
        actions={
          <Link href="/admin/complaints" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
            <Icon name="arrow-right" size={14} className="rtl:rotate-180" /> {l("كل الطلبات", "All requests")}
          </Link>
        }
      />

      {sp.error && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" />
          {sp.error === "resolution" ? l("نص القرار إلزامي (5 أحرف على الأقل).", "A decision note is required (5+ characters).") : l("تعذّر تنفيذ العملية — تحقق من الحقول.", "Action failed — check the fields.")}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={l("المحادثة", "Conversation")} subtitle={`${messages.filter((m) => !m.internal).length} ${l("رسالة ظاهرة للطالب", "student-visible messages")}`} icon="message" />
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={m.internal ? "rounded-xl border border-dashed border-warn-500/40 bg-warn-500/[0.05] p-3" : "rounded-xl border border-line bg-surface-2/50 p-3"}>
                  <div className="flex items-center gap-2">
                    <Avatar name={m.authorName} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-medium text-fg">
                        {m.authorName}
                        <span className="ms-1.5 font-mono text-[8.5px] text-fg-muted">{m.authorRole}</span>
                      </p>
                      <p className="text-[8.5px] text-fg-muted">{relTime(m.createdAt, locale)}</p>
                    </div>
                    {m.internal ? <Badge tone="warning">{l("داخلي", "Internal")}</Badge> : <Badge tone="neutral">{l("ظاهر", "Visible")}</Badge>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-fg-soft">{m.body}</p>
                </div>
              ))}
            </div>

            <form action={staffReplyComplaint} className="mt-3 space-y-2 border-t border-line pt-3">
              <input type="hidden" name="id" value={complaint.id} />
              <Field label={l("رد جديد", "New reply")}>
                <Textarea name="body" rows={3} required placeholder={l("اكتب الرد أو الملاحظة…", "Write the reply or note…")} />
              </Field>
              <div className="flex flex-wrap items-end gap-2">
                <Field label={l("تحديث الحالة", "Update status")} className="w-44">
                  <Select name="status" defaultValue={complaint.status}>
                    <option value="OPEN">{l("جديد", "Open")}</option>
                    <option value="UNDER_REVIEW">{l("قيد المراجعة", "Under review")}</option>
                    <option value="WAITING_FOR_STUDENT">{l("بانتظار الطالب", "Awaiting student")}</option>
                  </Select>
                </Field>
                <label className="mb-1 flex items-center gap-1.5 text-[10.5px] text-fg-muted">
                  <input type="checkbox" name="internal" className="h-3.5 w-3.5 accent-[#2864D9]" />
                  {l("ملاحظة داخلية (لا يراها الطالب)", "Internal note (hidden from student)")}
                </label>
                <button type="submit" className="mb-0.5 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-[11.5px] font-semibold text-white hover:bg-brand-600">
                  <Icon name="send" size={13} /> {l("إرسال الرد", "Send reply")}
                </button>
              </div>
              <p className="text-[9px] text-fg-muted">
                {l("الرد الظاهر يرسل إشعاراً فورياً للطالب. الملاحظات الداخلية تبقى في سجل التذكرة فقط.", "A visible reply sends an instant notification. Internal notes stay in the ticket log only.")}
              </p>
            </form>
          </Card>

          <Card>
            <CardHeader title={l("القرار النهائي", "Final decision")} subtitle={l("مطلوب لإغلاق التذكرة", "Required to close the ticket")} icon="file-check" />
            <form action={resolveComplaint} className="space-y-2.5">
              <input type="hidden" name="id" value={complaint.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label={l("القرار", "Decision")}>
                  <Select name="decision" defaultValue="RESOLVED">
                    <option value="RESOLVED">{l("قبول وحل", "Accept & resolve")}</option>
                    <option value="REJECTED">{l("رفض", "Reject")}</option>
                    <option value="WAITING_FOR_STUDENT">{l("طلب معلومات إضافية", "Request more info")}</option>
                  </Select>
                </Field>
                <Field label={l("مرجع القرار", "Decision reference")} hint={l("مثال: لائحة الحضور 4/2", "e.g. Attendance bylaw 4/2")}>
                  <input name="reference" placeholder="REG-2026-014" dir="ltr" className="h-9 w-full rounded-lg border border-line-strong bg-surface px-2.5 text-[12px] text-fg" />
                </Field>
              </div>
              <Field label={l("التبرير المكتوب", "Written rationale")} hint={l("يُرسل للطالب ويُحفظ في التدقيق", "Sent to the student and stored in the audit log")}>
                <Textarea name="resolution" rows={3} required placeholder={l("اشرح الأساس والنتيجة والإجراء التالي…", "Explain the basis, outcome and next step…")} />
              </Field>
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success-500 px-3.5 text-[12px] font-semibold text-white hover:bg-success-500/90">
                <Icon name="check-circle" size={14} /> {l("إصدار القرار وإشعار الطالب", "Issue decision & notify student")}
              </button>
              {complaint.resolution && (
                <div className="rounded-lg border border-success-500/25 bg-success-500/[0.06] p-2.5">
                  <p className="text-[9.5px] font-semibold text-success-500">{l("القرار الحالي", "Current decision")}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-soft">{complaint.resolution}</p>
                </div>
              )}
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("بيانات الطالب", "Student")} icon="user" />
            <div className="flex items-center gap-2.5">
              <Avatar name={student?.nameAr ?? "?"} size={40} />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-fg">{student ? l(student.nameAr, student.nameEn) : complaint.studentId}</p>
                <p className="font-mono text-[9.5px] text-fg-muted">{student?.studentNumber}</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <KeyValue label={l("المعدل", "GPA")} value={student?.gpa.toFixed(2) ?? "—"} />
              <KeyValue label={l("الحالة", "Standing")} value={student?.academicStatus ?? "—"} />
              <KeyValue label={l("المقرر", "Course")} value={course ? `${course.code} · ${l(course.nameAr, course.nameEn)}` : "—"} />
              <KeyValue label={l("المكلّف", "Assignee")} value={complaint.assignedToName ?? l("غير مسند", "Unassigned")} />
              <KeyValue label={l("آخر تحديث", "Updated")} value={relTime(complaint.updatedAt, locale)} />
            </div>
            {student && (
              <Link href={`/admin/students/${student.id}`} className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-[10.5px] font-semibold text-fg-soft hover:text-fg">
                <Icon name="external-link" size={12} /> {l("ملف الطالب", "Student profile")}
              </Link>
            )}
          </Card>

          <Card>
            <CardHeader title={l("سياق ذو صلة", "Related context")} icon="link" />
            <div className="space-y-1.5">
              {complaint.category === "EXAM_INCIDENT" && relatedExam && (
                <Link href={`/admin/exam-control/${relatedExam.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-[10.5px] text-fg-soft hover:border-brand-500/40">
                  <Icon name="shield-alert" size={13} className="text-danger-500" />
                  <span className="min-w-0 flex-1 truncate">{l("مراجعة محاولة الاختبار", "Review exam attempt")}</span>
                  <Icon name="chevron-right" size={11} className="rtl:rotate-180" />
                </Link>
              )}
              {student && (
                <Link href={`/admin/students/${student.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-[10.5px] text-fg-soft hover:border-brand-500/40">
                  <Icon name="qr" size={13} className="text-brand-400" />
                  <span className="min-w-0 flex-1 truncate">{l("سجل الحضور", "Attendance ledger")}</span>
                  <Icon name="chevron-right" size={11} className="rtl:rotate-180" />
                </Link>
              )}
              {complaint.attachments.length > 0 && (
                <div className="rounded-lg bg-surface-2 px-2.5 py-2">
                  <p className="text-[9.5px] text-fg-muted">{l("المرفقات", "Attachments")}</p>
                  {complaint.attachments.map((a) => (
                    <p key={a.name} className="mt-0.5 flex items-center gap-1 text-[10px] text-fg-soft">
                      <Icon name="file-text" size={11} /> {a.name} · {a.size}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-fg-soft">
              <Icon name="shield-check" size={12} className="text-success-500" /> {l("ضمانات الطالب", "Student safeguards")}
            </p>
            <ul className="mt-1.5 space-y-1 text-[9.5px] leading-relaxed text-fg-muted">
              <li>· {l("الاستئناف متاح مرة ثانية أمام مسؤول أعلى.", "A second-level appeal is available to a senior officer.")}</li>
              <li>· {l("لا تُحذف التذاكر أو الرسائل — تُغلق فقط.", "Tickets and messages are never deleted — only closed.")}</li>
              <li>· {l("كل قرار يذكر المرجع التنظيمي والسبب.", "Every decision cites its regulatory reference and reason.")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
