"use client";

import { useMemo, useState } from "react";
import { Badge, Card, CardHeader, Checkbox, Field, Icon, Input, Select, Switch, Textarea } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import { createExamination } from "@/app/actions/teacher";
import { cx } from "@/lib/utils";

interface CourseOption { id: string; code: string; nameAr: string; nameEn: string }
interface QuestionOption { id: string; courseId: string; type: string; difficulty: string; marks: number; promptAr: string; promptEn: string }

export function ExamComposer({ courses, questions }: { courses: CourseOption[]; questions: QuestionOption[] }) {
  const { l } = usePrefs();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [policy, setPolicy] = useState<"STANDARD" | "STRICT" | "LOCKDOWN">("STRICT");
  const [filter, setFilter] = useState("");

  const pool = useMemo(
    () => questions.filter((q) => q.courseId === courseId && (!filter || q.promptAr.includes(filter) || q.promptEn.toLowerCase().includes(filter.toLowerCase()))),
    [questions, courseId, filter],
  );
  const chosen = questions.filter((q) => selected.includes(q.id));
  const total = chosen.reduce((a, q) => a + q.marks, 0);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form action={createExamination} className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title={l("بيانات الاختبار", "Examination details")} icon="file-text" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={l("المقرر", "Course")} required>
              <Select
                name="courseId"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setSelected([]);
                }}
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {l(c.nameAr, c.nameEn)}</option>
                ))}
              </Select>
            </Field>
            <Field label={l("نوع التقييم", "Assessment type")} hint={l("يُعرض للطالب في التطبيق", "Shown in the student app")}>
              <Select name="kind" defaultValue="MIDTERM">
                <option value="QUIZ">{l("اختبار قصير", "Quiz")}</option>
                <option value="MIDTERM">{l("نصفي", "Midterm")}</option>
                <option value="FINAL">{l("نهائي", "Final")}</option>
                <option value="PRACTICAL">{l("عملي", "Practical")}</option>
              </Select>
            </Field>
            <Field label={l("العنوان (عربي)", "Title (Arabic)")} required className="sm:col-span-2">
              <Input name="titleAr" placeholder={l("مثال: اختبار منتصف الفصل — الخوارزميات", "e.g. Midterm — Algorithms")} required minLength={4} />
            </Field>
            <Field label={l("العنوان (إنجليزي)", "Title (English)")} className="sm:col-span-2">
              <Input name="titleEn" placeholder="Midterm — Algorithms" dir="ltr" />
            </Field>
            <Field label={l("المدة (دقيقة)", "Duration (min)")} required>
              <Input name="durationMin" type="number" min={5} max={240} defaultValue={60} required />
            </Field>
            <Field label={l("بداية النافذة", "Window opens")} hint={l("بعد 24 ساعة افتراضياً", "Defaults to +24h")}>
              <Input name="startsAt" type="datetime-local" />
            </Field>
            <Field label={l("المحاولات المسموحة", "Allowed attempts")}>
              <Select name="allowedAttempts" defaultValue="1">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </Select>
            </Field>
            <Field label={l("تعليمات إضافية", "Extra instructions")} className="sm:col-span-2">
              <Textarea name="instructions" rows={2} placeholder={l("تظهر للطالب قبل البدء…", "Shown before start…")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={l("بنك الأسئلة", "Question picker")}
            subtitle={l("اختر الأسئلة من مقرر الاختبار", "Pick items from the selected course")}
            icon="layers"
            action={<Badge tone={selected.length ? "brand" : "neutral"}>{selected.length} {l("محدد", "selected")}</Badge>}
          />
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={l("ابحث في نص السؤال…", "Filter question text…")} className="h-8 max-w-[260px] text-[11px]" />
            <span className="text-[10.5px] text-fg-muted">{pool.length} {l("سؤالاً متاحاً", "items available")}</span>
            <button type="button" onClick={() => setSelected(pool.slice(0, 5).map((q) => q.id))} className="ms-auto text-[10.5px] font-semibold text-brand-500 hover:underline">
              {l("تحديد أول 5", "Select first 5")}
            </button>
            {selected.length > 0 && (
              <button type="button" onClick={() => setSelected([])} className="text-[10.5px] text-fg-muted hover:text-fg">{l("مسح", "Clear")}</button>
            )}
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto pe-1">
            {pool.map((q) => {
              const on = selected.includes(q.id);
              return (
                <label
                  key={q.id}
                  className={cx(
                    "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition",
                    on ? "border-brand-500/50 bg-brand-500/[0.07]" : "border-line bg-surface-2/40 hover:border-line-strong",
                  )}
                >
                  <input type="checkbox" name="questionId" value={q.id} checked={on} onChange={() => toggle(q.id)} className="mt-0.5 h-3.5 w-3.5 accent-[#2864D9]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-fg">{l(q.promptAr, q.promptEn)}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-fg-muted">
                      <span className="font-mono">{q.type}</span> · {q.difficulty} · {q.marks} {l("درجة", "marks")}
                    </span>
                  </span>
                </label>
              );
            })}
            {pool.length === 0 && <p className="py-6 text-center text-[11px] text-fg-muted">{l("لا أسئلة لهذا المقرر — أضفها من بنك الأسئلة.", "No items for this course — add them in the question bank.")}</p>}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title={l("سياسة الأمان", "Security policy")} icon="shield-check" />
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: "STANDARD", t: l("قياسي", "Standard"), d: l("تسجيل الأحداث", "Log events") },
              { key: "STRICT", t: l("صارم", "Strict"), d: l("تحذير + إخطار", "Warn + notify") },
              { key: "LOCKDOWN", t: l("مقيّد", "Lockdown"), d: l("تجميد تلقائي", "Auto freeze") },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPolicy(p.key as typeof policy)}
                className={cx(
                  "rounded-lg border px-2 py-2 text-center transition",
                  policy === p.key ? "border-brand-500/50 bg-brand-500/10" : "border-line bg-surface-2/40 hover:border-line-strong",
                )}
              >
                <span className={cx("block text-[11px] font-semibold", policy === p.key ? "text-brand-400" : "text-fg-soft")}>{p.t}</span>
                <span className="mt-0.5 block text-[8.5px] leading-tight text-fg-muted">{p.d}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="policy" value={policy} />

          <div className="mt-3 space-y-2.5">
            <label className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-fg-soft">{l("حد الحوادث قبل التجميد", "Max violations")}</span>
              <Input name="maxViolations" type="number" min={1} max={10} defaultValue={3} className="h-8 w-16 text-center" />
            </label>
            <CheckRow name="randomizeQuestions" label={l("خلط ترتيب الأسئلة", "Shuffle questions")} defaultChecked />
            <CheckRow name="randomizeOptions" label={l("خلط الاختيارات", "Shuffle options")} defaultChecked />
            <CheckRow name="lockOnViolation" label={l("تجميد المحاولة عند التجاوز", "Freeze on breach")} defaultChecked={policy !== "STANDARD"} />
            <CheckRow name="geoRequired" label={l("اشتراط الموقع الجغرافي", "Require geofence")} defaultChecked={policy === "LOCKDOWN"} />
            <CheckRow name="autoGrade" label={l("تصحيح آلي للأسئلة الموضوعية", "Auto-grade objective items")} defaultChecked />
          </div>
          <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2 text-[9.5px] leading-relaxed text-fg-muted">
            <Icon name="info" size={11} className="me-1 inline" />
            {l(
              "التجميد يوقف الإرسال فقط ويحوّل المحاولة لمراجعة بشرية — لا يُلغى الاختبار آلياً.",
              "A freeze only halts submission and routes the attempt to human review — it never voids an examination automatically.",
            )}
          </p>
        </Card>

        <Card>
          <CardHeader title={l("الملخص", "Summary")} icon="clipboard" />
          <div className="space-y-2">
            <Row label={l("الأسئلة المحددة", "Selected items")} value={selected.length} />
            <Row label={l("الدرجة الكلية", "Total marks")} value={total} strong />
            <Row label={l("درجة النجاح", "Pass mark")} value={Math.round(total * 0.5)} />
            <Row label={l("السياسة", "Policy")} value={policy === "LOCKDOWN" ? l("مقيّد", "Lockdown") : policy === "STRICT" ? l("صارم", "Strict") : l("قياسي", "Standard")} />
          </div>
          <button
            type="submit"
            className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-[12.5px] font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            disabled={selected.length === 0}
          >
            <Icon name="check-circle" size={15} /> {l("جدولة الاختبار", "Schedule examination")}
          </button>
          <p className="mt-2 text-center text-[9px] text-fg-muted">
            {l("يمكن تعديل كل الإعدادات قبل النشر.", "All settings remain editable before publishing.")}
          </p>
        </Card>
      </div>
    </form>
  );
}

function CheckRow({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-surface-2/60 px-2.5 py-2">
      <span className="text-[11px] text-fg-soft">{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-3.5 w-3.5 accent-[#2864D9]" />
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-fg-muted">{label}</span>
      <span className={strong ? "tnum text-[13px] font-semibold text-fg" : "tnum text-fg-soft"}>{value}</span>
    </div>
  );
}
