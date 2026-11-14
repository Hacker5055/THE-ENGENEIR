import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/auth/password-form";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PrefToggles } from "@/components/pref-toggles";
import { getSessionUser } from "@/lib/server/auth";
import { getPrefs } from "@/lib/prefs";

export const metadata = { title: "تغيير كلمة المرور" };
export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/change-password");
  const { locale } = await getPrefs();

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center justify-between p-5">
        <span className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <Wordmark locale={locale} size="sm" />
        </span>
        <PrefToggles />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-4">
        <div className="rounded-2xl border border-line bg-surface/70 p-6 shadow-lg backdrop-blur-xl">
          <PasswordForm mode="change" />
        </div>
      </main>
    </div>
  );
}
