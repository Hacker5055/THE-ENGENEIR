import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import { PrefToggles } from "@/components/pref-toggles";
import { getSessionUser, HOME_FOR_ROLE } from "@/lib/server/auth";
import { getPrefs } from "@/lib/prefs";
import { tx } from "@/lib/utils";

export const metadata = { title: "تسجيل الدخول" };

const ROLE_EMAIL: Record<string, string> = {
  student: "student@almohandes.edu",
  teacher: "teacher@almohandes.edu",
  admin: "admin@almohandes.edu",
  supervisor: "supervisor@almohandes.edu",
  root: "root@almohandes.edu",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);
  const { locale } = await getPrefs();
  const { role } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <aside className="relative hidden overflow-hidden bg-navy-950 lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-50" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -end-32 top-1/4 h-[420px] w-[420px] rounded-full blur-[110px]"
          style={{ background: "radial-gradient(circle, rgba(40,100,217,.45), transparent 65%)" }}
          aria-hidden="true"
        />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size={44} />
            <Wordmark locale={locale} size="md" />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[30px] font-semibold leading-tight text-white">
            {tx(locale, "منظومة واحدة لكل ما يحدث داخل المؤسسة التعليمية.", "One system for everything inside the institution.")}
          </h2>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/55">
            {tx(
              locale,
              "حضور موثّق بالـQR والنطاق الجغرافي، جداول ومقررات، اختبارات بمؤقت من الخادم، وتحليلات أكاديمية قابلة للتفسير.",
              "Attendance verified by QR and geofence, timetables and courses, exams with server-side timers, and explainable academic analytics.",
            )}
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              [tx(locale, "صلاحيات تُنفّذ على الخادم", "Permissions enforced server-side"), tx(locale, "خمسة أدوار قابلة للتخصيص، ولا اعتماد على إخفاء الأزرار.", "Five configurable roles — hiding a button is never the control.")],
              [tx(locale, "عزل بيانات المؤسسات", "Tenant isolation"), tx(locale, "كل صف مرتبط بمؤسسة، وكل استعلام مُقيّد بالمستأجر.", "Every row scoped to an institution, every query tenant-bound.")],
              [tx(locale, "شفافية أمنية", "Security transparency"), tx(locale, "لا مراقبة خفية للشاشة أو الكاميرا، وحدود كل منصة معلنة.", "No covert screen or camera surveillance; platform limits stated openly.")],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-500/15 text-accent-400">
                  <Icon name="check" size={11} strokeWidth={3} />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-white/90">{t}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/45">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-4 border-t border-white/10 pt-5 text-[11px] text-white/35">
          <span className="flex items-center gap-1.5"><Icon name="shield-check" size={13} /> ISO 27001-aligned design</span>
          <span className="flex items-center gap-1.5"><Icon name="lock" size={13} /> {tx(locale, "تشفير أثناء النقل والتخزين", "Encrypted in transit & at rest")}</span>
        </div>
      </aside>

      {/* form panel */}
      <main className="relative flex min-h-dvh flex-col bg-bg">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <LogoMark size={32} />
            <Wordmark locale={locale} size="sm" />
          </Link>
          <PrefToggles />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-10">
          <LoginForm initialEmail={role ? ROLE_EMAIL[role] : undefined} />
        </div>
        <div className="border-t border-line px-5 py-3 text-center text-[10.5px] text-fg-muted">
          © 2026 AL MOHANDES · {tx(locale, "نموذج أولي وظيفي — بيانات تجريبية", "Functional prototype — demo data")}
        </div>
      </main>
    </div>
  );
}
