import Link from "next/link";
import { headers } from "next/headers";
import { Badge, CopyButton, Icon } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { LogoGlyph } from "@/components/brand/logo";
import { qrSvg } from "@/lib/qr";
import { studentContext } from "@/lib/server/context";
import { fmtDate, makeL } from "@/lib/utils";

export const metadata = { title: "الهوية الرقمية" };

export default async function DigitalIdPage() {
  const { student, department, locale, unread } = await studentContext();
  const l = makeL(locale);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const verifyUrl = `${proto}://${host}/verify/${student.studentNumber}`;
  const qr = await qrSvg(verifyUrl, { scale: 4 });

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("الهوية الرقمية", "Digital student ID")} subtitle={l("قابلة للتحقق · صادرة من المؤسسة", "Verifiable · institution-issued")} unread={unread} />

      <div className="space-y-4 px-4 pt-4">
        {/* card */}
        <section className="relative overflow-hidden rounded-[22px] border border-white/15 bg-[linear-gradient(135deg,#1B3A6B_0%,#122344_45%,#0B1424_100%)] p-4 text-white shadow-lg">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] app-grid-bg" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -end-12 -top-12 size-44 rounded-full blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(56,165,255,.4), transparent 65%)" }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <LogoGlyph className="size-7" />
                <div>
                  <p className="text-[11px] font-semibold leading-none">المهندس</p>
                  <p className="mt-0.5 text-[6.5px] tracking-[0.22em] text-accent-400">AL MOHANDES</p>
                </div>
              </div>
              <div className="text-end">
                <p className="text-[7.5px] uppercase tracking-widest text-white/45">{l("بطاقة طالب", "Student card")}</p>
                <p className="mt-0.5 text-[8px] text-white/70">{l("2026 / 2027", "2026 / 2027")}</p>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/25 bg-white/10 text-[22px] font-semibold backdrop-blur">
                {student.nameAr.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{student.nameAr}</p>
                <p className="mt-0.5 truncate text-[9px] text-white/55" dir="ltr">{student.nameEn}</p>
                <p className="tnum mt-1 font-mono text-[10px] tracking-wider text-accent-300" dir="ltr">{student.studentNumber}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <span className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8px]">{l(department.nameAr, department.nameEn)}</span>
                  <span className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8px]">{l("المستوى", "Level")} {student.level}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-3">
              <div className="space-y-1 text-[8px] text-white/55">
                <p>{l("الحالة", "Status")}: <span className="inline-flex items-center gap-1 text-success-500"><span className="size-1 rounded-full bg-success-500" />{l("نشط", "Active")}</span></p>
                <p>{l("صادرة", "Issued")}: {fmtDate(new Date(2026, 8, 15), locale, { year: true })}</p>
                <p>{l("صالحة حتى", "Valid until")}: {fmtDate(new Date(2027, 8, 30), locale, { year: true })}</p>
              </div>
              <div className="rounded-lg bg-white p-1.5">
                <div className="size-[62px] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="flex items-center gap-1.5 text-[10px] text-fg-muted"><Icon name="shield-check" size={11} /> {l("التحقق", "Verification")}</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-fg-soft">
              {l("يمسح QR صفحة تحقق عامة تُظهر الحالة فقط دون بيانات شخصية.", "The QR opens a public status check with no personal data.")}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="flex items-center gap-1.5 text-[10px] text-fg-muted"><Icon name="refresh" size={11} /> {l("التحديث", "Refresh")}</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-fg-soft">
              {l("الرمز مرتبط برقم الطالب ويُعاد إصداره عند تغيّر الحالة.", "The token is bound to the student number and re-issued on status change.")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("رابط التحقق", "Verification link")}</p>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg-soft" dir="ltr">{verifyUrl}</span>
            <CopyButton value={verifyUrl} />
          </div>
          <Link href={verifyUrl.replace(/^https?:\/\/[^/]+/, "")} className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-[10.5px] font-medium text-fg-soft transition hover:bg-surface-2">
            <Icon name="external-link" size={11} /> {l("فتح صفحة التحقق", "Open verification page")}
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-surface-2/50 p-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-fg-soft">
            <Icon name="info" size={12} className="text-accent-400" /> {l("ما لا تحتويه البطاقة", "What the card never contains")}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-fg-muted">
            {l(
              "لا يُضمّن الرقم القومي الكامل أو العنوان أو السجل الطبي في رمز QR. رقم الهوية الوطنية مُقنّع في النظام ويُعرض للحالات المخوّلة فقط.",
              "The QR never carries the full national ID, address or medical record. The national ID is masked in the system and shown only to authorised roles.",
            )}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="neutral">{l("الرقم القومي", "National ID")}: {student.nationalIdMasked}</Badge>
            <Badge tone="success" icon="lock">{l("مقنّع", "Masked")}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
