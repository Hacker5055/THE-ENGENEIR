import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LogoMark } from "@/components/brand/logo";
import { getSessionUser, HOME_FOR_ROLE } from "@/lib/server/auth";
import { getPrefs } from "@/lib/prefs";
import { tx } from "@/lib/utils";

export const metadata = { title: "جارٍ الدخول" };
export const dynamic = "force-dynamic";

/**
 * Post-sign-in landing page.
 *
 * If the session cookie reached the browser we bounce straight to the role
 * home. If it did not — a browser that blocks third-party cookies inside an
 * embedded preview, for example — we say so in plain language instead of
 * looping the user back to the login screen with a misleading "expired" error.
 */
export default async function WelcomePage() {
  const user = await getSessionUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);

  const { locale } = await getPrefs();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const selfUrl = host ? `${proto}://${host}` : "/";

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5 py-10 text-fg">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <div>
            <p className="text-[14px] font-semibold text-fg">{tx(locale, "تم التحقق من بياناتك", "Your credentials were verified")}</p>
            <p className="text-[11px] text-fg-muted">{tx(locale, "لكن المتصفح لم يحتفظ بجلسة الدخول", "but the browser did not keep the session")}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-warn-500/35 bg-warn-500/[0.07] p-3.5 text-[11.5px] leading-relaxed text-fg-soft">
          {tx(
            locale,
            "الدخول نجح على الخادم، لكن كوكي الجلسة لم يُخزَّن. يحدث هذا عندما تُعرض المعاينة داخل إطار (iframe) مع حظر كوكيز الطرف الثالث، أو عند تصفح خاص صارم.",
            "Sign-in succeeded on the server, but the session cookie was not stored. This happens when the preview is embedded in an iframe with third-party cookies blocked, or in strict private browsing.",
          )}
        </div>

        <p className="mt-4 text-[11.5px] font-medium text-fg-soft">{tx(locale, "الحل في خطوتين", "Two-step fix")}</p>
        <ol className="mt-1.5 space-y-1.5 text-[11.5px] leading-relaxed text-fg-muted">
          <li>
            <span className="me-1 font-semibold text-fg-soft">1.</span>{" "}
            {tx(locale, "افتح المعاينة في تبويب مستقل — الكوكيز تصبح أولية ولا تُحجب.", "Open the preview in its own browser tab — cookies become first-party and are no longer blocked.")}
          </li>
          <li>
            <span className="me-1 font-semibold text-fg-soft">2.</span>{" "}
            {tx(locale, "سجّل الدخول مرة واحدة. تبقى الجلسة 8 ساعات حتى مع إعادة تشغيل الخادم.", "Sign in once. The session lasts 8 hours, even across server restarts.")}
          </li>
        </ol>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={selfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-[12px] font-semibold text-white transition hover:bg-brand-600"
          >
            {tx(locale, "افتح المعاينة في تبويب جديد", "Open the preview in a new tab")}
          </a>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-[12px] font-medium text-fg transition hover:bg-surface-2"
          >
            {tx(locale, "تسجيل الدخول مجدداً", "Sign in again")}
          </Link>
        </div>

        <p className="mt-4 border-t border-line pt-3 text-[10px] leading-relaxed text-fg-muted">
          {tx(
            locale,
            "للتشخيص: افتح أدوات المطوّر ← Application ← Cookies، وتأكد من وجود am_session بعد الدخول.",
            "To diagnose: open DevTools → Application → Cookies and confirm am_session exists after signing in.",
          )}
        </p>
      </div>
    </div>
  );
}
