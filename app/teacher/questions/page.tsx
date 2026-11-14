import { Icon } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { QuestionBank, type BankQuestion } from "@/components/teacher/question-bank";
import { db } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "بنك الأسئلة" };

export default async function TeacherQuestionsPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const { courses, teacher, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const courseIds = new Set(courses.map((c) => c.id));

  const questions: BankQuestion[] = db()
    .questions.filter((q) => courseIds.has(q.courseId))
    .map((q) => ({
      id: q.id,
      courseId: q.courseId,
      courseCode: courses.find((c) => c.id === q.courseId)?.code ?? "",
      type: q.type,
      difficulty: q.difficulty,
      marks: q.marks,
      promptAr: q.promptAr,
      promptEn: q.promptEn,
      options: q.options,
      correct: q.correct,
      tags: q.tags,
      usageCount: q.usageCount,
    }));

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("بنك الأسئلة", "Question bank")}
        subtitle={l(`${questions.length} سؤالاً في ${courses.length} مقررات · إعادة الاستخدام تقلّل زمن الإعداد`, `${questions.length} items across ${courses.length} courses · reuse cuts preparation time`)}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("بنك الأسئلة", "Question bank") }]}
        badge={<span className="font-mono text-[10px] text-fg-muted">{teacher.nameEn}</span>}
      />

      {sp.created && (
        <div className="rounded-lg border border-success-500/30 bg-success-500/[0.08] px-4 py-2.5 text-[12px] text-success-500">
          <Icon name="check-circle" size={14} className="me-1 inline" /> {l("أُضيف السؤال إلى البنك.", "Question added to the bank.")}
        </div>
      )}
      {sp.error && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" />
          {sp.error === "options" ? l("الاختيار من متعدد يحتاج اختيارين على الأقل.", "Multiple choice needs at least two options.") : l("تعذّرت إضافة السؤال — تحقّق من البيانات.", "Could not add the question — check the fields.")}
        </div>
      )}

      <QuestionBank
        questions={questions}
        courses={courses.map((c) => ({ id: c.id, code: c.code, nameAr: c.nameAr, nameEn: c.nameEn }))}
      />

      <p className="text-center text-[9.5px] leading-relaxed text-fg-muted">
        {l(
          "الأسئلة المستخدمة في اختبار جارٍ لا يمكن حذفها. كل تعديل يُحفظ بنسخة (versioning) لأغراض التدقيق.",
          "Items used in a live examination cannot be deleted. Every edit is versioned for audit.",
        )}
      </p>
    </div>
  );
}
