import Link from "next/link";
import { Badge, Card, CardHeader, Icon, Progress, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db, findCourse } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { publishCourseGrades, saveGrade } from "@/app/actions/teacher";
import { makeL } from "@/lib/utils";

export const metadata = { title: "إدارة الدرجات" };

export default async function TeacherGradesPage({ searchParams }: { searchParams: Promise<{ course?: string; error?: string }> }) {
  const { teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const selectedId = sp.course && courses.some((c) => c.id === sp.course) ? sp.course : courses[0]?.id ?? "";
  const course = findCourse(selectedId);
  const students = db().students.filter((s) => s.sectionId === course?.sectionId);
  const grades = db().grades.filter((g) => g.courseId === selectedId);
  const published = grades.filter((g) => g.published).length;
  const avg = grades.length ? Math.round(grades.reduce((a, g) => a + g.total, 0) / grades.length) : 0;
  const ungraded = students.length - grades.length;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("إدارة الدرجات", "Grade management")}
        subtitle={l("عدّل أعمال السنة والنصفي، ثم انشر النتائج للطلاب", "Edit coursework and midterm, then publish to students")}
        breadcrumb={[{ label: l("التقييم", "Assessment") }, { label: l("الدرجات", "Grades") }]}
        actions={
          course && (
            <form action={publishCourseGrades}>
              <input type="hidden" name="courseId" value={course.id} />
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success-500 px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-success-500/90">
                <Icon name="send" size={14} /> {l("نشر درجات المقرر", "Publish course grades")}
              </button>
            </form>
          )
        }
      />

      {sp.error && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.08] px-4 py-2.5 text-[12px] text-danger-500">
          <Icon name="alert-circle" size={14} className="me-1 inline" /> {l("تعذّر حفظ التعديل — تحقّق من الصلاحية والمدخلات.", "Could not save — check permission and inputs.")}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/teacher/grades?course=${c.id}`}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11.5px] font-medium transition ${
              c.id === selectedId ? "border-brand-500/40 bg-brand-500/10 text-brand-400" : "border-line bg-surface text-fg-muted hover:text-fg"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.code}
          </Link>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("الطلاب", "Students")} value={students.length} icon="users" tone="brand" />
        <StatCard label={l("متوسط الدرجات", "Class average")} value={`${avg}%`} icon="percent" tone={avg >= 70 ? "success" : "warning"} />
        <StatCard label={l("مسجّلة", "Recorded")} value={grades.length} icon="clipboard" tone="accent" hint={ungraded > 0 ? `${ungraded} ${l("بدون سجل", "missing")}` : l("مكتملة", "all present")} />
        <StatCard label={l("منشورة", "Published")} value={`${published}/${grades.length}`} icon="send" tone={published === grades.length && grades.length > 0 ? "success" : "neutral"} />
      </section>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div>
            <p className="text-[12.5px] font-semibold text-fg">{course ? l(course.nameAr, course.nameEn) : "—"}</p>
            <p className="text-[10px] text-fg-muted">
              {l("أعمال السنة 20 · النصفي 20 · النهائي 60", "Coursework 20 · Midterm 20 · Final 60")} · {l("المجموع 100", "Total 100")}
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2 text-[10.5px] text-fg-muted">
            <span>{l("نسبة النشر", "Publish ratio")}</span>
            <div className="w-24"><Progress value={grades.length ? Math.round((published / grades.length) * 100) : 0} size="sm" tone="success" /></div>
          </div>
        </div>

        <TableWrap>
          <thead>
            <tr>
              <Th>{l("الطالب", "Student")}</Th>
              <Th align="center">{l("أعمال السنة /20", "Coursework /20")}</Th>
              <Th align="center">{l("النصفي /20", "Midterm /20")}</Th>
              <Th align="center">{l("النهائي /60", "Final /60")}</Th>
              <Th align="center">{l("المجموع", "Total")}</Th>
              <Th align="center">{l("التقدير", "Grade")}</Th>
              <Th align="center">{l("نُشرت", "Published")}</Th>
              <Th align="end" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const g = grades.find((x) => x.studentId === s.id);
              return (
                <tr key={s.id} className="transition hover:bg-surface-2/60">
                  <Td>
                    <p className="text-[11.5px] font-medium text-fg">{l(s.nameAr, s.nameEn)}</p>
                    <p className="font-mono text-[9px] text-fg-muted">{s.studentNumber}</p>
                  </Td>
                  {g ? (
                    <Td colSpan={6}>
                      <form action={saveGrade} className="flex flex-wrap items-center justify-center gap-2" id={`g-${g.id}`}>
                        <input type="hidden" name="gradeId" value={g.id} />
                        <input
                          name="coursework"
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          defaultValue={g.coursework}
                          aria-label={l("أعمال السنة", "Coursework")}
                          className="tnum h-7 w-[68px] rounded-md border border-line-strong bg-surface px-1.5 text-center text-[11px] text-fg focus:border-brand-500 focus:outline-none"
                        />
                        <input
                          name="midterm"
                          type="number"
                          min={0}
                          max={20}
                          step={0.5}
                          defaultValue={g.midterm}
                          aria-label={l("النصفي", "Midterm")}
                          className="tnum h-7 w-[68px] rounded-md border border-line-strong bg-surface px-1.5 text-center text-[11px] text-fg focus:border-brand-500 focus:outline-none"
                        />
                        <span className="tnum w-[52px] rounded-md bg-surface-2 px-1.5 py-1 text-center text-[11px] text-fg-muted">{g.final}</span>
                        <span className={`tnum w-[56px] text-center text-[11.5px] font-semibold ${g.total >= 60 ? "text-fg" : "text-danger-500"}`}>{g.total}%</span>
                        <Badge tone={["A+", "A", "B+", "B"].includes(g.letter) ? "success" : g.letter.startsWith("C") ? "brand" : g.letter === "F" ? "danger" : "warning"}>{g.letter}</Badge>
                        <Badge tone={g.published ? "success" : "neutral"}>{g.published ? l("نُشرت", "Yes") : l("مسودة", "Draft")}</Badge>
                        <button type="submit" className="inline-flex h-7 items-center gap-1 rounded-md bg-brand-500/10 px-2 text-[10.5px] font-semibold text-brand-400 transition hover:bg-brand-500/20">
                          <Icon name="check" size={11} /> {l("حفظ", "Save")}
                        </button>
                      </form>
                    </Td>
                  ) : (
                    <><Td align="center">—</Td><Td align="center">—</Td><Td align="center">—</Td><Td align="center">—</Td><Td align="center"><Badge tone="warning">{l("لا سجل", "No record")}</Badge></Td><Td align="center">—</Td><Td align="end">—</Td></>
                  )}
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr><Td colSpan={8} className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا طلاب في هذه الشعبة.", "No students in this section.")}</Td></tr>
            )}
          </tbody>
        </TableWrap>
        <p className="px-4 py-3 text-[9.5px] leading-relaxed text-fg-muted">
          {l(
            "الحفظ يُعيد حساب المجموع والتقدير والنقاط فوراً. النشر يرسل إشعاراً لكل طالب ويسجّل عملية في سجل التدقيق — لا يمكن التراجع دون طلب رسمي.",
            "Saving recomputes total, letter and points immediately. Publishing notifies every student and writes an audit entry — reverting requires a formal request.",
          )}
        </p>
      </Card>

      <Card>
        <CardHeader title={l("قواعد التقدير", "Grading scale")} icon="percent" />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { g: "A", r: "90 – 100", p: "4.00" },
            { g: "B+", r: "85 – 89", p: "3.70" },
            { g: "B", r: "80 – 84", p: "3.30" },
            { g: "C+", r: "75 – 79", p: "3.00" },
            { g: "D", r: "60 – 64", p: "2.00" },
            { g: "F", r: "< 60", p: "0.00" },
          ].map((x) => (
            <div key={x.g} className="rounded-lg border border-line bg-surface-2/50 px-2.5 py-2 text-center">
              <p className="text-[13px] font-semibold text-fg">{x.g}</p>
              <p className="tnum text-[10px] text-fg-muted">{x.r}</p>
              <p className="tnum text-[9px] text-fg-muted">{x.p} {l("نقطة", "pts")}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
