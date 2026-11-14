import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Badge, Card, CardHeader, Icon, KeyValue, Progress, Ring, Select, StatusBadge, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { Sparkline } from "@/components/charts";
import { db, findDepartment, findSection, studentAttendance } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { updateStudentStanding } from "@/app/actions/admin";
import { fmtDate, makeL, relTime } from "@/lib/utils";

export default async function AdminStudentDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { locale } = await adminContext();
  const l = makeL(locale);
  const student = db().students.find((s) => s.id === id);
  if (!student) notFound();

  const dept = findDepartment(student.departmentId);
  const section = findSection(student.sectionId);
  const courses = student.enrolledCourseIds.map((cid) => db().courses.find((c) => c.id === cid)).filter(Boolean);
  const att = studentAttendance(student.id);
  const grades = db().grades.filter((g) => g.studentId === student.id && g.published);
  const attempts = db().attempts.filter((a) => a.studentId === student.id);
  const devices = db().devices.filter((d) => d.studentId === student.id);
  const complaints = db().complaints.filter((c) => c.studentId === student.id);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l(student.nameAr, student.nameEn)}
        subtitle={`${student.studentNumber} · ${dept ? l(dept.nameAr, dept.nameEn) : ""} · ${l("المستوى", "Level")} ${student.level} · ${section ? l(section.nameAr, section.nameEn) : ""}`}
        breadcrumb={[{ label: l("الطلاب", "Students"), href: "/admin/students" }, { label: student.studentNumber }]}
        badge={<StatusBadge status={student.academicStatus} />}
        actions={
          <Link href="/admin/students" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-fg hover:bg-surface-2">
            <Icon name="arrow-right" size={14} className="rtl:rotate-180" /> {l("السجل", "Registry")}
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[330px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center">
              <Avatar name={student.nameAr} size={64} />
              <p className="mt-2 text-[14px] font-semibold text-fg">{l(student.nameAr, student.nameEn)}</p>
              <p className="font-mono text-[10px] text-fg-muted">{student.studentNumber}</p>
              <div className="mt-2 flex gap-1.5">
                <Badge tone={dept?.color ? "brand" : "neutral"}>{dept?.code}</Badge>
                <Badge tone="neutral">{student.id}</Badge>
              </div>
            </div>
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              <KeyValue label={l("البريد", "Email")} value={student.email} mono />
              <KeyValue label={l("الهاتف", "Phone")} value={student.phone} mono />
              <KeyValue label={l("القسم", "Department")} value={dept ? l(dept.nameAr, dept.nameEn) : "—"} />
              <KeyValue label={l("الشعبة", "Section")} value={section ? l(section.nameAr, section.nameEn) : "—"} />
              <KeyValue label={l("تاريخ التسجيل", "Enrolled")} value={fmtDate(student.joinedAt ?? "2023-09-01", locale)} />
            </div>
          </Card>

          <Card>
            <CardHeader title={l("تعديل الحالة", "Change standing")} icon="key" />
            <form action={updateStudentStanding} className="space-y-2">
              <input type="hidden" name="studentId" value={student.id} />
              <Select name="status" defaultValue={student.academicStatus}>
                <option value="ACTIVE">{l("منتظم", "Active")}</option>
                <option value="PROBATION">{l("إنذار أكاديمي", "Academic probation")}</option>
                <option value="SUSPENDED">{l("إيقاف", "Suspended")}</option>
                <option value="GRADUATED">{l("تخرج", "Graduated")}</option>
              </Select>
              <button type="submit" className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-[11.5px] font-semibold text-white hover:bg-brand-600">
                <Icon name="check" size={13} /> {l("تحديث الحالة", "Update standing")}
              </button>
              <p className="text-[9px] leading-relaxed text-fg-muted">
                {l("التغيير يُخطر الطالب ويُسجَّل في التدقيق مع سبب إداري.", "The change notifies the student and is written to the audit log.")}
              </p>
            </form>
          </Card>

          <Card>
            <CardHeader title={l("الأجهزة", "Devices")} icon="smartphone" />
            <div className="space-y-1.5">
              {devices.map((d) => (
                <div key={d.id} className="rounded-lg bg-surface-2 px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-[10.5px] text-fg">{d.label}</p>
                    <Badge tone={d.status === "ACTIVE" ? "success" : "danger"}>{d.status}</Badge>
                  </div>
                  <p className="font-mono text-[8.5px] text-fg-muted">{d.platform} · {d.fingerprint.slice(0, 18)} · {relTime(d.lastSeenAt, locale)}</p>
                </div>
              ))}
              {devices.length === 0 && <p className="text-[10.5px] text-fg-muted">{l("لا أجهزة مسجّلة.", "No registered devices.")}</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={l("المعدل التراكمي", "GPA")} value={student.gpa.toFixed(2)} icon="percent" tone="accent" spark={<Sparkline data={[2.9, 3.0, 3.1, 3.2, student.gpa]} color="#38A5FF" width={70} />} />
            <StatCard label={l("الحضور", "Attendance")} value={`${att.rate}%`} icon="qr" tone={att.rate >= 85 ? "success" : "warning"} />
            <StatCard label={l("محاولات الاختبار", "Exam attempts")} value={attempts.length} icon="file-text" tone="brand" />
            <StatCard label={l("طلبات", "Requests")} value={complaints.length} icon="message" tone={complaints.some((c) => c.status === "OPEN") ? "warning" : "neutral"} />
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title={l("الأداء الأكاديمي", "Academic record")} icon="chart" subtitle={`${grades.length} ${l("مقرراً منشوراً", "published courses")}`} />
              <div className="flex items-center gap-4">
                <Ring value={Math.round((student.gpa / 4) * 100)} size={92} thickness={9} label={`${Math.round((student.gpa / 4) * 100)}%`}>
                  <div>
                    <p className="tnum text-[16px] font-semibold text-fg">{student.gpa.toFixed(2)}</p>
                    <p className="text-[8px] text-fg-muted">{l("من 4.00", "of 4.00")}</p>
                  </div>
                </Ring>
                <div className="flex-1 space-y-1.5">
                  {grades.slice(0, 4).map((g) => {
                    const c = db().courses.find((x) => x.id === g.courseId);
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="truncate text-fg-soft">{c?.code}</span>
                          <span className="tnum text-fg-muted">{g.total}% · {g.letter}</span>
                        </div>
                        <Progress value={g.total} size="sm" tone={g.total >= 75 ? "success" : g.total >= 60 ? "brand" : "danger"} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title={l("سجل الحضور", "Attendance ledger")} icon="qr" subtitle={l("ملخص لكل مقرر", "Per-course summary")} />
              <div className="space-y-2">
                {courses.map((c) => {
                  const ca = studentAttendance(student.id, c!.id);
                  return (
                    <div key={c!.id} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 font-mono text-[9.5px] text-fg-muted">{c!.code}</span>
                      <div className="flex-1"><Progress value={ca.rate} size="sm" tone={ca.rate >= 85 ? "success" : ca.rate >= 75 ? "warning" : "danger"} /></div>
                      <span className={`tnum text-[10px] ${ca.rate >= 75 ? "text-fg-muted" : "font-semibold text-danger-500"}`}>{ca.rate}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <Card padded={false} className="overflow-hidden">
            <CardHeader title={l("محاولات الاختبارات", "Examination attempts")} icon="file-text" />
            <TableWrap>
              <thead>
                <tr>
                  <Th>{l("الاختبار", "Examination")}</Th>
                  <Th align="center">{l("الدرجة", "Score")}</Th>
                  <Th align="center">{l("الحوادث", "Incidents")}</Th>
                  <Th align="end">{l("الحالة", "Status")}</Th>
                  <Th align="end" />
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => {
                  const exam = db().examinations.find((e) => e.id === a.examinationId);
                  return (
                    <tr key={a.id}>
                      <Td><span className="text-[11px] text-fg">{exam ? l(exam.titleAr, exam.titleEn) : a.examinationId}</span></Td>
                      <Td align="center"><span className="tnum text-[11px] font-semibold text-fg">{a.score ?? "—"}</span><span className="text-[9px] text-fg-muted">/{exam?.totalMarks ?? a.maxScore}</span></Td>
                      <Td align="center"><span className={`tnum text-[11px] ${a.violations ? "text-warn-500" : "text-fg-muted"}`}>{a.violations}</span></Td>
                      <Td align="end"><StatusBadge status={a.status} /></Td>
                      <Td align="end"><Link href={`/admin/exam-control/${a.id}`} className="text-[10.5px] font-semibold text-brand-500 hover:underline">{l("مراجعة", "Review")}</Link></Td>
                    </tr>
                  );
                })}
                {attempts.length === 0 && <tr><Td colSpan={5} className="py-6 text-center text-[11px] text-fg-muted">{l("لا محاولات.", "No attempts.")}</Td></tr>}
              </tbody>
            </TableWrap>
          </Card>
        </div>
      </div>
    </div>
  );
}
