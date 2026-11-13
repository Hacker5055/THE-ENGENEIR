import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import { db, findDepartment } from "@/lib/server/store";
import { getPrefs } from "@/lib/prefs";
import { fmtDate, tx } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "التحقق من الهوية" };

const STANDING = {
  ACTIVE: { ar: "منتظم", en: "Active", tone: "success" },
  PROBATION: { ar: "إنذار أكاديمي", en: "Academic probation", tone: "warning" },
  SUSPENDED: { ar: "موقوف", en: "Suspended", tone: "danger" },
  GRADUATED: { ar: "متخرج", en: "Graduated", tone: "neutral" },
} as const;

const TONE: Record<string, string> = {
  success: "border-success-500/30 bg-success-500/10 text-success-500",
  warning: "border-warn-500/30 bg-warn-500/10 text-warn-500",
  danger: "border-danger-500/30 bg-danger-500/10 text-danger-500",
  neutral: "border-line-strong bg-surface-2 text-fg-soft",
};

/**
 * Public card verification — what the QR on the digital student ID opens.
 *
 * Deliberately minimal: name, number, department, level and standing. No GPA,
 * no contact details, no national ID. Anyone holding the card can confirm it is
 * genuine without the page becoming an information leak.
 */
export default async function VerifyCardPage({
  params,
}: {
  params: Promise<{ studentNumber: string }>;
}) {
  const { locale } = await getPrefs();
  const l = (ar: string, en: string) => tx(locale, ar, en);
  const { studentNumber } = await params;
  const number = decodeURIComponent(studentNumber).trim();

  const student = db().students.find((s) => s.studentNumber.toLowerCase() === number.toLowerCase());
  const institution = db().institutions.find((i) => i.id === (student?.institutionId ?? "inst_main")) ?? db().institutions[0];
  const department = student ? findDepartment(student.departmentId) : undefined;
  const standing = student ? STANDING[student.academicStatus] : null;

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5 py-10 text-fg">
      <div className="pointer-events-none fixed inset-0 app-grid-bg opacity-[0.18]" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark size={34} />
          <div>
            <p className="text-[13px] font-semibold leading-tight">المهندس · AL MOHANDES</p>
            <p className="text-[10px] text-fg-muted">{l("خدمة التحقق من الهوية الجامعية", "University card verification")}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          {!student && (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2.5 text-danger-500">
                <Icon name="alert-circle" size={16} />
                <p className="text-[12px] font-semibold">{l("لم يتم العثور على هذه البطاقة", "This card could not be found")}</p>
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-fg-muted">
                {l(
                  "تأكد من مسح رمز QR كاملاً، أو اطلب من الطالب إعادة فتح صفحة الهوية الرقمية وتحديث الصفحة. البطاقات الموقوفة أو الملغاة لا تُعرض بياناتها.",
                  "Make sure the whole QR code was scanned, or ask the student to reopen the digital ID and refresh. Suspended or revoked cards are not disclosed.",
                )}
              </p>
              <p className="mt-2 font-mono text-[10px] text-fg-muted" dir="ltr">
                {number}
              </p>
            </>
          )}

          {student && standing && (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-success-500/30 bg-success-500/10 px-3 py-2.5 text-success-500">
                <Icon name="shield-check" size={16} />
                <p className="text-[12px] font-semibold">{l("بطاقة صحيحة صادرة عن المؤسسة", "Authentic card issued by the institution")}</p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-[20px] font-semibold text-fg">
                  {student.nameAr.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold text-fg">{student.nameAr}</p>
                  <p className="truncate text-[11px] text-fg-muted" dir="ltr">
                    {student.nameEn}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-[11.5px]">
                {[
                  { k: l("الرقم الأكاديمي", "Student number"), v: student.studentNumber, mono: true },
                  { k: l("الكلية / القسم", "Department"), v: department ? l(department.nameAr, department.nameEn) : "—" },
                  { k: l("المستوى", "Level"), v: String(student.level) },
                  { k: l("تاريخ الالتحاق", "Enrolled"), v: fmtDate(new Date(student.joinedAt), locale, { year: true }) },
                ].map((row) => (
                  <div key={row.k} className="rounded-lg border border-line bg-surface-2/40 px-2.5 py-2">
                    <dt className="text-[9.5px] text-fg-muted">{row.k}</dt>
                    <dd className={`mt-0.5 truncate text-fg-soft ${row.mono ? "tnum font-mono" : ""}`} dir={row.mono ? "ltr" : undefined}>
                      {row.v}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-1 flex items-center justify-between rounded-lg border border-line bg-surface-2/40 px-2.5 py-2">
                <span className="text-[9.5px] text-fg-muted">{l("الحالة الأكاديمية", "Academic standing")}</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TONE[standing.tone]}`}>
                  <span className="size-1 rounded-full bg-current" />
                  {l(standing.ar, standing.en)}
                </span>
              </div>

              <p className="mt-4 flex items-start gap-1.5 border-t border-line pt-3 text-[10px] leading-relaxed text-fg-muted">
                <Icon name="info" size={12} className="mt-0.5 shrink-0" />
                {l(
                  "تعرض هذه الصفحة الحالة الأساسية فقط. لا تُظهر الدرجات أو بيانات التواصل أو رقم الهوية — لأي استفسار رسمي تواصل مع شؤون الطلاب.",
                  "This page shows basic standing only. Grades, contact details and national ID are never disclosed — contact student affairs for anything official.",
                )}
              </p>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-fg-muted">
          {institution ? `${l(institution.nameAr, institution.nameEn)} · ${institution.city}` : "AL MOHANDES"}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 text-[10.5px] text-fg-muted">
          <Link href="/" className="transition hover:text-fg">
            {l("الموقع الرئيسي", "Main site")}
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/login" className="transition hover:text-fg">
            {l("دخول المنصة", "Platform sign-in")}
          </Link>
        </div>
      </div>
    </div>
  );
}
