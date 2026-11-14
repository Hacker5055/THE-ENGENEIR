"use server";

import { redirect } from "next/navigation";
import {
  changePassword,
  getSessionUser,
  requestPasswordReset,
  resetPassword,
} from "@/lib/server/auth";
import { siteBaseUrl } from "@/lib/server/site-url";

export interface PasswordState {
  error?: string;
  done?: boolean;
}

export interface ResetRequestState {
  sent?: boolean;
  error?: string;
}

const WEAK =
  "كلمة المرور ضعيفة: 12 حرفاً على الأقل، مع حرف كبير وصغير ورقم ورمز.";
const MISMATCH = "كلمتا المرور غير متطابقتين.";
const WRONG_CURRENT = "كلمة المرور الحالية غير صحيحة.";
const EXPIRED = "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.";

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const result = await changePassword(user.id, current, next, confirm);
  if (!result.ok) {
    return {
      error:
        result.error === "WEAK"
          ? WEAK
          : result.error === "MISMATCH"
            ? MISMATCH
            : WRONG_CURRENT,
    };
  }
  // changePassword revokes every session, so the user signs in again with the
  // new password — the honest behaviour after a credential change.
  redirect("/login?changed=1");
}

export async function requestResetAction(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "صيغة البريد الإلكتروني غير صحيحة." };
  }
  await requestPasswordReset(email, await siteBaseUrl());
  return { sent: true };
}

export async function resetPasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const result = await resetPassword(token, next, confirm);
  if (!result.ok) {
    return {
      error:
        result.error === "WEAK" ? WEAK : result.error === "MISMATCH" ? MISMATCH : EXPIRED,
    };
  }
  redirect("/login?reset=1");
}
