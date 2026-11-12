import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardHeader, EmptyState, Icon, KeyValue, Progress } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { RosterTable, type RosterRow } from "@/components/teacher/roster-table";
import { BarChart } from "@/components/charts";
import { db, findCourse, findDepartment, findSection, studentAttendance } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { makeL, weekdayShort } from "@/lib/utils";
import { fmtDate } from "@/lib/utils";

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { teacher, locale } = await teacherContext();
  const course = findCourse(id);
  if (!course || course.teacherId !== teacher.id) notFound();
  const l = makeL(locale);

  const section = findSection(course.sectionId);
  const dept = findDepartment(course.departmentId);
  const roster = db().students.filter((s) => s.sectionId === course.sectionId);
  const slots = db().schedule.filter((s) => s.courseId === course.id);
  const notes = db().lectureNotes.filter((n) => n.courseId === course.id);
  const exams = db().examinations.filter((e) => e.courseId === course.id);

  const rows: RosterRow[] = roster.map((s) => {
    const att = studentAttendance(s.id, course.id);
    const grade = db().grades.find((g) => g.studentId === s.id && g.courseId === course.id);
    const absences = db().attendanceRecords.filter((r) => r.studentId === s.id && r.courseId === course.id && r.status === "ABSENT").length;
    return {
      id: s.id,
      nameAr: s.nameAr,
      nameEn: s.nameEn,
      number: s.studentNumber,
      rate: att.rate,
      absences,
      total: grade?.published ? grade.total : null,
      letter: grade?.published ? grade.letter : null,
      gpa: s.gpa,
      status: s.academicStatus,
    };
  });

  const avgRate = rows.length ? Math.round(rows.reduce((a, r) => a + r.rate, 0) / rows.length) : 0;
  const graded = rows.filter((r) => r.total !== null);
  const avgGrade = graded.length ? Math.round(graded.reduce((a, r) => a + (r.total ?? 0), 0) / graded.length) : 0;
  const distribution = [
    { label: l("ممتاز", "A"), color: "#19B88A", value: graded.filter((r) => ["A+", "A"].includes(r.letter ?? "")).length },
    { label: l("جيد جداً", "B"), color: "#38A5FF", value: graded.filter((r) => ["B+", "B"].includes(r.letter ?? "")).length },
    { label: l("جيد", "C"), color: "#2864D9", value: graded.filter((r) => r.letter?.startsWith("C")).length },
    { label: l("مقبول", "D"), color: "#F2A93B", value: graded.filter((r) => r.letter?.startsWith("D")).length },
    { label: l("راسب", "F"), color: "#F05252", value: graded.filter((r) => r.letter === "F").length },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l(course.nameAr, course.nameEn)}
        subtitle={`${course.code} · ${l(section?.nameAr ?? "", section?.nameEn ?? "")} · ${l(dept?.nameAr ?? "", dept?.nameEn ?? "")}`}
        breadcrumb={[{ label: l("الفصول", "Classes"), href: "/teacher/classes" }, { label: course.code }]}
        badge={<Badge tone={course.status === "ACTIVE" ? "success" : "neutral"} dot>{l("جارٍ", "Active")}</Badge>}
        actions={
          <>
            <Link href={`/teacher/grades?course=${course.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg transition hover:bg-surface-2">
              <Icon name="percent" size={15} /> {l("دفتر الدرجات", "Gradebook")}
            </Link>
            <Link href={`/teacher/attendance?course=${course.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-brand-600">
              <Icon name="qr" size={15} /> {l("فتح حضور", "Open attendance")}
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("الطلاب المسجلون", "Enrolled students")} value={roster.length} icon="users" tone="brand" />
        <StatCard label={l("متوسط الحضور", "Average attendance")} value={`${avgRate}%`} icon="qr" tone={avgRate >= 85 ? "success" : "warning"} />
        <StatCard label={l("متوسط الدرجات", "Average score")} value={`${avgGrade}%`} icon="percent" tone="accent" />
        <StatCard label={l("تقدم المنهج", "Syllabus progress")} value={`${course.progress}%`} icon="book" tone="neutral" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title={l("كشف الطلاب", "Class roster")} subtitle={l("بحث، ترتيب، ومتابعة الحضور", "Search, sort, monitor attendance")} icon="users" />
          <RosterTable rows={rows} courseCode={course.code} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("مواعيد المحاضرات", "Class meetings")} icon="calendar" />
            <div className="space-y-1.5">
              {slots.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-2 text-[11px]">
                  <span className="font-medium text-fg-soft">{weekdayShort(s.day, locale)}</span>
                  <span className="tnum text-fg">{s.start}–{s.end}</span>
                  <span className="text-fg-muted">{s.room}</span>
                  <Badge tone={s.type === "LAB" ? "accent" : "neutral"}>{s.type === "LAB" ? l("معمل", "Lab") : l("محاضرة", "Lecture")}</Badge>
                </div>
              ))}
              {slots.length === 0 && <p className="text-[11px] text-fg-muted">{l("لا مواعيد مسجلة.", "No meetings scheduled.")}</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title={l("توزيع التقديرات", "Grade distribution")} subtitle={l(`${graded.length} طالباً لديه درجة منشورة`, `${graded.length} students with published grades`)} icon="chart" />
            <BarChart data={distribution} height={150} ariaLabel={l("توزيع التقديرات", "Grade distribution")} />
          </Card>

          <Card>
            <CardHeader title={l("بيانات المقرر", "Course facts")} icon="info" />
            <div className="space-y-2">
              <KeyValue label={l("الرمز", "Code")} value={course.code} mono />
              <KeyValue label={l("الساعات المعتمدة", "Credit hours")} value={course.credits} />
              <KeyValue label={l("المستوى", "Level")} value={course.level} />
              <KeyValue label={l("القاعة", "Room")} value={section?.room ?? "—"} mono />
              <KeyValue label={l("الاختبارات", "Examinations")} value={`${exams.length}`} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={l("مواد المحاضرات", "Lecture materials")} subtitle={l("منشورة للطلاب", "Published to students")} icon="layers" />
          <div className="space-y-1.5">
            {notes.length === 0 && <EmptyState icon="layers" title={l("لا مواد بعد", "No materials yet")} description={l("ارفع شرائح أو واجبات من لوحة المقرر.", "Upload slides or assignments from the course panel.")} />}
            {notes.map((n) => (
              <div key={n.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-500/10 text-brand-400">
                  <Icon name={n.type === "VIDEO" ? "play" : n.type === "ASSIGNMENT" ? "clipboard" : "file-text"} size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-fg">{l(n.titleAr, n.titleAr)}</p>
                  <p className="text-[9.5px] text-fg-muted">
                    {l("الأسبوع", "Week")} {n.week} · {n.size ?? `${n.durationMin} ${l("دقيقة", "min")}`} · {fmtDate(n.publishedAt, locale)}
                  </p>
                </div>
                <Icon name="download" size={13} className="text-fg-muted" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={l("اختبارات المقرر", "Course examinations")} icon="file-text" action={<Link href="/teacher/exams/new" className="text-[11.5px] font-semibold text-brand-500 hover:underline">{l("اختبار جديد", "New exam")}</Link>} />
          <div className="space-y-1.5">
            {exams.map((e) => (
              <Link key={e.id} href={`/teacher/exams/${e.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 transition hover:border-brand-500/40">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium text-fg">{l(e.titleAr, e.titleEn)}</p>
                  <p className="font-mono text-[9.5px] text-fg-muted">{e.code} · {e.totalMarks} {l("درجة", "marks")}</p>
                </div>
                <Badge tone={e.status === "LIVE" ? "success" : e.status === "CLOSED" ? "neutral" : "warning"}>
                  {e.status === "LIVE" ? l("جارٍ", "Live") : e.status === "CLOSED" ? l("منتهٍ", "Closed") : l("مجدول", "Scheduled")}
                </Badge>
              </Link>
            ))}
            {exams.length === 0 && <p className="text-[11px] text-fg-muted">{l("لا اختبارات لهذا المقرر.", "No examinations for this course.")}</p>}
          </div>
        </Card>
      </div>

      <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-fg-soft">
          <Icon name="info" size={13} /> {l("مؤشرات للمتابعة", "Follow-up indicators")}
        </p>
        <div className="flex flex-wrap gap-2">
          {rows.filter((r) => r.rate < 75).map((r) => (
            <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full border border-warn-500/30 bg-warn-500/[0.07] px-2.5 py-1 text-[10.5px] text-fg-soft">
              <Icon name="alert-circle" size={11} className="text-warn-500" />
              {l(r.nameAr, r.nameEn)} — {r.rate}% {l("حضور", "attendance")}
            </span>
          ))}
          {rows.filter((r) => r.rate < 75).length === 0 && <span className="text-[10.5px] text-fg-muted">{l("كل الطلاب فوق حد الحضور الآمن (75%).", "All students are above the 75% safe threshold.")}</span>}
        </div>
        <p className="mt-2 text-[9.5px] leading-relaxed text-fg-muted">
          {l(
            "حد الإنذار بالغياب 25% من المحاضرات وفق اللائحة. التنبيهات إرشادية ولا تُصدر قراراً آلياً.",
            "The regulatory absence warning triggers at 25% of lectures. These alerts are advisory and never issue automatic decisions.",
          )}
        </p>
      </div>
    </div>
  );
}
