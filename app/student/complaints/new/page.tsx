import Link from "next/link";
import { Alert, Button, Field, Icon, Input, Select, Textarea } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { createComplaint } from "@/app/actions/student";
import { studentContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "طلب جديد" };

const CATEGORIES = [
  { value: "ATTENDANCE_CORRECTION", ar: "تصحيح حضور", en: "Attendance correction" },
  { value: "GRADE_APPEAL", ar: "التماس على درجة", en: "Grade appeal" },
  { value: "EXAM_INCIDENT", ar: "حادثة أثناء الاختبار", en: "Exam incident" },
  { value: "TECHNICAL", ar: "دعم فني", en: "Technical support" },
  { value: "GENERAL", ar: "شكوى عامة", en: "General complaint" },
];

export default async function NewComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string }>;
}) {
  const { student, courses, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { category = "ATTENDANCE_CORRECTION", error } = await searchParams;

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student/complaints" }} title={l("طلب جديد", "New request")} subtitle={l("سيتم إصدار رقم تذكرة فوراً", "A ticket number is issued immediately")} unread={unread} />
      <div className="space-y-4 px-4 pt-4">
        {error === "invalid" && (
          <Alert tone="danger" title={l("لم يتم إرسال الطلب", "Request not sent")} icon="alert-circle">
            {l("العنوان 5 أحرف على الأقل، والوصف 10 أحرف على الأقل.", "The subject needs 5+ characters and the description 10+.")}
          </Alert>
        )}

        <form action={createComplaint} className="space-y-3.5 rounded-xl border border-line bg-surface p-4">
          <Field label={l("نوع الطلب", "Request type")} required>
            <Select name="category" defaultValue={category}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{l(c.ar, c.en)}</option>
              ))}
            </Select>
          </Field>

          <Field label={l("المقرر المرتبط (اختياري)", "Related course (optional)")}>
            <Select name="courseId" defaultValue="">
              <option value="">{l("— بدون —", "— none —")}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {l(c.nameAr, c.nameEn)}</option>
              ))}
            </Select>
          </Field>

          <Field label={l("عنوان الطلب", "Subject")} required hint={l("5 أحرف على الأقل", "At least 5 characters")}>
            <Input name="subject" required minLength={5} maxLength={140} placeholder={l("مثال: تصحيح حضور محاضرة الشبكات", "e.g. Attendance correction for Networks")} />
          </Field>

          <Field label={l("تفاصيل الطلب", "Description")} required hint={l("اذكر التاريخ والوقت وأي أرقام مرجعية.", "Include dates, times and any reference numbers.")}>
            <Textarea name="body" required minLength={10} maxLength={4000} rows={6} placeholder={l("اشرح المشكلة بالتفصيل…", "Describe the issue in detail…")} />
          </Field>

          <div className="rounded-lg border border-dashed border-line-strong bg-surface-2/50 p-3 text-center">
            <Icon name="upload" size={16} className="mx-auto text-fg-muted" />
            <p className="mt-1 text-[10.5px] font-medium text-fg-soft">{l("إرفاق مستند (اختياري)", "Attach a document (optional)")}</p>
            <p className="mt-0.5 text-[9px] text-fg-muted">{l("PDF أو صورة · حتى 10 ميجابايت — الرفع محاكاة في هذا النموذج", "PDF or image · up to 10 MB — upload is simulated here")}</p>
            <input type="file" disabled className="mt-2 w-full text-[9.5px] text-fg-muted opacity-60" aria-label={l("إرفاق ملف", "Attach file")} />
          </div>

          <label className="flex items-start gap-2 rounded-lg bg-surface-2/60 p-2.5 text-[10px] leading-relaxed text-fg-muted">
            <input type="checkbox" required className="mt-0.5 size-3.5 accent-[#2864D9]" />
            <span>
              {l(
                "أقر بأن المعلومات صحيحة، وأوافق على معالجتها لغرض دراسة الطلب فقط، مع حفظها وفق سياسة الاحتفاظ بالبيانات.",
                "I confirm the information is accurate and consent to processing it solely to review this request, retained under the data-retention policy.",
              )}
            </span>
          </label>

          <Button type="submit" size="lg" className="w-full" icon="send">{l("إرسال الطلب", "Submit request")}</Button>
        </form>

        <div className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/50 p-3">
          <Icon name="info" size={13} className="mt-0.5 shrink-0 text-accent-400" />
          <p className="text-[9.5px] leading-relaxed text-fg-muted">
            {l(
              `سيُسند الطلب إلى مسؤول ويظهر في قائمة طلباتك برقم تذكرة. التذاكر النشطة لحساب ${student.nameAr}: ${student.studentNumber}.`,
              `The request is assigned to an administrator and appears with a ticket number. Active tickets for ${student.studentNumber}.`,
            )}
          </p>
        </div>

        <Link href="/student/complaints" className="block text-center text-[10.5px] text-fg-muted">
          {l("العودة إلى قائمة الطلبات", "Back to requests")}
        </Link>
      </div>
    </div>
  );
}
