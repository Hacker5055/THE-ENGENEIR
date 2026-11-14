/* ============================================================================
   Outbound mail (SMTP / Gmail)
   ----------------------------------------------------------------------------
   Configured entirely through environment variables:

     AM_SMTP_HOST   default smtp.gmail.com
     AM_SMTP_PORT   default 465 (implicit TLS) — 587 switches to STARTTLS
     AM_SMTP_USER   the Gmail address
     AM_SMTP_PASS   a Google *App Password*, never the account password
     AM_MAIL_FROM   optional, defaults to "Al Mohandes <AM_SMTP_USER>"

   When SMTP is not configured the platform keeps working: verification codes
   are only surfaced in the UI in demo mode, and password resets are disabled
   with a clear message instead of silently pretending to send mail.
   ========================================================================== */

import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

const HOST = () => process.env.AM_SMTP_HOST?.trim() || "smtp.gmail.com";
const PORT = () => Number(process.env.AM_SMTP_PORT?.trim() || 465);
const USER = () => process.env.AM_SMTP_USER?.trim() || "";
const PASS = () => process.env.AM_SMTP_PASS?.trim() || "";
const FROM = () => process.env.AM_MAIL_FROM?.trim() || (USER() ? `Al Mohandes <${USER()}>` : "");

export function mailConfigured(): boolean {
  return Boolean(USER() && PASS());
}

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (!cached) {
    const port = PORT();
    cached = nodemailer.createTransport({
      host: HOST(),
      port,
      secure: port === 465,
      auth: { user: USER(), pass: PASS() },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return cached;
}

export interface MailResult {
  ok: boolean;
  error?: string;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailResult> {
  if (!mailConfigured()) return { ok: false, error: "SMTP_NOT_CONFIGURED" };
  try {
    await transporter().sendMail({
      from: FROM(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  } catch (error) {
    console.error("[mail] send failed", error instanceof Error ? error.message : error);
    return { ok: false, error: "SEND_FAILED" };
  }
}

/* ------------------------------ templates ------------------------------ */

const wrap = (title: string, body: string, footer: string) => `<!doctype html>
<html lang="ar" dir="rtl"><body style="margin:0;background:#070d1b;padding:32px 16px;font-family:system-ui,'Segoe UI',Tahoma,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#0d1526;border:1px solid #1e2b47;border-radius:16px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #1e2b47">
      <span style="color:#7aa2ff;font-size:13px;letter-spacing:.08em">AL MOHANDES</span>
      <h1 style="margin:8px 0 0;color:#f3f6ff;font-size:19px;font-weight:600">${title}</h1>
    </td></tr>
    <tr><td style="padding:24px 28px;color:#c3cee6;font-size:14px;line-height:1.8">${body}</td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #1e2b47;color:#7d8aa4;font-size:12px">${footer}</td></tr>
  </table>
</body></html>`;

export function sendVerificationCode(to: string, code: string, minutes: number) {
  return sendMail({
    to,
    subject: "رمز التحقق — منصة المهندس",
    text: `رمز التحقق الخاص بك: ${code}\nصالح لمدة ${minutes} دقائق.`,
    html: wrap(
      "رمز التحقق بخطوتين",
      `<p>استخدم الرمز التالي لإكمال تسجيل الدخول:</p>
       <p style="margin:18px 0;font-size:30px;letter-spacing:10px;color:#f3f6ff;font-weight:700">${code}</p>
       <p>الرمز صالح لمدة ${minutes} دقائق ولمرة واحدة. إن لم تكن أنت من طلب الدخول فتجاهل الرسالة وغيّر كلمة المرور.</p>`,
      "هذه رسالة آلية من منصة المهندس — لا ترد عليها.",
    ),
  });
}

export function sendPasswordReset(to: string, link: string, minutes: number) {
  return sendMail({
    to,
    subject: "إعادة تعيين كلمة المرور — منصة المهندس",
    text: `لإعادة تعيين كلمة المرور افتح الرابط:\n${link}\nصالح لمدة ${minutes} دقيقة.`,
    html: wrap(
      "إعادة تعيين كلمة المرور",
      `<p>وصلنا طلب لإعادة تعيين كلمة المرور لحسابك. اضغط الزر للمتابعة:</p>
       <p style="margin:22px 0">
         <a href="${link}" style="display:inline-block;background:#2864d9;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">تعيين كلمة مرور جديدة</a>
       </p>
       <p style="font-size:12.5px;color:#8b98b4">الرابط صالح ${minutes} دقيقة ولمرة واحدة. لو لم تطلب ذلك، تجاهل الرسالة — كلمتك الحالية تبقى فعالة.</p>`,
      "هذه رسالة آلية من منصة المهندس — لا ترد عليها.",
    ),
  });
}

export function sendWelcomeCredentials(input: {
  to: string;
  name: string;
  password: string;
  loginUrl: string;
}) {
  return sendMail({
    to: input.to,
    subject: "تم إنشاء حسابك — منصة المهندس",
    text: `مرحباً ${input.name},\nتم إنشاء حسابك.\nالبريد: ${input.to}\nكلمة المرور المؤقتة: ${input.password}\nستُطلب منك تغييرها عند أول دخول: ${input.loginUrl}`,
    html: wrap(
      "تم إنشاء حسابك",
      `<p>مرحباً ${input.name}،</p>
       <p>أنشأ مدير النظام حسابك على منصة المهندس.</p>
       <p style="margin:16px 0;background:#111c33;border:1px solid #1e2b47;border-radius:10px;padding:14px">
         <span style="color:#8b98b4;font-size:12.5px">البريد</span><br><b style="color:#f3f6ff">${input.to}</b><br>
         <span style="color:#8b98b4;font-size:12.5px">كلمة المرور المؤقتة</span><br><b style="color:#f3f6ff;font-family:monospace">${input.password}</b>
       </p>
       <p>ستُطلب منك تعيين كلمة مرور جديدة عند أول تسجيل دخول.</p>
       <p style="margin:20px 0"><a href="${input.loginUrl}" style="display:inline-block;background:#2864d9;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">الدخول إلى المنصة</a></p>`,
      "هذه رسالة آلية من منصة المهندس — لا ترد عليها.",
    ),
  });
}
