import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { OtpForm } from "@/components/auth/otp-form";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PrefToggles } from "@/components/pref-toggles";
import { peekChallenge } from "@/lib/server/auth";
import { getPrefs } from "@/lib/prefs";

export const metadata = { title: "التحقق الثنائي" };

export default async function VerifyPage() {
  const chunk = (await cookies()).get("am_pending")?.value;
  const challenge = peekChallenge(chunk);
  if (!challenge) redirect("/login");
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
            challengeId={chunk!}
            demoCode={challenge.demoCode}
            email={challenge.email}
            name={challenge.name}
            expiresInMs={challenge.expiresInMs}
          />
        </div>
      </main>
    </div>
  );
}
