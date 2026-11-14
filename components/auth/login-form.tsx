"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button, Field, Input, Modal, Alert, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { usePrefs } from "@/components/providers";
import { signInWithGooglePopup, syncSignedInUserToFirestore } from "@/lib/firebase";
import { DEMO_CREDENTIALS } from "@/lib/demo-accounts";
import type { Role } from "@/lib/types";
import { cx } from "@/lib/utils";

const ROLE_ORDER = ["STUDENT", "TEACHER", "INSTITUTION_ADMIN", "EXAM_SUPERVISOR", "SUPER_ADMIN"] as const;

export function LoginForm({ initialEmail, next }: { initialEmail?: string; next?: string }) {
  const { l, locale, theme } = usePrefs();
  const [state, action] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState(initialEmail ?? "");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const useDemo = (cred: (typeof DEMO_CREDENTIALS)[number]) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      const { user, idToken } = await signInWithGooglePopup();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken, next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        role?: Role;
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.role) {
        setGoogleError(
          data.error === "UNVERIFIED_EMAIL"
            ? l("يرجى توثيق بريد جوجل قبل المتابعة.", "Please verify your Google email before continuing.")
            : l("تعذّر التحقق من جلسة جوجل على الخادم.", "Could not verify your Google session on the server."),
        );
        setGoogleLoading(false);
        return;
      }

      await syncSignedInUserToFirestore(user, data.role, locale, theme);
      window.location.assign(data.redirectTo || "/welcome");
    } catch (err) {
      const code = typeof err === "object" && err && "code" in err ? String((err as { code?: string }).code) : "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setGoogleError(l("تم إلغاء نافذة تسجيل الدخول بجوجل.", "Google sign-in popup was closed."));
      } else if (code === "auth/popup-blocked") {
        setGoogleError(l("المتصفح منع النافذة المنبثقة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.", "Browser blocked the popup. Allow popups and try again."));
      } else {
        setGoogleError(l("تعذّر تسجيل الدخول بحساب جوجل. حاول مرة أخرى.", "Google sign-in failed. Please try again."));
      }
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-[400px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg">{l("تسجيل الدخول", "Sign in")}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
            {l("استخدم بريدك المؤسسي أو سجّل الدخول مباشرة بحساب جوجل.", "Use your institutional email or sign in directly with Google.")}
          </p>
        </div>

        {(state.error || googleError) && (
          <Alert tone="danger" title={googleError ?? state.error!} icon="alert-circle" className="mb-4">
            {l("لم يتم تسجيل الدخول. لا تُشارك بياناتك مع أي شخص.", "Sign-in failed. Never share your credentials.")}
          </Alert>
        )}

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-center gap-2.5 border-line-strong bg-surface hover:bg-surface-2"
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          disabled={googleLoading}
        >
          <span className="grid size-5 place-items-center rounded-full bg-white text-[12px] font-bold text-[#4285F4] shadow-xs" aria-hidden="true">
            G
          </span>
          <span>{googleLoading ? l("جارٍ الربط بحساب جوجل…", "Connecting with Google…") : l("المتابعة بحساب جوجل", "Continue with Google")}</span>
        </Button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-fg-muted">{l("أو بالبريد المؤسسي", "Or with institutional email")}</span>
          <span className="h-px flex-1 bg-line" />
        </div>

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
            {l("اتصال مشفّر · جلسة HttpOnly · Firebase Auth", "Encrypted transport · HttpOnly session · Firebase Auth")}
          </p>
        </form>

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

        <div className="mt-5 flex items-center justify-center gap-3 text-[11px]">
          <Link href="/" className="text-fg-muted transition hover:text-fg">{l("العودة للرئيسية", "Back to home")}</Link>
          <span className="text-line-strong">·</span>
          <Link href="/docs/security-architecture" className="text-fg-muted transition hover:text-fg">{l("سياسة الأمان", "Security policy")}</Link>
        </div>
      </div>

      <Modal
        open={forgot}
        onClose={() => { setForgot(false); setForgotSent(false); }}
        title={l("استعادة كلمة المرور", "Reset your password")}
        description={l("سنرسل رابط استعادة صالحاً لـ15 دقيقة إلى بريدك المؤسسي.", "We will email a reset link valid for 15 minutes to your institutional address.")}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setForgot(false)}>{l("إلغاء", "Cancel")}</Button>
            <Button size="sm" onClick={() => setForgotSent(true)} disabled={forgotSent} icon={forgotSent ? "check" : "send"}>
              {forgotSent ? l("تم الإرسال", "Sent") : l("إرسال الرابط", "Send link")}
            </Button>
          </>
        }
      >
        {forgotSent ? (
          <Alert tone="success" title={l("تم إرسال طلب الاستعادة", "Reset requested")}>
            {l(
              "في هذا النموذج التجريبي لا يوجد بريد فعلي. استخدم قائمة الحسابات التجريبية للدخول.",
              "This prototype does not send real email. Use the demo account list to sign in.",
            )}
          </Alert>
        ) : (
          <Field label={l("البريد المؤسسي", "Institutional email")}>
            <Input dir="ltr" placeholder="name@almohandes.edu" defaultValue={email} />
          </Field>
        )}
        <div className="mt-4">
          <Badge tone="neutral" icon="info">{l("الاستعادة الحقيقية تتطلب خدمة بريد مُهيّأة", "Real reset requires a configured mail service")}</Badge>
        </div>
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
