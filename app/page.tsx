"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoMark, Wordmark, LogoGlyph } from "@/components/brand/logo";
import { PrefToggles } from "@/components/pref-toggles";
import { Badge, Ring } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { CardLink } from "@/components/landing-bits";
import { usePrefs } from "@/components/providers";
import { Sparkline } from "@/components/charts";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "#experiences", ar: "التجارب", en: "Experiences" },
  { href: "#exams", ar: "الاختبارات الآمنة", en: "Secure exams" },
  { href: "#modules", ar: "الوحدات", en: "Modules" },
  { href: "#security", ar: "الأمان", en: "Security" },
  { href: "#architecture", ar: "المعمارية", en: "Architecture" },
];

const ROLES = [
  {
    href: "/login?role=student",
    ar: "تجربة الطالب",
    en: "Student experience",
    descAr: "تطبيق جوال عربي أولاً: الحضور بالـQR، الجدول، الهوية الرقمية، الاختبارات الآمنة والنتائج.",
    descEn: "Arabic-first mobile app: QR attendance, timetable, digital ID, secure exams and results.",
    icon: "smartphone" as IconName,
    points: ["لوحة يومية + نسبة الحضور", "غرفة اختبار + وضع آمن", "تحليلات الأداء والكشف"],
    tone: "#38A5FF",
  },
  {
    href: "/login?role=teacher",
    ar: "تجربة المعلم",
    en: "Teacher experience",
    descAr: "إدارة المحاضرات، جلسات حضور متحركة، بنك أسئلة، منشئ اختبارات وتصحيح المقالي.",
    descEn: "Manage lectures, live attendance sessions, question bank, exam builder and essay grading.",
    icon: "id-card" as IconName,
    points: ["جلسة حضور بكود دوّار", "منشئ اختبار بسياسات أمان", "طابور تصحيح المقالي"],
    tone: "#19B88A",
  },
  {
    href: "/login?role=admin",
    ar: "لوحة الإدارة",
    en: "Admin dashboard",
    descAr: "مؤشرات المؤسسة، دليل الطلاب والمعلمين، مركز مراقبة الاختبارات، الصلاحيات والتقارير.",
    descEn: "Institution metrics, directories, exam control center, RBAC, audit logs and reports.",
    icon: "grid" as IconName,
    points: ["مركز مراقبة حيّ", "سجلات تدقيق كاملة", "تقارير A4 عربية/إنجليزية"],
    tone: "#F2A93B",
  },
];

const MODULES = [
  { icon: "qr" as IconName, ar: "الحضور والانصراف", en: "Attendance & departure", dAr: "كود دوّار كل 20 ثانية، نطاق جغرافي، تحقق من المعلم، ومنع التسجيل المكرر على الخادم.", dEn: "20-second rotating QR, geofence, teacher verification and server-side duplicate prevention." },
  { icon: "calendar" as IconName, ar: "الجداول والمقررات", en: "Timetable & courses", dAr: "جدول يومي وأسبوعي، تفاصيل المقرر، مواد المحاضرات، وإشعارات تغيير القاعات.", dEn: "Daily and weekly schedules, course detail, lecture material and room-change notifications." },
  { icon: "chart" as IconName, ar: "الأداء والتحليلات", en: "Performance analytics", dAr: "اتجاهات الدرجات، ربط الحضور بالأداء، مؤشرات خطر الغياب المعلنة كاحتمالات لا كحقائق.", dEn: "Grade trends, attendance correlation and absence-risk indicators presented as probabilities." },
  { icon: "shield-check" as IconName, ar: "الاختبارات الآمنة", en: "Secure examinations", dAr: "مؤقت من الخادم، حفظ فوري للإجابات، ترتيب عشوائي، ربط الجهاز، وسجل أحداث كامل.", dEn: "Server-authoritative timer, instant answer persistence, randomisation, device binding and full event audit." },
  { icon: "message" as IconName, ar: "الطلبات والاستئنافات", en: "Requests & appeals", dAr: "تذاكر موحّدة لتصحيح الحضور، الطعون في الدرجات، حوادث الاختبار والدعم الفني.", dEn: "Unified tickets for attendance corrections, grade appeals, exam incidents and support." },
  { icon: "printer" as IconName, ar: "التقارير والمستندات", en: "Reports & documents", dAr: "كشوف حضور، سجلات أكاديمية، تقارير مخالفات، وتصدير PDF/Excel بتنسيق A4.", dEn: "Attendance sheets, transcripts, violation reports with A4 PDF/Excel export." },
  { icon: "building" as IconName, ar: "تعدد المؤسسات", en: "Multi-tenancy", dAr: "عزل بيانات على مستوى الصفوف والاستعلامات، مع دور مدير منصة لكل المؤسسات.", dEn: "Row-level tenant isolation with a platform-level super admin across institutions." },
  { icon: "activity" as IconName, ar: "سجلات التدقيق", en: "Audit trails", dAr: "كل إجراء إداري يُسجَّل بالفاعل والوقت والسبب، بما في ذلك قرارات حوادث الاختبار.", dEn: "Every administrative action logged with actor, timestamp and reason — including incident decisions." },
];

