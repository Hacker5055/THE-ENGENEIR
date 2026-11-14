import Link from "next/link";
import { PasswordForm } from "@/components/auth/password-form";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import { PrefToggles } from "@/components/pref-toggles";
import { getPrefs } from "@/lib/prefs";

export const metadata = { title: "إعادة تعيين كلمة المرور" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { locale } = await getPrefs();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between p-5">
        <Link href="/login" className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <Wordmark locale={locale} size="sm" />
        </Link>
        <PrefToggles />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-4">
        <div className="rounded-2xl border border-line bg-surface/70 p-6 shadow-lg backdrop-blur-xl">
          {token ? (
            <PasswordForm mode="reset" token={token} />
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-fg-muted">
              <Icon name="alert-circle" size={14} /> الرابط غير صالح.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
