"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { completeSignIn, cookieSecure, peekChallenge, resendChallenge, signOut, startSignIn } from "@/lib/server/auth";

export interface LoginState {
  error?: string;
  email?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "يرجى إدخال البريد المؤسسي وكلمة المرور.", email };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "صيغة البريد الإلكتروني غير صحيحة.", email };
  }

  const result = await startSignIn(email, password);
  if (!result.ok) {
    return {
      error:
        result.error === "RATE_LIMITED"
          ? "محاولات دخول كثيرة من هذا الجهاز. حاول بعد بضع دقائق أو استخدم «نسيت كلمة المرور»."
          : "بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.",
      email,
    };
  }

  // No second factor required (no mail server configured): the session cookie
  // is already set by startSignIn.
  if (result.kind === "SESSION") {
    const carry = next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
    redirect(`/welcome${carry}`);
  }

  const jar = await cookies();
  jar.set("am_pending", result.challengeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
    secure: await cookieSecure(),
  });
  // The challenge id also travels in the URL: some embedded/preview browsers
  // drop short-lived cookies between two navigations, and losing the id turned
  // a valid code into a dead end.
  const carry = next.startsWith("/") && !next.startsWith("//") ? `&next=${encodeURIComponent(next)}` : "";
  redirect(`/verify?c=${encodeURIComponent(result.challengeId)}${carry}`);
}

export async function verifyAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const fromForm = String(formData.get("challenge") ?? "").trim();
  const challengeId = fromForm || (await cookies()).get("am_pending")?.value;
  const code = String(formData.get("code") ?? "");
  const next = String(formData.get("next") ?? "").trim();
  if (!challengeId) {
    return { error: "انتهت جلسة التحقق أو أُغلقت. سجّل الدخول من جديد — لن تفقد شيئاً." };
  }
  if (!peekChallenge(challengeId)) {
    return { error: "انتهت صلاحية هذا الرمز (5 دقائق). سجّل الدخول من جديد للحصول على رمز آخر." };
  }
  if (code.replace(/\D/g, "").length !== 6) return { error: "أدخل الرمز المكوّن من 6 أرقام." };

  const result = await completeSignIn(challengeId, code);
  if (!result.ok) {
    if (result.error === "EXPIRED") return { error: "انتهت صلاحية الرمز. أعد الإرسال أو سجّل الدخول مجدداً." };
    if (result.error === "LOCKED") return { error: "تم تجاوز عدد المحاولات المسموح. سجّل الدخول مرة أخرى." };
    return { error: "الرمز غير صحيح. تحقق من الأرقام وحاول مرة أخرى." };
  }

  (await cookies()).delete("am_pending");
  // Land on /welcome first: it verifies the session cookie actually reached the
  // browser, and explains what to do when it did not (blocked/third-party).
  const carry = next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/welcome${carry}`);
}

export async function resendOtpAction(
  challengeFromPage?: string,
): Promise<{ ok: boolean; demoCode?: string; message: string }> {
  const challengeId = challengeFromPage?.trim() || (await cookies()).get("am_pending")?.value;
  if (!challengeId) return { ok: false, message: "انتهت الجلسة، يرجى تسجيل الدخول مجدداً." };
  const res = await resendChallenge(challengeId);
  if (!res.ok) {
    return { ok: false, message: "يمكنك إعادة الإرسال بعد 30 ثانية من الطلب السابق." };
  }
  return { ok: true, demoCode: res.demoCode, message: "تم إرسال رمز تحقق جديد." };
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}
