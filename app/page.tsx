import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import { PrefToggles } from "@/components/pref-toggles";
import { getPrefs } from "@/lib/prefs";
import { getSessionUser, HOME_FOR_ROLE } from "@/lib/server/auth";
import { tx } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata = {
  title: "زياد الشافعي — البرمجة وعلوم الحاسب | البكالوريا المصرية",
  description:
    "منصة مستر زياد الشافعي لتدريس البرمجة وعلوم الحاسب لطلاب الصف الأول والثاني والثالث الثانوي — نظام البكالوريا المصرية: شرح، كتب الوزارة، اختبارات إلكترونية، وحضور موثّق.",
};

const GRADES = [
  {
    id: "g10",
    ar: "الصف الأول الثانوي",
    en: "First secondary",
    tone: "emerald",
    topicsAr: ["المعلومات وأخلاقياتها", "أمن المعلومات والتشفير", "النظام الثنائي وتمثيل البيانات", "مكونات الحاسب والدوائر المنطقية", "الشبكات وقواعد البيانات", "الخوارزميات + Qureo"],
    topicsEn: ["Information & ethics", "Security & encryption", "Binary & data representation", "Hardware & logic circuits", "Networks & databases", "Algorithms + Qureo"],
  },
  {
    id: "g11",
    ar: "الصف الثاني الثانوي",
    en: "Second secondary",
    tone: "cyan",
    topicsAr: ["الذكاء الاصطناعي وأخلاقياته", "التعلم الآلي", "الأمن السيبراني والتشفير", "بناء تطبيقات الويب", "قواعد البيانات", "تجربة المستخدم UX"],
    topicsEn: ["AI & ethics", "Machine learning", "Cybersecurity & encryption", "Web application building", "Databases", "UX design"],
  },
  {
    id: "g12",
    ar: "الصف الثالث الثانوي",
    en: "Third secondary",
    tone: "lime",
    topicsAr: ["مراجعة JavaScript", "هياكل البيانات والخوارزميات", "البرمجة كائنية التوجه", "SQL وقواعد البيانات", "تطبيقات وAPIs", "مشروع التخرج"],
    topicsEn: ["JavaScript review", "Data structures & algorithms", "OOP", "SQL & databases", "Apps & APIs", "Capstone project"],
  },
];

