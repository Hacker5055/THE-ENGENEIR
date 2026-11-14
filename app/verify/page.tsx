import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { OtpForm } from "@/components/auth/otp-form";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PrefToggles } from "@/components/pref-toggles";
import { peekChallenge } from "@/lib/server/auth";
import { getPrefs } from "@/lib/prefs";

export const metadata = { title: "التحقق الثنائي" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; expired?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const cookieId = (await cookies()).get("am_pending")?.value;
  // Prefer the id carried in the URL: it is what survives environments that
  // drop short-lived cookies between the two sign-in navigations.
  const challengeId = sp.c?.trim() || cookieId;
  const challenge = peekChallenge(challengeId);
  if (!challenge) redirect("/login?expired=1");
  const { locale } = await getPrefs();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-40" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 start-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(40,100,217,.30), transparent 65%)" }}
        aria-hidden="true"
      />
      <header className="relative flex items-center justify-between p-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <Wordmark locale={locale} size="sm" />
        </Link>
        <PrefToggles />
      </header>
      <main className="relative flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[400px] rounded-2xl border border-line bg-surface/70 p-6 shadow-lg backdrop-blur-xl">
          <OtpForm
            challengeId={challengeId ?? ""}
            next={sp.next}
            demoCode={challenge.demoCode}
            email={challenge.email}
            name={challenge.name}
            expiresInMs={challenge.expiresInMs}
          />

          {/* Fallback that never depends on hydration. */}
          <noscript>
            <form action="/api/auth/verify" method="post" className="mt-4 space-y-2 rounded-xl border border-line bg-surface p-3.5">
              <p className="text-[11px] font-medium text-fg-soft">أدخل الرمز المكوّن من 6 أرقام</p>
              <input type="hidden" name="challenge" value={challengeId!} />
              {sp.next && <input type="hidden" name="next" value={sp.next} />}
              <input name="code" inputMode="numeric" maxLength={6} required placeholder="000000" dir="ltr" className="h-11 w-full rounded-lg border border-line-strong bg-bg-elevated text-center font-mono text-lg tracking-[0.3em] text-fg" />
              <button type="submit" className="h-10 w-full rounded-lg bg-brand-500 text-[12px] font-semibold text-white">تأكيد الدخول</button>
              <p className="text-[10px] text-fg-muted">الرمز: <code className="font-mono">{challenge.demoCode}</code></p>
            </form>
          </noscript>
        </div>
      </main>
    </div>
  );
}
