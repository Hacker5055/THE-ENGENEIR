import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { Icon } from "@/components/icons";
import { PrefToggles } from "@/components/pref-toggles";
import { getPrefs } from "@/lib/prefs";
import { tx } from "@/lib/utils";
import { db } from "@/lib/server/store";

export const metadata = {
  title: "المنهج وكتب الوزارة — زياد الشافعي",
  description:
    "منهج البرمجة وعلوم الحاسب للصفوف الأول والثاني والثالث الثانوي — نظام البكالوريا المصرية، مع روابط كتب وزارة التربية والتعليم الرسمية.",
};

export const dynamic = "force-dynamic";

interface GradeView {
  key: string;
  ar: string;
  en: string;
  courseId: string;
  units: { ar: string; en: string }[];
  noteAr?: string;
  noteEn?: string;
}

const GRADES: GradeView[] = [
  {
    key: "g10",
    ar: "الصف الأول الثانوي",
    en: "First secondary",
    courseId: "crs_cs301",
    noteAr: "الكتاب الرسمي: «البرمجة والذكاء الاصطناعي» — 13 وحدة، مع تدريب عملي على JavaScript عبر منصة Qureo اليابانية (الدخول من منصة الشهادات العامة).",
    noteEn: "Official book: «Programming & Artificial Intelligence» — 13 units, with hands-on JavaScript on the Japanese Qureo platform.",
    units: [
      { ar: "المعلومات والوسائط", en: "Information and media" },
      { ar: "أخلاقيات المعلومات والقوانين الرقمية", en: "Information ethics and digital law" },
      { ar: "أمن المعلومات والتشفير", en: "Information security and encryption" },
      { ar: "تكنولوجيا المعلومات والمجتمع", en: "IT and society" },
      { ar: "الاتصالات والإنترنت", en: "Communications and the internet" },
      { ar: "التناظري والرقمي والنظام الثنائي", en: "Analog, digital and binary" },
      { ar: "النظام السادس عشر والعمليات الحسابية", en: "Hexadecimal and binary arithmetic" },
      { ar: "تمثيل النصوص والصور والصوت والفيديو", en: "Representing text, images, sound and video" },
      { ar: "مكونات الحاسب والدوائر المنطقية", en: "Computer components and logic circuits" },
      { ar: "الشبكات وعناوين IP وبروتوكولات الاتصال", en: "Networks, IP addressing and protocols" },
      { ar: "قواعد البيانات وتحليل البيانات", en: "Databases and data analysis" },
      { ar: "المحاكاة والنمذجة", en: "Simulation and modelling" },
      { ar: "الخوارزميات والبرمجة التطبيقية", en: "Algorithms and applied programming" },
    ],
  },
  {
    key: "g11",
    ar: "الصف الثاني الثانوي",
    en: "Second secondary",
    courseId: "crs_cs302",
    noteAr: "الكتاب الرسمي: «البرمجة والذكاء الاصطناعي» للصف الثاني الثانوي بكالوريا — جزءان (ترم أول وترم ثاني) في مسار الهندسة وعلوم الحاسب.",
    noteEn: "Official book: «Programming & AI» for second-secondary Baccalaureate — two parts (term 1 & 2), engineering & computer-science track.",
    units: [
      { ar: "الذكاء الاصطناعي وأخلاقياته", en: "Artificial intelligence and ethics" },
      { ar: "التعلم الآلي وتطبيقاته", en: "Machine learning and its applications" },
      { ar: "الأمن السيبراني والتشفير", en: "Cybersecurity and encryption" },
      { ar: "تصميم وبناء تطبيقات الويب (HTML/CSS/JS)", en: "Web application design and build" },
      { ar: "قواعد البيانات والبرمجة من جهة الخادم", en: "Databases and server-side programming" },
      { ar: "تجربة المستخدم وتصميم الوسائط", en: "User experience and media design" },
      { ar: "مشروع تطبيقي متكامل", en: "Integrated project" },
    ],
  },
  {
    key: "g12",
    ar: "الصف الثالث الثانوي",
    en: "Third secondary",
    courseId: "crs_cs303",
    noteAr: "محتوى الصف الثالث يُحدَّث وفق الكتاب الرسمي فور نشره على مكتبة الوزارة؛ الأولوية في المنصة لمشروعات البرمجة والمراجعة النهائية.",
    noteEn: "Third-secondary content is updated as soon as the official book is published; the platform focuses on project work and final revision.",
    units: [
      { ar: "مراجعة أسس البرمجة وJavaScript", en: "JavaScript and programming foundations" },
      { ar: "هياكل البيانات والخوارزميات", en: "Data structures and algorithms" },
      { ar: "البرمجة كائنية التوجه (OOP)", en: "Object-oriented programming" },
      { ar: "قواعد البيانات وSQL", en: "Databases and SQL" },
      { ar: "تطبيقات الويب الحديثة وAPIs", en: "Modern web apps and APIs" },
      { ar: "الذكاء الاصطناعي التطبيقي", en: "Applied artificial intelligence" },
      { ar: "مشروع التخرج والمراجعة النهائية", en: "Capstone project and final revision" },
    ],
  },
];