const PERKS = [
  { icon: "video" as const, ar: "حصص مباشرة ومسجّلة", en: "Live & recorded lessons" },
  { icon: "clipboard" as const, ar: "اختبارات إلكترونية بمؤقّت من الخادم", en: "Online exams with server-side timer" },
  { icon: "qr" as const, ar: "حضور موثّق بالـQR والنطاق الجغرافي", en: "Verified QR + geofence attendance" },
  { icon: "chart" as const, ar: "متابعة درجاتك وحضورك لحظة بلحظة", en: "Live grades and attendance tracking" },
];

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect(HOME_FOR_ROLE[user.role]);
  const { locale } = await getPrefs();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      {/* AMOLED background: pure black with an emerald halo */}
      <div
        className="pointer-events-none absolute -top-40 start-1/2 h-[520px] w-[720px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,.28), transparent 62%)" }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-[0.35]" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="زياد الشافعي — الرئيسية">
          <LogoMark size={38} />
          <Wordmark locale={locale} size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <PrefToggles compact />
          <Link
            href="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 text-[12.5px] font-semibold text-black transition hover:bg-emerald-400"
          >
            <Icon name="lock" size={13} />
            {tx(locale, "دخول الطلاب", "Student login")}
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-20">
        {/* hero */}
        <section className="pt-10 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11.5px] font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {tx(locale, "نظام البكالوريا المصرية · 2026 / 2027", "Egyptian Baccalaureate · 2026 / 2027")}
          </span>

          <h1 className="mt-5 text-[34px] font-semibold leading-[1.15] tracking-tight text-fg sm:text-[46px]">
            {tx(locale, "البرمجة وعلوم الحاسب", "Programming & Computer Science")}
            <span className="mt-2 block text-emerald-400">{tx(locale, "مع مستر زياد الشافعي", "with Mr. Ziad El-Shafei")}</span>
          </h1>

          <p className="mt-5 max-w-2xl text-[14.5px] leading-relaxed text-fg-muted">
            {tx(
              locale,
              "منصة واحدة تجمع شرح المنهج، كتب وزارة التربية والتعليم، الواجبات والاختبارات الإلكترونية، ومتابعة الحضور والدرجات لطلاب الصفوف الثلاثة الثانوية.",
              "One platform for the curriculum, the official Ministry of Education books, assignments, online exams, attendance and grades across the three secondary grades.",
            )}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/curriculum"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-[13px] font-semibold text-black transition hover:bg-emerald-400"
            >
              <Icon name="book" size={15} />
              {tx(locale, "المنهج وكتب الوزارة", "Curriculum & ministry books")}
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface/60 px-5 text-[13px] font-medium text-fg transition hover:bg-surface-2"
            >
              <Icon name="user" size={15} />
              {tx(locale, "دخول بوابة الطالب", "Open student portal")}
            </Link>
          </div>
        </section>

        {/* grades */}
        <section id="grades" className="mt-16">
          <h2 className="text-[20px] font-semibold text-fg">{tx(locale, "الصفوف الدراسية", "Grade levels")}</h2>
          <p className="mt-1.5 text-[13px] text-fg-muted">
            {tx(locale, "ثلاثة مسارات منفصلة، كل صف بمنهجه وكتابه الرسمي واختباراته.", "Three separate tracks, each with its own curriculum, official book and exams.")}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {GRADES.map((grade) => (
              <article
                key={grade.id}
                className="group relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-5 transition hover:border-emerald-500/40 hover:bg-surface-2/70"
              >
                <div
                  className="pointer-events-none absolute -end-10 -top-10 size-28 rounded-full blur-2xl opacity-60"
                  style={{
                    background:
                      grade.tone === "emerald"
                        ? "rgba(16,185,129,.35)"
                        : grade.tone === "cyan"
                          ? "rgba(34,211,238,.28)"
                          : "rgba(163,230,53,.25)",
                  }}
                  aria-hidden="true"
                />
                <h3 className="text-[15.5px] font-semibold text-fg">{tx(locale, grade.ar, grade.en)}</h3>
                <p className="mt-1 text-[11.5px] text-emerald-400/90">
                  {tx(locale, "البرمجة وعلوم الحاسب", "Programming & Computer Science")}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {(locale === "ar" ? grade.topicsAr : grade.topicsEn).map((topic) => (
                    <li key={topic} className="flex items-start gap-2 text-[12px] text-fg-soft">
                      <Icon name="check" size={11} className="mt-1 shrink-0 text-emerald-400" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/curriculum#${grade.id}`}
                  className="mt-5 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-400 transition hover:text-emerald-300"
                >
                  {tx(locale, "تفاصيل المنهج", "Curriculum details")}
                  <Icon name="arrow-left" size={12} className="rtl:rotate-0 ltr:rotate-180" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* perks */}
        <section className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((perk) => (
            <div key={perk.ar} className="rounded-xl border border-line bg-surface/60 p-4">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-500/12 text-emerald-400">
                <Icon name={perk.icon} size={15} />
              </span>
              <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-fg">{tx(locale, perk.ar, perk.en)}</p>
            </div>
          ))}
        </section>

        {/* teacher card */}
        <section className="mt-14 overflow-hidden rounded-2xl border border-line bg-surface/70 p-6">
          <div className="flex flex-wrap items-center gap-5">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-[22px] font-semibold text-emerald-300">
              ز
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-fg">{tx(locale, "مستر زياد الشافعي", "Mr. Ziad El-Shafei")}</h2>
              <p className="mt-1 text-[12.5px] text-fg-muted">
                {tx(
                  locale,
                  "مدرّس البرمجة وعلوم الحاسب — البكالوريا المصرية · الصفوف الثلاثة الثانوية",
                  "Programming & Computer Science teacher — Egyptian Baccalaureate · all three secondary grades",
                )}
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-[12.5px] font-medium text-fg transition hover:bg-surface-2"
            >
              {tx(locale, "لوحة المدرّس", "Teacher dashboard")}
              <Icon name="arrow-left" size={12} className="rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-[11.5px] text-fg-muted">
          <span>© 2026 {tx(locale, "مستر زياد الشافعي", "Mr. Ziad El-Shafei")}</span>
          <div className="flex items-center gap-4">
            <Link href="/curriculum" className="transition hover:text-fg">{tx(locale, "المنهج", "Curriculum")}</Link>
            <Link href="/docs" className="transition hover:text-fg">{tx(locale, "المستندات", "Docs")}</Link>
            <Link href="/login" className="transition hover:text-fg">{tx(locale, "دخول", "Login")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
