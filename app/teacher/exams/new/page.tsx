import Link from "next/link";
import { Icon } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { ExamComposer } from "@/components/teacher/exam-composer";
import { db } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "اختبار جديد" };

export default async function NewExamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const courseIds = new Set(courses.map((c) => c.id));
  const questions = db()
    .questions.filter((q) => courseIds.has(q.courseId))
    .map((q) => ({
      id: q.id,
      courseId: q.courseId,
      type: q.type,
      difficulty: q.difficulty,
      marks: q.marks,
      promptAr: q.promptAr,
      promptEn: q.promptEn,
    }));

  const errorText =
    sp.error === "questions"
      ? l("اختر سؤالاً واحداً على الأقل.", "Select at least one question.")
      : sp.error === "title"
        ? l("العنوان قصير جداً.", "The title is too short.")
        : sp.error
          ? l("تعذّر إنشاء الاختبار — تحقّق من المقرر.", "Could not create the examination — check the course.")
          : null;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("اختبار جديد", "New examination")}
        subtitle={l("اختر الأسئلة، اضبط السياسة، ثم جدول الاختبار", "Pick items, set the policy, then schedule")}
        breadcrumb={[{ label: l("الاختبارات", "Examinations"), href: "/teacher/exams" }, { label: l("جديد", "New") }]}
        actions={
          <Link href="/teacher/exams" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
            <Icon name="arrow-right" size={14} className="rtl:rotate-180" /> {l("رجوع", "Back")}
          </Link>
        }
      />

      {errorText && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" /> {errorText}
        </div>
      )}

      <ExamComposer courses={courses.map((c) => ({ id: c.id, code: c.code, nameAr: c.nameAr, nameEn: c.nameEn }))} questions={questions} />

      <p className="text-center text-[9.5px] text-fg-muted">
        {l(
          `المعلم: ${teacher.nameAr} · تُسجَّل كل تعديلات الاختبار في سجل التدقيق.`,
          `Teacher: ${teacher.nameEn} · every examination change is written to the audit log.`,
        )}
      </p>
    </div>
  );
}
