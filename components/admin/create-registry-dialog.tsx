"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createStudentAction, createTeacherAction, type RegistryState } from "@/app/actions/admin";
import { Alert, Badge, Button, Field, Icon, Input, Modal, Select } from "@/components/ui";
import { usePrefs } from "@/components/providers";

type Dept = { id: string; nameAr: string; nameEn: string };
type Course = { id: string; code: string; nameAr: string; nameEn: string };

function Submit({ labelAr, labelEn }: { labelAr: string; labelEn: string }) {
  const { pending } = useFormStatus();
  const { l } = usePrefs();
  return (
    <Button type="submit" disabled={pending} icon={pending ? "refresh" : "plus"}>
      {pending ? l("جارٍ الحفظ…", "Saving…") : l(labelAr, labelEn)}
    </Button>
  );
}

function Created({ state }: { state: RegistryState }) {
  const { l } = usePrefs();
  if (!state.ok) return null;
  return (
    <Alert tone="success" title={l("تم إنشاء الحساب وتفعيله", "Account created and active")} icon="check-circle">
      <div className="mt-1 space-y-1 text-[11.5px]">
        <p>
          {l("المعرّف", "Identifier")}: <span className="font-mono" dir="ltr">{state.ok.number}</span>
        </p>
        <p>
          {l("البريد المؤسسي", "Institutional e-mail")}: <span className="font-mono" dir="ltr">{state.ok.email}</span>
        </p>
        <p>
          {l("كلمة المرور المؤقتة", "Temporary password")}: <span className="font-mono" dir="ltr">{state.ok.password}</span>
        </p>
        <p className="text-fg-muted">
          {l(
            "سلّم البيانات للمستخدم واطلب تغييرها من صفحة الأمان عند أول دخول.",
            "Hand these over and ask the user to change the password from the security page on first sign-in.",
          )}
        </p>
      </div>
    </Alert>
  );
}

export function CreateStudentButton({ departments }: { departments: Dept[] }) {
  const { l } = usePrefs();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<RegistryState, FormData>(createStudentAction, {});

  return (
    <>
      <Button onClick={() => setOpen(true)} icon="plus" size="sm">
        {l("إضافة طالب", "Add student")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={l("إضافة طالب جديد", "Add a new student")}
        description={l(
          "يُنشأ سجل أكاديمي وحساب دخول فعلي — لا بيانات وهمية.",
          "Creates a real academic record and a working sign-in account.",
        )}
        size="lg"
      >
        {state.ok ? (
          <div className="space-y-3">
            <Created state={state} />
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {l("تم", "Done")}
              </Button>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            {state.error && <Alert tone="danger" title={state.error} icon="alert-circle">{l("لم يُنشأ الحساب.", "The account was not created.")}</Alert>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={l("الاسم بالعربية", "Name (Arabic)")} required>
                <Input name="nameAr" required minLength={3} placeholder="مثال: مريم سعيد" />
              </Field>
              <Field label={l("الاسم بالإنجليزية", "Name (English)")} required>
                <Input name="nameEn" required minLength={3} dir="ltr" placeholder="Mariam Said" />
              </Field>
              <Field label={l("القسم", "Department")} required>
                <Select name="departmentId" required defaultValue={departments[0]?.id ?? ""}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {l(d.nameAr, d.nameEn)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={l("المستوى", "Level")} required>
                <Select name="level" defaultValue="1">
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {l(`المستوى ${n}`, `Level ${n}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={l("الهاتف (اختياري)", "Phone (optional)")} hint={l("11 رقماً", "11 digits")}>
                <Input name="phone" dir="ltr" inputMode="tel" placeholder="01012345678" />
              </Field>
              <Field label={l("الرقم القومي (اختياري)", "National ID (optional)")} hint={l("يُخزَّن مُقنَّعاً", "Stored masked")}>
                <Input name="nationalId" dir="ltr" inputMode="numeric" maxLength={14} placeholder="3xxxxxxxxxxxxx" />
              </Field>
            </div>

            <p className="flex items-start gap-1.5 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2 text-[10.5px] leading-relaxed text-fg-muted">
              <Icon name="info" size={12} className="mt-0.5 shrink-0" />
              {l(
                "يُولَّد الرقم الأكاديمي والبريد تلقائياً، ويُسجَّل الطالب في مقررات قسمه ومستواه، ويُضاف الحساب إلى سجل التدقيق.",
                "The student number and e-mail are generated automatically, the student is enrolled in their department/level courses, and the creation is written to the audit log.",
              )}
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {l("إلغاء", "Cancel")}
              </Button>
              <Submit labelAr="إنشاء الطالب" labelEn="Create student" />
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export function CreateTeacherButton({ departments, courses }: { departments: Dept[]; courses: Course[] }) {
  const { l } = usePrefs();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<RegistryState, FormData>(createTeacherAction, {});

  return (
    <>
      <Button onClick={() => setOpen(true)} icon="plus" size="sm">
        {l("إضافة عضو هيئة تدريس", "Add teacher")}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={l("إضافة عضو هيئة تدريس", "Add a teacher")}
        description={l("حساب فعلي بصلاحيات المعلم وقرارات التدقيق.", "A real account with teacher permissions and audit trail.")}
        size="lg"
      >
        {state.ok ? (
          <div className="space-y-3">
            <Created state={state} />
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {l("تم", "Done")}
              </Button>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-3">
            {state.error && <Alert tone="danger" title={state.error} icon="alert-circle">{l("لم يُنشأ الحساب.", "The account was not created.")}</Alert>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={l("الاسم بالعربية", "Name (Arabic)")} required>
                <Input name="nameAr" required minLength={3} placeholder="د. هبة كمال" />
              </Field>
              <Field label={l("الاسم بالإنجليزية", "Name (English)")} required>
                <Input name="nameEn" required minLength={3} dir="ltr" placeholder="Dr. Heba Kamal" />
              </Field>
              <Field label={l("المسمى الوظيفي", "Title")}>
                <Input name="title" placeholder={l("أستاذ مساعد", "Assistant professor")} />
              </Field>
              <Field label={l("القسم", "Department")} required>
                <Select name="departmentId" required defaultValue={departments[0]?.id ?? ""}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {l(d.nameAr, d.nameEn)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={l("البريد المؤسسي", "Institutional e-mail")} required hint="@almohandes.edu">
                <Input name="email" type="email" required dir="ltr" placeholder="heba.kamal@almohandes.edu" />
              </Field>
            </div>

            <Field label={l("المقررات المسندة (اختياري)", "Assigned courses (optional)")} hint={l("يمكن التعديل لاحقاً من المقررات", "Can be changed later from courses")}>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-bg-elevated p-2">
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-[11.5px] text-fg-soft hover:bg-surface-2">
                    <input type="checkbox" name="courseIds" value={c.id} className="size-3.5 accent-[var(--brand-500)]" />
                    <span className="font-mono text-[10px] text-fg-muted" dir="ltr">{c.code}</span>
                    <span className="truncate">{l(c.nameAr, c.nameEn)}</span>
                  </label>
                ))}
              </div>
            </Field>

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {l("إلغاء", "Cancel")}
              </Button>
              <Submit labelAr="إنشاء الحساب" labelEn="Create account" />
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

export function CreatedBadge({ number }: { number: string }) {
  return <Badge tone="success">{number}</Badge>;
}
