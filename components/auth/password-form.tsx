"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  resetPasswordAction,
  type PasswordState,
} from "@/app/actions/account";
import { Alert, Button, Field, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { usePrefs } from "@/components/providers";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} icon={pending ? undefined : "check"}>
      {pending ? "جارٍ الحفظ…" : label}
    </Button>
  );
}

export function PasswordForm({ mode, token }: { mode: "change" | "reset"; token?: string }) {
  const { l } = usePrefs();
  const action = mode === "change" ? changePasswordAction : resetPasswordAction;
  const [state, formAction] = useActionState<PasswordState, FormData>(action, {});

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-5 flex items-center gap-2">
        <Link
          href={mode === "change" ? "/welcome" : "/login"}
          className="grid size-8 place-items-center rounded-lg border border-line text-fg-muted transition hover:text-fg"
          aria-label={l("رجوع", "Back")}
        >
          <Icon name="arrow-right" size={14} className="rtl:rotate-0 ltr:rotate-180" />
        </Link>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-fg-soft">
          {mode === "change" ? l("أمان الحساب", "Account security") : l("إعادة التعيين", "Password reset")}
        </span>
      </div>

      <h1 className="text-[22px] font-semibold tracking-tight text-fg">
        {mode === "change" ? l("عيّن كلمة مرور جديدة", "Set a new password") : l("اختر كلمة مرور جديدة", "Choose a new password")}
      </h1>
      <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
        {l(
          "12 حرفاً على الأقل، مع حرف كبير وصغير ورقم ورمز. لن تُقبل كلمة المرور المؤقتة.",
          "At least 12 characters, with upper and lower case, a digit and a symbol. Temporary passwords are rejected.",
        )}
      </p>

      {state.error && <Alert tone="danger" title={state.error} icon="alert-circle" className="mt-4" />}

      <form action={formAction} className="mt-6 space-y-4">
        {mode === "reset" ? (
          <input type="hidden" name="token" value={token ?? ""} />
        ) : (
          <Field label={l("كلمة المرور الحالية", "Current password")}>
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
        )}
        <Field label={l("كلمة المرور الجديدة", "New password")}>
          <Input name="next" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
        <Field label={l("تأكيد كلمة المرور", "Confirm password")}>
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={12} />
        </Field>
        <Submit label={mode === "change" ? l("حفظ وتسجيل الخروج", "Save and sign out") : l("حفظ كلمة المرور", "Save password")} />
      </form>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-fg-muted">
        <Icon name="lock" size={11} />
        {l("تُلغى كل الجلسات الأخرى تلقائياً بعد التغيير.", "All other sessions are revoked automatically.")}
      </p>
    </div>
  );
}