const SOURCES = [
  {
    ar: "وزارة التربية والتعليم والتعليم الفني — المكتبة الإلكترونية",
    en: "Ministry of Education — official e-library",
    href: "https://moe.gov.eg",
    noteAr: "الكتب المدرسية الرسمية بصيغة PDF لكل الصفوف والمواد.",
    noteEn: "Official school books as PDF for every grade and subject.",
  },
  {
    ar: "منصة الشهادات العامة (الدخول إلى Qureo)",
    en: "General certificates platform (Qureo access)",
    href: "https://moe-register.emis.gov.eg/",
    noteAr: "بيانات الدخول إلى منصة Qureo اليابانية لتدريب البرمجة — لطلاب الصف الأول الثانوي.",
    noteEn: "Credentials for the Japanese Qureo programming platform — first-secondary students.",
  },
];

export default async function CurriculumPage() {
  const { locale } = await getPrefs();
  // Lesson titles come from the live database when it is seeded (demo/training);
  // a production instance that is not configured yet still gets the public
  // curriculum outline instead of an error page.
  let lessons: { courseId: string; titleAr: string }[] = [];
  try {
    lessons = db().lectureNotes.map((l) => ({ courseId: l.courseId, titleAr: l.titleAr }));
  } catch {
    lessons = [];
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <Wordmark locale={locale} size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <PrefToggles compact />
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-lg bg-emerald-500 px-3.5 text-[12px] font-semibold text-black transition hover:bg-emerald-400"
            >
              {tx(locale, "دخول", "Login")}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">
          {tx(locale, "المنهج وكتب الوزارة", "Curriculum & ministry books")}
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-fg-muted">
          {tx(
            locale,
            "محتوى المقررات يتبع مناهج وزارة التربية والتعليم المصرية لنظام البكالوريا. الكتب الرسمية تُحمَّل من مكتبة الوزارة، والمنصة تضيف الشرح والتدريبات والاختبارات.",
            "Course content follows the Egyptian Ministry of Education Baccalaureate curricula. Official books are downloaded from the ministry library; this platform adds explanations, practice and exams.",
          )}
        </p>

        <div className="mt-8 space-y-6">
          {GRADES.map((grade) => {
            const gradeLessons = lessons.filter((lesson) => lesson.courseId === grade.courseId);
            return (
              <section
                key={grade.key}
                id={grade.key}
                className="scroll-mt-24 rounded-2xl border border-line bg-surface/70 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[17px] font-semibold text-fg">{tx(locale, grade.ar, grade.en)}</h2>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                    {tx(locale, "البرمجة وعلوم الحاسب", "Programming & CS")}
                  </span>
                </div>

                {(grade.noteAr || grade.noteEn) && (
                  <p className="mt-2 rounded-xl border border-line bg-bg/60 p-3 text-[12px] leading-relaxed text-fg-muted">
                    <Icon name="info" size={12} className="me-1 inline text-emerald-400" />
                    {tx(locale, grade.noteAr ?? "", grade.noteEn ?? "")}
                  </p>
                )}

                <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
                  {(gradeLessons.length ? gradeLessons.map((l) => ({ ar: l.titleAr, en: l.titleAr })) : grade.units).map(
                    (unit, index) => (
                      <li
                        key={`${grade.key}-${index}`}
                        className="flex items-start gap-2 rounded-lg border border-line/70 bg-bg/40 px-3 py-2 text-[12px] text-fg-soft"
                      >
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded bg-emerald-500/15 text-[9.5px] font-semibold text-emerald-300">
                          {index + 1}
                        </span>
                        <span>{tx(locale, unit.ar, unit.en)}</span>
                      </li>
                    ),
                  )}
                </ol>
              </section>
            );
          })}
        </div>

        <section className="mt-10">
          <h2 className="text-[17px] font-semibold text-fg">{tx(locale, "مصادر رسمية", "Official sources")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOURCES.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer noopener"
                className="group rounded-xl border border-line bg-surface/60 p-4 transition hover:border-emerald-500/40 hover:bg-surface-2/70"
              >
                <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
                  <Icon name="book" size={14} className="text-emerald-400" />
                  {tx(locale, source.ar, source.en)}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-muted">{tx(locale, source.noteAr, source.noteEn)}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-emerald-400" dir="ltr">
                  {source.href}
                  <Icon name="arrow-up-right" size={11} />
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-fg-muted">
            {tx(
              locale,
              "ملاحظة: روابط الوزارة قد تتغير مع كل عام دراسي. لو لم يعمل رابط، ابحث في مكتبة الوزارة الإلكترونية عن «البرمجة والذكاء الاصطناعي» للصف المطلوب.",
              "Note: ministry links can change every academic year. If a link stops working, search the ministry e-library for «Programming & AI» for the required grade.",
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