const SECURITY_MATRIX = [
  { cap: "قفل التطبيق (Lock Task / Kiosk)", en: "App pinning (Lock Task / Kiosk)", managed: "full", personal: "partial", noteAr: "ممكن على أجهزة المؤسسة المُدارة عبر Android Enterprise.", noteEn: "Possible on institution-managed devices via Android Enterprise." },
  { cap: "اكتشاف الانتقال للخلفية وفقدان التركيز", en: "Background / focus-loss detection", managed: "full", personal: "partial", noteAr: "أحداث تُسجَّل على الخادم؛ دقتها تختلف بين Android وiOS.", noteEn: "Events recorded server-side; fidelity varies between Android and iOS." },
  { cap: "منع لقطات الشاشة والتسجيل", en: "Screenshot / recording prevention", managed: "full", personal: "partial", noteAr: "FLAG_SECURE على Android؛ تقييد جزئي فقط على iOS.", noteEn: "FLAG_SECURE on Android; only partial restriction on iOS." },
  { cap: "مؤقت الاختبار من الخادم", en: "Server-authoritative timer", managed: "full", personal: "full", noteAr: "الوقت المتبقي يُحسب على الخادم دائماً، ولا يُقبل وقت الجهاز.", noteEn: "Remaining time is always computed server-side; device clock is never trusted." },
  { cap: "مراقبة الشاشة / الكاميرا / الميكروفون", en: "Screen / camera / microphone surveillance", managed: "none", personal: "none", noteAr: "غير مستخدمة إطلاقاً وغير مطلوبة في التصميم.", noteEn: "Never used and deliberately out of scope." },
  { cap: "الحكم التلقائي بالغش", en: "Automatic cheating verdict", managed: "none", personal: "none", noteAr: "الحوادث تُراجع بشرياً؛ لا حكم آلي بسبب الشبكة أو حدث غامض.", noteEn: "Incidents are human-reviewed; no automatic verdict from network or ambiguous events." },
];

const STACK = [
  { group: "Mobile", items: ["Flutter", "Kotlin + Android Enterprise"] },
  { group: "Backend", items: ["NestJS", "PostgreSQL", "WebSocket", "FCM"] },
  { group: "Web", items: ["Next.js", "Design tokens"] },
  { group: "Platform", items: ["Docker", "S3-compatible", "JWT + Refresh"] },
];

const DELIVERABLES = [
  ["01", "PRD", "متطلبات المنتج الكاملة", "product-requirements"],
  ["02", "IA", "هندسة المعلومات والتنقّل", "information-architecture"],
  ["03", "Journeys", "خرائط رحلات المستخدمين", "user-journeys"],
  ["04", "Brand", "الهوية البصرية واللوغو", "brand-identity"],
  ["05", "Design System", "الرموز والمكونات", "design-system"],
  ["06", "Schema", "تصميم قاعدة البيانات", "database-schema"],
  ["07", "Backend", "معمارية الخدمات", "backend-architecture"],
  ["08", "API", "مواصفة OpenAPI", "api-specification"],
  ["09", "Security", "معمارية الأمان والخصوصية", "security-architecture"],
  ["10", "Roadmap", "خطة التطوير والمراحل", "roadmap"],
  ["11", "Testing", "استراتيجية الاختبار", "testing-strategy"],
];

