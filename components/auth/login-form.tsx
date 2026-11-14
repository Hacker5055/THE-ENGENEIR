"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { requestResetAction, type ResetRequestState } from "@/app/actions/account";
import { Button, Field, Input, Modal, Alert, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { usePrefs } from "@/components/providers";
import { DEMO_CREDENTIALS } from "@/lib/demo-accounts";
import { cx } from "@/lib/utils";

const ROLE_ORDER = ["STUDENT", "TEACHER", "INSTITUTION_ADMIN", "EXAM_SUPERVISOR", "SUPER_ADMIN"] as const;

export function LoginForm({
  initialEmail,
  next,
  demo = false,
}: {
  initialEmail?: string;
  next?: string;
  /** Demo accounts are a development/training aid, never shown in production. */
  demo?: boolean;
}) {
  const { l } = usePrefs();
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetState, resetAction] = useActionState<ResetRequestState, FormData>(requestResetAction, {});

  const useDemo = (cred: (typeof DEMO_CREDENTIALS)[number]) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <>
      <div className="w-full max-w-[400px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">{l("تسجيل الدخول", "Sign in")}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
            {l("استخدم بريدك المؤسسي. سيُطلب رمز تحقق ثانٍ لحماية حسابك.", "Use your institutional email. A second verification code will be requested.")}
          </p>
        </div>

        {state.error && (
          <Alert tone="danger" title={state.error} icon="alert-circle" className="mb-4">
            {l("لم يتم تسجيل الدخول. لا تُشارك بياناتك مع أي شخص.", "Sign-in failed. Never share your credentials.")}
          </Alert>
        )}

        <form action={action} className="space-y-4" noValidate>
          {next && <input type="hidden" name="next" value={next} />}
          <Field label={l("البريد المؤسسي", "Institutional email")} htmlFor="email" required>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              dir="ltr"
              placeholder="name@almohandes.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label={l("كلمة المرور", "Password")} htmlFor="password" required>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                dir="ltr"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pe-10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-fg-muted transition hover:bg-surface-2 hover:text-fg"
                aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                <Icon name={show ? "eye-off" : "eye"} size={15} />
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fg-muted">
              <input type="checkbox" name="remember" className="size-3.5 accent-[#2864D9]" defaultChecked />
              {l("إبقاء الجلسة", "Keep me signed in")}
            </label>
            <button type="button" onClick={() => setForgot(true)} className="text-[12px] font-medium text-accent-400 hover:underline">
              {l("نسيت كلمة المرور؟", "Forgot password?")}
            </button>
          </div>

          <SubmitButton label={l("متابعة إلى التحقق", "Continue to verification")} />

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-fg-muted">
            <Icon name="lock" size={11} />
            {l("اتصال مشفّر · جلسة HttpOnly · تحقق ثنائي", "Encrypted transport · HttpOnly session · 2FA")}
          </p>
        </form>

        {demo && (
          <>
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-fg-muted">{l("حسابات تجريبية", "Demo accounts")}</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-1.5">
          {ROLE_ORDER.map((role) => {
            const cred = DEMO_CREDENTIALS.find((c) => c.role === role)!;
            const active = email === cred.email;
            return (
              <button
                key={role}
                type="button"
                onClick={() => useDemo(cred)}
                className={cx(
                  "group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-start transition",
                  active ? "border-brand/50 bg-brand/10" : "border-line bg-surface/60 hover:border-line-strong hover:bg-surface-2",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-soft text-accent-400">
                  <Icon name={role === "STUDENT" ? "user" : role === "TEACHER" ? "id-card" : role === "EXAM_SUPERVISOR" ? "shield-alert" : "grid"} size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-fg">{cred.nameAr}</span>
                  <span className="block truncate text-[10.5px] text-fg-muted" dir="ltr">{cred.email}</span>
                </span>
                <span className="shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-muted" dir="ltr">{cred.password}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[10.5px] leading-relaxed text-fg-muted">
          {l(
            "بيانات تجريبية فقط. اضغط على الحساب لتعبئة الحقول، ثم تابع للتحقق.",
            "Demo data only. Tap an account to fill the fields, then continue to verification.",
          )}
        </p>

          </>
        )}

        <div className="mt-5 flex items-center justify-center gap-3 text-[11px]">
          <Link href="/" className="text-fg-muted transition hover:text-fg">{l("العودة للرئيسية", "Back to home")}</Link>
          <span className="text-line-strong">·</span>
          <Link href="/docs/security-architecture" className="text-fg-muted transition hover:text-fg">{l("سياسة الأمان", "Security policy")}</Link>
        </div>
      </div>

      <Modal
        open={forgot}
        onClose={() => setForgot(false)}
        title={l("استعادة كلمة المرور", "Reset your password")}
        description={l(
          "سنرسل رابطاً صالحاً لمدة ساعة إلى بريدك المؤسسي.",
          "We will email a reset link valid for one hour to your institutional address.",
        )}
      >
        {resetState.sent ? (
          <Alert tone="success" title={l("تحقق من بريدك", "Check your inbox")}>
            {l(
              "لو كان البريد مسجّلاً لدينا فسيصلك رابط إعادة التعيين خلال دقائق. الرابط صالح لساعة ولمرة واحدة.",
              "If the address exists, a reset link arrives within minutes. It is valid for one hour and single-use.",
            )}
          </Alert>
        ) : (
          <form action={resetAction} className="space-y-3">
            <Field label={l("البريد المؤسسي", "Institutional email")}>
              <Input name="email" type="email" dir="ltr" defaultValue={email} required autoComplete="email" />
            </Field>
            {resetState.error && <Alert tone="danger" title={resetState.error} icon="alert-circle" />}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setForgot(false)}>
                {l("إلغاء", "Cancel")}
              </Button>
              <Button type="submit" size="sm" icon="send">
                {l("إرسال الرابط", "Send link")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { l } = usePrefs();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {pending ? l("جارٍ التحقق…", "Verifying…") : label}
    </Button>
  );
}
