import Link from "next/link";
import { Alert, Badge, Button, Field, Icon, Input, StatusBadge } from "@/components/ui";
import { MobileAppBar } from "@/components/shells/mobile-shell";
import { changePassword, revokeDevice } from "@/app/actions/student";
import { db } from "@/lib/server/store";
import { studentContext } from "@/lib/server/context";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "الأمان والأجهزة" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; password?: string }> }) {
  const { user, student, locale, unread } = await studentContext();
  const l = makeL(locale);
  const { error, password } = await searchParams;
  const devices = db().devices.filter((d) => d.studentId === student.id);
  const active = devices.filter((d) => d.status === "ACTIVE");

  return (
    <div className="pb-6">
      <MobileAppBar back={{ href: "/student" }} title={l("الأمان والأجهزة", "Security & devices")} subtitle={l("إدارة الوصول وحماية الحساب", "Access control & account protection")} unread={unread} />
      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-xl border border-success-500/25 bg-success-500/[0.06] p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success-500/15 text-success-500"><Icon name="shield-check" size={16} /></span>
            <div>
              <p className="text-[11.5px] font-semibold text-fg">{l("الحساب محمي بتحقق ثنائي", "Account protected with 2FA")}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">
                {l("يُطلب رمز تحقق عند كل دخول من جهاز جديد.", "A verification code is required for every new device sign-in.")}
              </p>
            </div>
          </div>
        </section>

        {error === "password" && <Alert tone="danger" title={l("لم يتم تغيير كلمة المرور", "Password not changed")}>{l("تحقق من كلمة المرور الحالية، وأن الجديدة 10 أحرف على الأقل ومتطابقة.", "Check the current password; the new one needs 10+ characters and must match.")}</Alert>}
        {password === "queued" && <Alert tone="success" title={l("تم تسجيل طلب التغيير", "Change request recorded")}>{l("في النسخة الإنتاجية يُنفَّذ التغيير عبر خدمة الهوية ويُبطِل كل الجلسات الأخرى.", "In production the identity service applies it and revokes all other sessions.")}</Alert>}

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-fg">{l("الأجهزة المسجّلة", "Registered devices")}</p>
            <span className="text-[9.5px] text-fg-muted">{active.length} {l("نشط", "active")}</span>
          </div>
          <div className="space-y-1.5">
            {devices.map((d) => (
              <div key={d.id} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-surface-3 text-fg-soft">
                  <Icon name={d.platform === "WEB" ? "globe" : "smartphone"} size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[11px] font-medium text-fg">{d.label}</p>
                    {d.managed && <Badge tone="accent">{l("مُدار", "Managed")}</Badge>}
                  </div>
                  <p className="mt-0.5 text-[9px] text-fg-muted">
                    {d.model} · {l("آخر ظهور", "last seen")} {relTime(d.lastSeenAt, locale)}
                  </p>
                  <p className="font-mono text-[8.5px] text-fg-muted/80">ID {d.fingerprint}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={d.status} />
                  {d.status === "ACTIVE" && d.id !== "dev_tab_01" && (
                    <form action={revokeDevice}>
                      <input type="hidden" name="deviceId" value={d.id} />
                      <Button type="submit" variant="ghost" size="xs" className="text-danger-500">
                        {l("إلغاء", "Revoke")}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-fg-muted">
            {l(
              "الجهاز المُدار الأساسي لا يمكن إلغاؤه من التطبيق — يتطلب ذلك موافقة إدارة المؤسسة.",
              "The primary managed device cannot be revoked from the app — that requires institution approval.",
            )}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("الجلسة الحالية", "Current session")}</p>
          <div className="space-y-1.5 text-[10px]">
            {[
              [l("الحساب", "Account"), user.email],
              [l("نوع الجهاز", "Device type"), l("متصفح ويب", "Web browser")],
              [l("انتهاء الجلسة", "Session expiry"), l("بعد 8 ساعات من الدخول", "8 hours after sign-in")],
              [l("الكوكيز", "Cookie policy"), "HttpOnly · SameSite=Lax"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-2">
                <span className="text-fg-muted">{k}</span>
                <span className="max-w-[62%] truncate text-end font-medium text-fg" dir="ltr">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-[11px] font-semibold text-fg">{l("تغيير كلمة المرور", "Change password")}</p>
          <form action={changePassword} className="space-y-2.5">
            <Field label={l("كلمة المرور الحالية", "Current password")}>
              <Input name="current" type="password" required autoComplete="current-password" dir="ltr" />
            </Field>
            <Field label={l("كلمة المرور الجديدة", "New password")} hint={l("10 أحرف على الأقل مع أرقام ورموز", "At least 10 characters with digits and symbols")}>
              <Input name="next" type="password" required minLength={10} autoComplete="new-password" dir="ltr" />
            </Field>
            <Field label={l("تأكيد كلمة المرور", "Confirm password")}>
              <Input name="confirm" type="password" required minLength={10} autoComplete="new-password" dir="ltr" />
            </Field>
            <Button type="submit" size="sm" icon="key" className="w-full">{l("تحديث كلمة المرور", "Update password")}</Button>
          </form>
          <p className="mt-2 text-[9px] leading-relaxed text-fg-muted">
            {l(
              "كلمات المرور تُخزَّن كتجزئة scrypt في هذا النموذج (Argon2id في الإنتاج)، ولا تُسجَّل في السجلات أبداً.",
              "Passwords are stored as scrypt hashes in this prototype (Argon2id in production) and never logged.",
            )}
          </p>
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-fg"><Icon name="eye-off" size={13} className="text-accent-400" /> {l("ما لا نفعله", "What we never do")}</p>
          <ul className="space-y-1.5">
            {[
              l("لا وصول إلى الكاميرا أو الميكروفون أو الرسائل.", "No access to camera, microphone or messages."),
              l("لا تسجيل للشاشة أو تصوير المستخدم.", "No screen recording or user photography."),
              l("لا جمع لبيانات غير ضرورية للخدمة.", "No collection of data beyond what the service needs."),
            ].map((t) => (
              <li key={t} className="flex gap-1.5 text-[9.5px] leading-relaxed text-fg-muted">
                <Icon name="check" size={10} className="mt-0.5 shrink-0 text-success-500" /> {t}
              </li>
            ))}
          </ul>
          <Link href="/docs/security-architecture" className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-accent-400">
            {l("اقرأ معمارية الأمان", "Read the security architecture")} <Icon name="arrow-left" size={10} className="ltr:rotate-180" />
          </Link>
        </section>
      </div>
    </div>
  );
}