export default function LandingPage() {
  const { l, locale } = usePrefs();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/85 backdrop-blur-xl">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="المهندس — الصفحة الرئيسية">
            <LogoMark size={38} />
            <Wordmark locale={locale} size="sm" />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-[13px] text-fg-muted transition hover:bg-surface-2 hover:text-fg">
                {l(n.ar, n.en)}
              </a>
            ))}
            <Link href="/docs" className="rounded-lg px-3 py-2 text-[13px] text-fg-muted transition hover:bg-surface-2 hover:text-fg">
              {l("المستندات", "Documentation")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <PrefToggles compact />
            <Link
              href="/login"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition hover:bg-brand-600 sm:inline-flex"
            >
              {l("دخول المنصة", "Sign in")}
              <Icon name="arrow-left" size={14} className={locale === "ar" ? "" : "rotate-180"} />
            </Link>
            <button onClick={() => setNavOpen((v) => !v)} className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted lg:hidden" aria-label="القائمة" aria-expanded={navOpen}>
              <Icon name={navOpen ? "x" : "panel-left"} size={16} />
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="border-t border-line bg-bg px-4 py-3 lg:hidden">
            <div className="grid gap-1">
              {[...NAV, { href: "/docs", ar: "المستندات", en: "Documentation" }].map((n) => (
                <a key={n.href} href={n.href} onClick={() => setNavOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-fg-soft hover:bg-surface-2">
                  {l(n.ar, n.en)}
                </a>
              ))}
              <Link href="/login" className="mt-1 rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-medium text-white">
                {l("دخول المنصة", "Sign in")}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* hero */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-60" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -top-40 start-1/4 h-[520px] w-[520px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(40,100,217,.35), transparent 65%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-24 end-0 h-[380px] w-[380px] rounded-full blur-[110px]"
          style={{ background: "radial-gradient(circle, rgba(56,165,255,.22), transparent 60%)" }}
          aria-hidden="true"
        />
        <div className="container-app relative grid items-center gap-12 py-14 lg:grid-cols-[1.02fr_.98fr] lg:py-20">
          <div className="animate-fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/60 px-3 py-1.5 text-[11.5px] text-fg-soft backdrop-blur">
              <span className="relative grid size-1.5 place-items-center">
                <span className="absolute size-2 rounded-full bg-success-500 animate-pulse-ring" />
                <span className="size-1.5 rounded-full bg-success-500" />
              </span>
              {l("منصة متعددة المؤسسات · إصدار 1.0", "Multi-tenant platform · v1.0")}
            </div>
            <h1 className="text-[clamp(2rem,4.4vw,3.25rem)] font-semibold leading-[1.15] tracking-tight text-fg">
              {l("إدارة أكاديمية كاملة.", "Complete academic management.")}
              <br />
              <span className="text-gradient-brand">
                {l("واختبارات إلكترونية آمنة بلا ادعاءات.", "and secure exams without false claims.")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-fg-muted">
              {l(
                "المهندس منظومة واحدة تربط الطالب والمعلم والإدارة: حضور موثّق، جداول ومقررات، أداء أكاديمي، ومركز مراقبة اختبارات يعتمد على وقت الخادم وحفظ الإجابات فوراً.",
                "AL MOHANDES unifies student, teacher and administration: verified attendance, timetables, academic performance, and an exam control center built on server time and instant answer persistence.",
              )}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/login" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600">
                {l("ابدأ التجربة التفاعلية", "Start the interactive demo")}
                <Icon name="arrow-left" size={16} className={locale === "ar" ? "" : "rotate-180"} />
              </Link>
              <Link href="#experiences" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line-strong px-5 text-sm font-medium text-fg transition hover:bg-surface-2">
                <Icon name="play" size={14} />
                {l("استعرض التجارب", "Browse experiences")}
              </Link>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ["3", l("مؤسسات معزولة", "isolated tenants")],
                ["32", l("مقرراً و96 طالباً", "courses & 96 students")],
                ["100%", l("مؤقت من الخادم", "server-side timing")],
              ].map(([v, k]) => (
                <div key={k as string}>
                  <dt className="tnum text-xl font-semibold text-fg">{v}</dt>
                  <dd className="mt-0.5 text-[11px] leading-snug text-fg-muted">{k}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* product preview */}
          <div className="relative mx-auto w-full max-w-[440px] animate-fade-up lg:max-w-none">
            <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-brand/20 via-transparent to-accent-500/10 blur-2xl" aria-hidden="true" />
            <div className="relative grid grid-cols-[1fr_auto] items-center gap-4">
              {/* dashboard card */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-line-strong bg-surface/90 p-4 shadow-lg backdrop-blur">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-medium text-fg-muted">{l("حضور اليوم — المؤسسة", "Today's attendance — institution")}</p>
                    <Badge tone="success" dot>{l("مباشر", "Live")}</Badge>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="tnum text-2xl font-semibold text-fg">91.4%</p>
                      <p className="text-[10.5px] text-success-500">{l("+2.6 نقطة هذا الأسبوع", "+2.6 pts this week")}</p>
                    </div>
                    <Sparkline data={[62, 68, 65, 74, 79, 76, 84, 88, 91]} width={96} height={34} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    {[
                      ["84", l("حاضر", "present")],
                      ["7", l("متأخر", "late")],
                      ["5", l("غائب", "absent")],
                    ].map(([v, k]) => (
                      <div key={k as string}>
                        <p className="tnum text-sm font-semibold text-fg">{v}</p>
                        <p className="text-[10px] text-fg-muted">{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-danger-500/25 bg-danger-500/[0.07] p-3.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-danger-500/15 text-danger-500">
                      <Icon name="shield-alert" size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-fg">{l("حادثة حرجة تحتاج قراراً", "Critical incident awaiting decision")}</p>
                      <p className="truncate text-[10.5px] text-fg-muted">{l("محاولة مقيّدة · سياسة LOCKDOWN", "Locked attempt · LOCKDOWN policy")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* phone */}
              <div className="w-[176px] shrink-0 rounded-[30px] border border-white/10 bg-navy-950 p-1.5 shadow-device">
                <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#192B45,#101B2D)]">
                  <div className="flex items-center justify-between px-3 pt-2 text-[8px] text-white/60">
                    <span>9:41</span>
                    <span className="flex items-center gap-1">
                      <Icon name="wifi" size={8} /> <Icon name="shield-check" size={8} /> 84%
                    </span>
                  </div>
                  <div className="px-3.5 pb-3 pt-4 text-white">
                    <p className="text-[9px] text-white/50">{l("صباح الخير", "Good morning")}</p>
                    <p className="text-[12px] font-semibold">محمود عبد الرحمن</p>
                    <div className="mt-3 rounded-2xl bg-white/[0.07] p-2.5 ring-1 ring-white/10">
                      <div className="flex items-center gap-2.5">
                        <Ring value={92} size={44} thickness={4} tone="#19B88A">
                          <span className="text-[8px] font-semibold text-white">92%</span>
                        </Ring>
                        <div className="min-w-0">
                          <p className="text-[8px] text-white/50">{l("نسبة الحضور", "Attendance")}</p>
                          <p className="text-[10px] font-medium">{l("ممتاز — فوق الحد", "Excellent — above threshold")}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {[
                        ["08:30", "CS301", l("تحليل الخوارزميات", "Algorithms"), "#38A5FF"],
                        ["10:15", "CS302", l("شبكات الحاسب", "Networks"), "#F2A93B"],
                      ].map(([t, c, n, col]) => (
                        <div key={c as string} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-2 py-1.5 ring-1 ring-white/5">
                          <span className="rounded-md px-1 py-0.5 text-[7px] font-semibold" style={{ background: `${col}22`, color: col as string }}>{t}</span>
                          <span className="truncate text-[8.5px] text-white/85">{n}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 rounded-xl bg-[linear-gradient(135deg,#2864D9,#1B4AA8)] p-2 ring-1 ring-white/15">
                      <p className="text-[8px] font-semibold">{l("اختبار الخوارزميات متاح", "Algorithms exam is live")}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[7.5px] text-white/70">
                        <Icon name="clock" size={7} /> {l("60 دقيقة · محاولة واحدة", "60 min · one attempt")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* experiences */}
      <section id="experiences" className="border-t border-line bg-bg-elevated/40 py-16">
        <div className="container-app">
          <SectionHeading
            kicker={l("ثلاث تجارب", "Three experiences")}
            title={l("منظومة واحدة — كل دور يرى ما يخصه فقط", "One system — each role sees exactly what it needs")}
            desc={l(
              "الطالب على الجوال، المعلم على الجوال والويب، والإدارة على لوحة تحكم مكتبية متجاوبة. نفس نظام التصميم ونفس الصلاحيات على الخادم.",
              "Students on mobile, teachers on mobile and web, administration on a responsive desktop dashboard. One design system, one server-side permission model.",
            )}
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {ROLES.map((r) => (
              <CardLink key={r.href} href={r.href}>
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl border border-line" style={{ background: `${r.tone}14`, color: r.tone }}>
                    <Icon name={r.icon} size={20} />
                  </span>
                  <Icon name="arrow-up-right" size={18} className="text-fg-muted transition group-hover:text-accent-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-fg">{l(r.ar, r.en)}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{l(r.descAr, r.descEn)}</p>
                <ul className="mt-3.5 space-y-1.5 border-t border-line pt-3.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-[12px] text-fg-soft">
                      <Icon name="check" size={13} className="shrink-0 text-success-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardLink>
            ))}
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-[11.5px] text-fg-muted">
            <Icon name="info" size={13} />
            {l("حسابات تجريبية جاهزة لكل دور — كلمة المرور موضّحة على شاشة الدخول.", "Seeded demo accounts for every role — credentials are shown on the sign-in screen.")}
          </p>
        </div>
      </section>

      {/* secure exams */}
      <section id="exams" className="relative overflow-hidden border-y border-line bg-navy-950 py-16 text-white">
        <div className="pointer-events-none absolute inset-0 app-grid-bg opacity-40" aria-hidden="true" />
        <div className="container-app relative">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-accent-300">
                <Icon name="shield-check" size={13} /> {l("وحدة الاختبارات الآمنة", "Secure examination engine")}
              </p>
              <h2 className="text-[clamp(1.6rem,3vw,2.35rem)] font-semibold leading-tight">
                {l("المؤقت على الخادم. الإجابات محفوظة. القرار للمراقب.", "Server-side timer. Answers persisted. Decisions are human.")}
              </h2>
              <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-white/65">
                {l(
                  "وضع اختبار مخصص بلا مشتتات، مع رصد أحداث التركيز والخلفية على الخادم، وتجميد الجلسة عند تجاوز الحد، واستئناف لا يتم إلا بقرار موثّق من المراقب — دون أي مراقبة للشاشة أو الكاميرا.",
                  "A distraction-free exam mode that records focus and background events server-side, freezes the session at the threshold, and resumes only on a logged supervisor decision — with no screen or camera surveillance.",
                )}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[l("مؤقت الخادم", "Server timer"), l("ربط الجهاز", "Device binding"), l("ترتيب عشوائي", "Randomisation"), l("سجل أحداث", "Event audit"), l("حفظ فوري", "Instant save")].map((t) => (
                  <span key={t} className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/75">{t}</span>
                ))}
              </div>
              <Link href="/login?role=admin" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-[13px] font-semibold text-navy-900 transition hover:bg-white/90">
                <Icon name="activity" size={15} />
                {l("افتح مركز المراقبة", "Open the control center")}
              </Link>
            </div>

            <ol className="space-y-3">
              {[
                { n: "01", t: l("تحقق من الجهاز", "Device verification"), d: l("ربط المحاولة بجهاز مسجّل، وفحص حالة الشبكة والسياسة قبل البدء.", "Attempt bound to a registered device; network and policy checks before start.") },
                { n: "02", t: l("مؤقت مرجعي واحد", "Single authoritative clock"), d: l("المتبقي = نهاية الجلسة على الخادم − الآن على الخادم. ساعة الجهاز لا تُصدَّق.", "Remaining = server session end − server now. The device clock is never trusted.") },
                { n: "03", t: l("تسجيل الحوادث", "Incident recording"), d: l("حدث + توقيت الخادم + الفئة + الجهاز، مع إبقاء الإجابات المحفوظة.", "Event + server timestamp + category + device, with saved answers preserved.") },
                { n: "04", t: l("قرار المراقب", "Supervisor decision"), d: l("استئناف، وقت إضافي، إعادة تعيين، أو إلغاء — كل إجراء مع سبب مسجّل.", "Resume, extend, reset or cancel — every action with a recorded reason.") },
              ].map((s) => (
                <li key={s.n} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm">
                  <span className="tnum text-[11px] font-semibold text-accent-400">{s.n}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{s.t}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-white/55">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* modules */}
      <section id="modules" className="py-16">
        <div className="container-app">
          <SectionHeading
            kicker={l("الوحدات", "Modules")}
            title={l("ما يشمله المنتج فعلياً داخل هذا النموذج", "What this prototype actually implements")}
            desc={l(
              "كل وحدة أدناه لها شاشات عاملة، بيانات تجريبية متسقة، وصلاحيات تُنفّذ على الخادم.",
              "Every module below ships working screens, consistent demo data and permissions enforced on the server.",
            )}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <div key={m.ar} className="group rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong hover:bg-surface-2">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-accent-400">
                  <Icon name={m.icon} size={17} />
                </span>
                <h3 className="mt-3 text-[13.5px] font-semibold text-fg">{l(m.ar, m.en)}</h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{l(m.dAr, m.dEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* security transparency */}
      <section id="security" className="border-y border-line bg-bg-elevated/40 py-16">
        <div className="container-app">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-500">{l("أمان بلا ادعاءات", "Security without overclaiming")}</p>
              <h2 className="mt-3 text-2xl font-semibold text-fg">{l("ما يمكن ضمانه — وما لا يمكن", "What can be guaranteed — and what cannot")}</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">
                {l(
                  "لا يوجد تطبيق عادي على Android أو iOS يضمن قفلاً كاملاً للجهاز. لذلك نفصل بوضوح بين الأجهزة المُدارة من المؤسسة والأجهزة الشخصية، ونعلن حدود كل منصة بدلاً من الادعاء الكاذب.",
                  "No ordinary Android or iOS app can guarantee full device lockdown. We therefore separate institution-managed devices from personal devices and state platform limits explicitly instead of claiming otherwise.",
                )}
              </p>
              <div className="mt-5 space-y-2">
                <Badge tone="success" icon="shield-check">{l("مسموح: تحقق واضح ومتناسب", "Allowed: transparent, proportionate checks")}</Badge>
                <Badge tone="danger" icon="eye-off">{l("مرفوض: مراقبة خفية للشاشة أو الكاميرا", "Rejected: covert screen or camera monitoring")}</Badge>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-[10.5px] uppercase tracking-wide text-fg-muted">
                    <th className="px-3 py-2.5 text-start font-semibold">{l("القدرة", "Capability")}</th>
                    <th className="px-2 py-2.5 text-center font-semibold">{l("جهاز مُدار", "Managed")}</th>
                    <th className="px-2 py-2.5 text-center font-semibold">{l("جهاز شخصي", "Personal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {SECURITY_MATRIX.map((row) => (
                    <tr key={row.en} className="border-b border-line/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-fg">{l(row.cap, row.en)}</p>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-fg-muted">{l(row.noteAr, row.noteEn)}</p>
                      </td>
                      {[row.managed, row.personal].map((v, i) => (
                        <td key={i} className="px-2 py-2.5 text-center">
                          <span
                            className={cx(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                              v === "full" && "border-success-500/30 bg-success-500/12 text-success-500",
                              v === "partial" && "border-warn-500/30 bg-warn-500/12 text-warn-500",
                              v === "none" && "border-line-strong bg-surface-3 text-fg-muted",
                            )}
                          >
                            <Icon name={v === "full" ? "check" : v === "partial" ? "minus" : "x"} size={9} />
                            {v === "full" ? l("كامل", "Full") : v === "partial" ? l("جزئي", "Partial") : l("لا", "None")}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* architecture */}
      <section id="architecture" className="py-16">
        <div className="container-app">
          <SectionHeading
            kicker={l("المعمارية", "Architecture")}
            title={l("حزمة تقنية مثبتة للمؤسسات", "An institution-grade technology stack")}
            desc={l(
              "الخادم هو مصدر الحقيقة: الدرجات والمؤقت والحضور والصلاحيات. التطبيقات لا تُصدَّق في أي قرار.",
              "The server is the source of truth: grades, timers, attendance and permissions. Clients are never trusted for decisions.",
            )}
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STACK.map((s) => (
              <div key={s.group} className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-muted">{s.group}</p>
                <ul className="mt-3 space-y-1.5">
                  {s.items.map((i) => (
                    <li key={i} className="flex items-center gap-2 text-[12.5px] text-fg-soft">
                      <span className="size-1 rounded-full bg-accent-500" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [l("عزل المستأجرين", "Tenant isolation"), l("مؤسسة في كل صف، وتحقق مزدوج على مستوى الخدمة والاستعلام.", "Institution on every row, with service-level and query-level checks.")],
              [l("قيود المعاملات", "Transactional integrity"), l("تصحيح تلقائي للدرجات داخل معاملة واحدة مع سجل تدقيق.", "Auto-grading inside a single transaction with audit logging.")],
              [l("النسخ الاحتياطي", "Backup & recovery"), l("نسخ PITR، اختبارات استعادة، وتقارير RPO/RTO موثقة.", "PITR backups, restore drills and documented RPO/RTO.")],
            ].map(([t, d]) => (
              <div key={t as string} className="rounded-xl border border-line bg-surface-2/60 p-4">
                <p className="text-[12.5px] font-semibold text-fg">{t}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* docs */}
      <section className="border-t border-line bg-bg-elevated/40 py-16">
        <div className="container-app">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-500">{l("المستندات", "Documentation")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-fg">{l("حزمة التسليم الكاملة", "The complete delivery pack")}</h2>
              <p className="mt-2 max-w-xl text-[13px] text-fg-muted">
                {l("PRD، هندسة المعلومات، الرحلات، الهوية، نظام التصميم، قاعدة البيانات، المعمارية، API، الأمان، الخطة والاختبار.", "PRD, IA, journeys, brand, design system, schema, architecture, API, security, roadmap and testing.")}
              </p>
            </div>
            <Link href="/docs" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-[13px] font-medium text-fg transition hover:bg-surface-2">
              <Icon name="book" size={15} />
              {l("تصفّح المستندات داخل المنصة", "Browse docs in-app")}
            </Link>
          </div>
          <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DELIVERABLES.map(([n, t, d, slug]) => (
              <Link key={slug} href={`/docs/${slug}`} className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5 transition hover:border-line-strong hover:bg-surface-2">
                <span className="tnum text-[10.5px] font-semibold text-fg-muted">{n}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-fg">{t}</span>
                  <span className="block truncate text-[10.5px] text-fg-muted">{t === "API" ? "OpenAPI 3.1" : d}</span>
                </span>
                <Icon name="chevron-left" size={13} className="text-fg-muted transition group-hover:text-accent-400 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line bg-navy-950 py-10 text-white/70">
        <div className="container-app grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={36} variant="gradient" />
              <Wordmark locale={locale} size="sm" />
            </div>
            <p className="mt-3 max-w-sm text-[12px] leading-relaxed text-white/50">
              {l(
                "المهندس — منصة إدارة تعليمية واختبارات آمنة. هذا نموذج أولي وظيفي يعمل ببيانات تجريبية، وليس نسخة إنتاجية.",
                "AL MOHANDES — educational management and secure examinations. This is a functional prototype running on demo data, not a production deployment.",
              )}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-white/40">
              <LogoGlyph className="size-4" /> {l("نظام التصميم v1.0 · رموز تصميم مركزية", "Design system v1.0 · central tokens")}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">{l("الدخول", "Access")}</p>
            <ul className="space-y-2 text-[12.5px] text-white/55">
              {[
                ["/login?role=student", l("تجربة الطالب", "Student app")],
                ["/login?role=teacher", l("تجربة المعلم", "Teacher app")],
                ["/login?role=admin", l("لوحة الإدارة", "Admin dashboard")],
                ["/docs", l("المستندات", "Documentation")],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="transition hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/50">{l("الحالة", "Status")}</p>
            <ul className="space-y-2 text-[12.5px] text-white/55">
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-success-500" /> {l("بيانات تجريبية محمّلة", "Demo dataset loaded")}</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-accent-500" /> {l("مؤقت الخادم مُفعّل", "Server timer active")}</li>
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-warn-500" /> {l("الاستمرارية داخل الجلسة فقط", "Process-lifetime persistence")}</li>
            </ul>
          </div>
        </div>
        <div className="container-app mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-white/35">
          <span>© 2026 AL MOHANDES · المهندس</span>
          <span>{l("صُنع بتركيز على الوضوح العربي والصلاحيات الحقيقية", "Built around Arabic clarity and real server-side permissions")}</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-500">{kicker}</p>
      <h2 className="mt-2.5 text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-tight text-fg">{title}</h2>
      <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">{desc}</p>
    </div>
  );
}
