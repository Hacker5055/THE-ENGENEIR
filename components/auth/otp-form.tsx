"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { resendOtpAction, verifyAction, type LoginState } from "@/app/actions/auth";
import { Alert, Badge, Button } from "@/components/ui";
import { Icon as IconCmp } from "@/components/icons";
import { usePrefs, useToast } from "@/components/providers";
import { cx, fmtCountdown } from "@/lib/utils";

export function OtpForm({
  challengeId,
  demoCode,
  email,
  name,
  expiresInMs,
  next,
}: {
  challengeId: string;
  demoCode: string;
  email: string;
  name: string;
  expiresInMs: number;
  next?: string;
}) {
  const { l } = usePrefs();
  const { toast } = useToast();
  const [state, action] = useActionState<LoginState, FormData>(verifyAction, {});
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [remaining, setRemaining] = useState(expiresInMs);
  const [code, setCode] = useState(demoCode);
  const [resending, setResending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = clean;
      return next;
    });
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (clean && i === 5) {
      const joined = [...digits.slice(0, 5), clean].join("");
      if (joined.length === 6) setTimeout(() => formRef.current?.requestSubmit(), 90);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = text.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(next);
    refs.current[Math.min(5, text.length)]?.focus();
    if (text.length === 6) setTimeout(() => formRef.current?.requestSubmit(), 90);
  };

  const fillDemo = () => {
    setDigits(demoCode.split(""));
    refs.current[5]?.focus();
  };

  const resend = async () => {
    setResending(true);
    const res = await resendOtpAction(challengeId);
    setResending(false);
    if (res.ok && res.demoCode) {
      setCode(res.demoCode);
      setDigits(["", "", "", "", "", ""]);
      toast({ title: res.message, description: l("تم إصدار رمز جديد.", "A new code was issued."), tone: "success" });
      refs.current[0]?.focus();
    } else {
      toast({ title: res.message, tone: "warning" });
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-5 flex items-center gap-2">
        <Link href="/login" className="grid size-8 place-items-center rounded-lg border border-line text-fg-muted transition hover:text-fg" aria-label={l("رجوع", "Back")}>
          <IconCmp name="arrow-right" size={14} className="rtl:rotate-0 ltr:rotate-180" />
        </Link>
        <Badge tone="accent" icon="shield-check">{l("تحقق ثنائي", "Two-factor")}</Badge>
      </div>

      <h1 className="text-[22px] font-semibold tracking-tight text-fg">{l("أدخل رمز التحقق", "Enter your verification code")}</h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
        {l("أرسلنا رمزاً مكوّناً من 6 أرقام إلى ", "We sent a 6-digit code to ")}
        <span dir="ltr" className="font-medium text-fg-soft">{email}</span>
        {l(" لحساب ", " for ")}
        <span className="font-medium text-fg-soft">{name}</span>.
      </p>

      {state.error && <Alert tone="danger" title={state.error} className="mt-4" icon="alert-circle" />}
      {remaining <= 0 && (
        <Alert
          tone="warning"
          title={l("انتهت صلاحية هذا الرمز", "This code has expired")}
          className="mt-4"
          icon="clock"
        >
          {l(
            "أرسل رمزاً جديداً بالزر أدناه، أو ابدأ تسجيل الدخول من جديد. لم تُنشأ أي جلسة بعد، فلا شيء مفقود.",
            "Send a new code with the button below, or start over. No session was created yet, so nothing is lost.",
          )}
        </Alert>
      )}

      <form ref={formRef} action={action} className="mt-6">
        <input type="hidden" name="code" value={digits.join("")} />
        <input type="hidden" name="challenge" value={challengeId} />
        {next && <input type="hidden" name="next" value={next} />}
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-fg-soft">{l("رمز التحقق", "Verification code")}</legend>
          <div className="flex justify-between gap-2" dir="ltr" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`${l("الرقم", "Digit")} ${i + 1}`}
                maxLength={1}
                className={cx(
                  "h-14 w-full rounded-xl border bg-bg-elevated/70 text-center text-xl font-semibold text-fg transition",
                  "focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/25",
                  d ? "border-brand/60" : "border-line-strong",
                )}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex items-center justify-between text-[11.5px]">
          <span className="flex items-center gap-1.5 text-fg-muted">
            <IconCmp name="clock" size={12} />
            {l("ينتهي بعد", "Expires in")} <span className="tnum font-medium text-fg-soft">{fmtCountdown(remaining)}</span>
          </span>
          <button type="button" onClick={resend} disabled={resending} className="font-medium text-accent-400 hover:underline disabled:opacity-50">
            {resending
              ? l("جارٍ الإرسال…", "Sending…")
              : remaining <= 0
                ? l("أرسل رمزاً جديداً", "Send a new code")
                : l("إعادة إرسال الرمز", "Resend code")}
          </button>
        </div>

        <SubmitBtn disabled={remaining <= 0} />

        <div className="mt-5 rounded-xl border border-dashed border-warn-500/40 bg-warn-500/[0.06] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-warn-500">
                <IconCmp name="info" size={12} /> {l("وضع العرض التجريبي", "Demo environment")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                {l("في الإنتاج يُرسل الرمز عبر SMS/البريد/الإشعارات. هنا يُعرض للعرض فقط.", "In production the code is sent by SMS/email/push. Here it is shown for demonstration only.")}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-md border border-line-strong bg-bg px-2 py-1 font-mono text-[13px] tracking-[0.2em] text-fg" dir="ltr">{code}</code>
            <Button type="button" size="xs" variant="secondary" onClick={fillDemo} icon="check">
              {l("استخدام الرمز", "Use code")}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-5 flex items-center justify-center gap-3 text-[11px]">
        <Link href="/login" className="text-fg-muted transition hover:text-fg">{l("استخدام حساب آخر", "Use another account")}</Link>
        <span className="text-line-strong">·</span>
        <Link href="/" className="text-fg-muted transition hover:text-fg">{l("الرئيسية", "Home")}</Link>
      </div>
    </div>
  );
}

function SubmitBtn({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const { l } = usePrefs();
  return (
    <Button type="submit" size="lg" className="mt-5 w-full" loading={pending} disabled={disabled || pending}>
      {pending ? l("جارٍ التحقق…", "Verifying…") : l("تأكيد الدخول", "Confirm and sign in")}
    </Button>
  );
}
