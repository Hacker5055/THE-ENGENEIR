"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Icon, Input, Modal, SearchInput, Select, Textarea } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import { createQuestion } from "@/app/actions/teacher";
import { cx } from "@/lib/utils";

export interface BankQuestion {
  id: string;
  courseId: string;
  courseCode: string;
  type: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
  promptAr: string;
  promptEn: string;
  options: { id: string; textAr: string; textEn: string }[];
  correct: string[];
  tags: string[];
  usageCount: number;
}

const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  MCQ: { ar: "اختيار من متعدد", en: "Multiple choice" },
  TRUE_FALSE: { ar: "صح / خطأ", en: "True / false" },
  ESSAY: { ar: "مقالي", en: "Essay" },
  FILL_BLANK: { ar: "إكمال", en: "Fill in the blank" },
  MATCHING: { ar: "مطابقة", en: "Matching" },
  IMAGE: { ar: "صورة", en: "Image based" },
  FILE: { ar: "رفع ملف", en: "File upload" },
};

export function QuestionBank({ questions, courses }: { questions: BankQuestion[]; courses: { id: string; code: string; nameAr: string; nameEn: string }[] }) {
  const { l } = usePrefs();
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [difficulty, setDifficulty] = useState("ALL");
  const [course, setCourse] = useState("ALL");
  const [open, setOpen] = useState(false);
  const [newType, setNewType] = useState("MCQ");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return questions.filter((x) => {
      if (type !== "ALL" && x.type !== type) return false;
      if (difficulty !== "ALL" && x.difficulty !== difficulty) return false;
      if (course !== "ALL" && x.courseId !== course) return false;
      if (!needle) return true;
      return x.promptAr.toLowerCase().includes(needle) || x.promptEn.toLowerCase().includes(needle) || x.tags.some((t) => t.toLowerCase().includes(needle));
    });
  }, [questions, q, type, difficulty, course]);

  const counts = {
    mcq: questions.filter((x) => x.type === "MCQ").length,
    essay: questions.filter((x) => x.type === "ESSAY").length,
    hard: questions.filter((x) => x.difficulty === "HARD").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: l("أسئلة موضوعية", "Objective items"), value: counts.mcq, tone: "text-brand-400" },
          { label: l("أسئلة مقالية", "Essay items"), value: counts.essay, tone: "text-accent-400" },
          { label: l("أسئلة صعبة", "Hard items"), value: counts.hard, tone: "text-danger-500" },
        ].map((s) => (
          <Card key={s.label} className="flex items-center justify-between">
            <span className="text-[11.5px] text-fg-muted">{s.label}</span>
            <span className={cx("tnum text-[19px] font-semibold", s.tone)}>{s.value}</span>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder={l("ابحث في نص السؤال أو الوسم…", "Search prompt or tag…")} className="h-9 w-full max-w-[260px]" />
          <Select value={course} onChange={(e) => setCourse(e.target.value)} className="h-9 w-auto">
            <option value="ALL">{l("كل المقررات", "All courses")}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-auto">
            <option value="ALL">{l("كل الأنواع", "All types")}</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{l(v.ar, v.en)}</option>)}
          </Select>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="h-9 w-auto">
            <option value="ALL">{l("كل الصعوبات", "Any difficulty")}</option>
            <option value="EASY">{l("سهل", "Easy")}</option>
            <option value="MEDIUM">{l("متوسط", "Medium")}</option>
            <option value="HARD">{l("صعب", "Hard")}</option>
          </Select>
          <span className="text-[11px] text-fg-muted">{list.length} {l("سؤالاً", "items")}</span>
          <Button size="sm" className="ms-auto" onClick={() => setOpen(true)}>
            <Icon name="plus" size={14} /> {l("سؤال جديد", "New question")}
          </Button>
        </div>

        {list.length === 0 ? (
          <EmptyState icon="layers" title={l("لا أسئلة مطابقة", "No matching items")} description={l("جرّب تعديل عوامل التصفية أو أضف سؤالاً.", "Adjust the filters or add a new item.")} />
        ) : (
          <div className="space-y-2">
            {list.map((x) => (
              <div key={x.id} className="rounded-xl border border-line bg-surface-2/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug text-fg">{l(x.promptAr, x.promptEn)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9.5px] text-fg-muted">
                      <Badge tone="neutral">{l(TYPE_LABEL[x.type]?.ar ?? x.type, TYPE_LABEL[x.type]?.en ?? x.type)}</Badge>
                      <span className="font-mono">{x.courseCode}</span>
                      <span className={x.difficulty === "HARD" ? "text-danger-500" : x.difficulty === "EASY" ? "text-success-500" : "text-warn-500"}>
                        {x.difficulty === "HARD" ? l("صعب", "Hard") : x.difficulty === "EASY" ? l("سهل", "Easy") : l("متوسط", "Medium")}
                      </span>
                      <span>· {x.marks} {l("درجة", "marks")}</span>
                      <span>· {l("استُخدم", "used")} {x.usageCount}×</span>
                      {x.tags.slice(0, 2).map((t) => <span key={t} className="rounded bg-surface-3 px-1.5 py-0.5">#{t}</span>)}
                    </div>
                  </div>
                  <button type="button" className="grid h-7 w-7 place-items-center rounded-md border border-line-strong bg-surface text-fg-muted transition hover:text-fg" aria-label={l("خيارات", "Options")}>
                    <Icon name="more-vertical" size={13} />
                  </button>
                </div>
                {x.options.length > 0 && (
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {x.options.map((o) => (
                      <li key={o.id} className={cx("flex items-start gap-1.5 rounded-md px-1.5 py-1 text-[10.5px]", x.correct.includes(o.id) ? "bg-success-500/[0.08] text-success-500" : "text-fg-muted")}>
                        <Icon name={x.correct.includes(o.id) ? "check-circle" : "minus"} size={11} className="mt-0.5 shrink-0" />
                        {l(o.textAr, o.textEn)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={l("سؤال جديد", "New question")} description={l("يُضاف إلى بنك أسئلة المقرر فوراً", "Added to the course bank immediately")}>
        <form action={createQuestion} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={l("المقرر", "Course")} required>
              <Select name="courseId" required defaultValue={courses[0]?.id}>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {l(c.nameAr, c.nameEn)}</option>)}
              </Select>
            </Field>
            <Field label={l("النوع", "Type")} required>
              <Select name="type" value={newType} onChange={(e) => setNewType(e.target.value)}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{l(v.ar, v.en)}</option>)}
              </Select>
            </Field>
          </div>
          <Field label={l("نص السؤال", "Prompt")} required>
            <Textarea name="promptAr" rows={2} required placeholder={l("اكتب نص السؤال…", "Write the prompt…")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={l("الدرجة", "Marks")}>
              <Input name="marks" type="number" min={0.5} step={0.5} defaultValue={1} />
            </Field>
            <Field label={l("الصعوبة", "Difficulty")}>
              <Select name="difficulty" defaultValue="MEDIUM">
                <option value="EASY">{l("سهل", "Easy")}</option>
                <option value="MEDIUM">{l("متوسط", "Medium")}</option>
                <option value="HARD">{l("صعب", "Hard")}</option>
              </Select>
            </Field>
            <Field label={l("الوسوم", "Tags")}>
              <Input name="tags" placeholder="graphs, complexity" dir="ltr" />
            </Field>
          </div>

          {newType === "MCQ" && (
            <div className="rounded-lg border border-line bg-surface-2/50 p-2.5">
              <p className="mb-1.5 text-[10.5px] font-semibold text-fg-soft">{l("الاختيارات (حدد الصحيح)", "Options (mark the correct one)")}</p>
              <div className="space-y-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" value={i} defaultChecked={i === 0} className="h-3.5 w-3.5 accent-[#2864D9]" aria-label={l("الصحيح", "Correct")} />
                    <Input name={`option${i}`} placeholder={`${l("الاختيار", "Option")} ${i + 1}`} className="h-8 text-[11px]" required={i < 2} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {(newType === "FILL_BLANK" || newType === "TRUE_FALSE") && (
            <Field label={l("الإجابة الصحيحة", "Correct answer")} hint={l("افصل بين البدائل بـ |", "Separate alternates with |")}>
              <Input name="correctText" placeholder={newType === "TRUE_FALSE" ? "true" : "O(n log n)"} dir="ltr" />
            </Field>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{l("إلغاء", "Cancel")}</Button>
            <Button type="submit" size="sm"><Icon name="check" size={14} /> {l("إضافة السؤال", "Add question")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
