"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { completeSignIn, HOME_FOR_ROLE, resendChallenge, signOut, startSignIn } from "@/lib/server/auth";

export interface LoginState {
  error?: string;
  email?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "يرجى إدخال البريد المؤسسي وكلمة المرور.", email };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "صيغة البريد الإلكتروني غير صحيحة.", email };
  }

  const result = await startSignIn(email, password);
  if (!result.ok) {
    return { error: "بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.", email };
  }

  (await cookies()).set("am_pending", result.challengeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/verify");
}

export async function verifyAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const challengeId = (await cookies()).get("am_pending")?.value;
  const code = String(formData.get("code") ?? "");
  if (!challengeId) return { error: "انتهت صلاحية جلسة التحقق. يرجى تسجيل الدخول مرة أخرى." };
  if (code.replace(/\D/g, "").length !== 6) return { error: "أدخل الرمز المكوّن من 6 أرقام." };

  const result = await completeSignIn(challengeId, code);
  if (!result.ok) {
    if (result.error === "EXPIRED") return { error: "انتهت صلاحية الرمز. أعد الإرسال أو سجّل الدخول مجدداً." };
    if (result.error === "LOCKED") return { error: "تم تجاوز عدد المحاولات المسموح. سجّل الدخول مرة أخرى." };
    return { error: "الرمز غير صحيح. تحقق من الأرقام وحاول مرة أخرى." };
  }

  (await cookies()).delete("am_pending");
  redirect(HOME_FOR_ROLE[result.role]);
}

export async function resendOtpAction(): Promise<{ ok: boolean; demoCode?: string; message: string }> {
  const challengeId = (await cookies()).get("am_pending")?.value;
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
