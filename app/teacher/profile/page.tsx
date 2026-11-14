import Link from "next/link";
import { Avatar, Badge, Card, CardHeader, Icon, KeyValue, Progress } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { db, findDepartment } from "@/lib/server/store";
import { teacherContext } from "@/lib/server/context";
import { fmtDate, makeL, weekdayShort } from "@/lib/utils";

export const metadata = { title: "ملفي" };

export default async function TeacherProfilePage() {
  const { user, teacher, courses, locale } = await teacherContext();
  const l = makeL(locale);
  const dept = findDepartment(teacher.departmentId);
  const slots = db().schedule.filter((s) => s.teacherId === teacher.id);
  const taught = db().students.filter((s) => courses.some((c) => c.sectionId === s.sectionId));

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("ملفي الأكاديمي", "My academic profile")}
        subtitle={`${teacher.title} · ${l(dept?.nameAr ?? "", dept?.nameEn ?? "")}`}
        breadcrumb={[{ label: l("الحساب", "Account") }, { label: l("ملفي", "Profile") }]}
        actions={<Badge tone={teacher.status === "ACTIVE" ? "success" : "warning"} dot>{teacher.status === "ACTIVE" ? l("نشط", "Active") : l("إجازة", "On leave")}</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center py-2 text-center">
              <Avatar name={teacher.nameAr} size={72} />
              <p className="mt-2.5 text-[15px] font-semibold text-fg">{l(teacher.nameAr, teacher.nameEn)}</p>
              <p className="text-[11px] text-fg-muted">{teacher.title}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge tone="brand">{dept?.code}</Badge>
                <Badge tone="neutral">{teacher.id}</Badge>
              </div>
              <div className="mt-3 flex w-full items-center justify-center gap-4 border-t border-line pt-3">
                <div className="text-center">
                  <p className="tnum text-[16px] font-semibold text-fg">{courses.length}</p>
                  <p className="text-[9px] text-fg-muted">{l("مقررات", "courses")}</p>
                </div>
                <div className="text-center">
                  <p className="tnum text-[16px] font-semibold text-fg">{taught.length}</p>
                  <p className="text-[9px] text-fg-muted">{l("طالباً", "students")}</p>
                </div>
                <div className="text-center">
                  <p className="tnum text-[16px] font-semibold text-accent-400">{teacher.rating.toFixed(1)}</p>
                  <p className="text-[9px] text-fg-muted">{l("تقييم الطلاب", "rating")}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={l("بيانات الاتصال", "Contact")} icon="user" />
            <div className="space-y-2">
              <KeyValue label={l("البريد", "Email")} value={teacher.email} mono />
              <KeyValue label={l("الهاتف", "Phone")} value={teacher.phone} mono />
              <KeyValue label={l("المكتب", "Office")} value={teacher.officeRoom} mono />
              <KeyValue label={l("الساعات المكتبية", "Office hours")} value={teacher.officeHours} />
              <KeyValue label={l("تاريخ الانضمام", "Joined")} value={fmtDate(teacher.joinedAt, locale)} />
              <KeyValue label={l("آخر دخول", "Last sign-in")} value={fmtDate(Date.now() - 3600_000, locale)} />
            </div>
          </Card>

          <Card>
            <CardHeader title={l("الأمان", "Security")} icon="shield-check" />
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-2">
                <span className="text-[11px] text-fg-soft">{l("التحقق بخطوتين", "Two-factor auth")}</span>
                <Badge tone="success" dot>{l("مفعّل", "Enabled")}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-2">
                <span className="text-[11px] text-fg-soft">{l("الجلسات النشطة", "Active sessions")}</span>
                <span className="tnum text-[11px] text-fg">{1}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-2">
                <span className="text-[11px] text-fg-soft">{l("الدور", "Role")}</span>
                <Badge tone="brand">{user.role}</Badge>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("مقرراتي", "My courses")} icon="book" action={<Link href="/teacher/classes" className="text-[11.5px] font-semibold text-brand-500 hover:underline">{l("الفصول", "Classes")}</Link>} />
            <div className="space-y-2">
              {courses.map((c) => (
                <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/50 px-3 py-2.5 transition hover:border-brand-500/40">
                  <span className="h-8 w-1.5 rounded-full" style={{ background: c.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium text-fg">{l(c.nameAr, c.nameEn)}</p>
                    <p className="text-[9.5px] text-fg-muted">{c.code} · {c.credits} {l("ساعات", "cr")} · {c.enrolledCount} {l("طالباً", "students")}</p>
                  </div>
                  <div className="w-24"><Progress value={c.progress} size="sm" tone="brand" /></div>
                  <Icon name="chevron-right" size={13} className="text-fg-muted rtl:rotate-180" />
                </Link>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title={l("الجدول الأسبوعي", "Weekly schedule")} icon="calendar" />
              <div className="space-y-1.5">
                {slots.map((s) => {
                  const c = courses.find((x) => x.id === s.courseId);
                  return (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                      <span className="w-12 text-[10px] font-medium text-fg-muted">{weekdayShort(s.day, locale)}</span>
                      <span className="tnum text-[10.5px] text-fg">{s.start}</span>
                      <span className="truncate text-[10px] text-fg-soft">{c?.code}</span>
                      <span className="ms-auto text-[9.5px] text-fg-muted">{s.room}</span>
                    </div>
                  );
                })}
                {slots.length === 0 && <p className="text-[11px] text-fg-muted">{l("لا محاضرات مجدولة.", "No scheduled lectures.")}</p>}
              </div>
            </Card>

            <Card>
              <CardHeader title={l("نشاط تدريسي", "Teaching activity")} icon="activity" />
              <div className="space-y-2.5">
                {[
                  { label: l("معاملات حضور هذا الفصل", "Attendance sessions"), value: db().attendanceSessions.filter((s) => s.teacherId === teacher.id).length },
                  { label: l("اختبارات أُنشئت", "Examinations created"), value: db().examinations.filter((e) => e.teacherId === teacher.id).length },
                  { label: l("أسئلة في البنك", "Items in bank"), value: db().questions.filter((q) => q.teacherId === teacher.id).length },
                  { label: l("محاولات صُححت", "Attempts graded"), value: db().attempts.filter((a) => a.examinationId && db().examinations.some((e) => e.id === a.examinationId && e.teacherId === teacher.id) && a.status === "GRADED").length },
                ].map((x) => (
                  <div key={x.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-fg-muted">{x.label}</span>
                    <span className="tnum text-[12.5px] font-semibold text-fg">{x.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title={l("نبذة", "Biography")} icon="info" />
            <p className="text-[11.5px] leading-relaxed text-fg-muted">
              {l(
                `${teacher.nameAr} عضو هيئة تدريس في ${dept?.nameAr ?? ""}، يدرّس ${courses.map((c) => c.code).join("، ")}. يهتم بمناهج التقييم القائمة على الأدلة، وتصميم اختبارات تقيس الفهم لا الحفظ، وتوثيق شفافية المراقبة للطلاب.`,
                `${teacher.nameEn} teaches in ${dept?.nameEn ?? ""}, covering ${courses.map((c) => c.code).join(", ")}. Interests include evidence-based assessment design, examinations that measure understanding rather than recall, and transparent proctoring disclosures.`,
              )}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[l("تحليل الخوارزميات", "Algorithms"), l("هندسة البرمجيات", "Software engineering"), l("الشبكات", "Networks"), l("التقييم الأكاديمي", "Assessment")].map((t) => (
                <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[9.5px] text-fg-muted">{t}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
