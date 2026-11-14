import { Badge, Card, CardHeader, Icon, Progress } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "التقارير والتصدير" };

const REPORTS = [
  { kind: "students", icon: "users", ar: "سجل الطلاب", en: "Student registry", descAr: "البيانات الأكاديمية والحضور والحالة لكل طالب.", descEn: "Academic data, attendance and standing per student." },
  { kind: "grades", icon: "percent", ar: "الدرجات والنتائج", en: "Grades & results", descAr: "سجلات الدرجات والتقديرات وحالة النشر.", descEn: "Grade records, letters and publication state." },
  { kind: "attendance", icon: "qr", ar: "الحضور التفصيلي", en: "Detailed attendance", descAr: "كل تسجيل حضور مع الطريقة والمسافة والوقت.", descEn: "Every check-in with method, distance and time." },
  { kind: "exams", icon: "file-text", ar: "الاختبارات والنزاهة", en: "Examinations & integrity", descAr: "الاختبارات، المحاولات، والحوادث المعلّمة.", descEn: "Examinations, attempts and flagged incidents." },
  { kind: "audit", icon: "list-checks", ar: "سجل التدقيق", en: "Audit trail", descAr: "كل إجراء إداري حساس مع السبب والمنفّذ.", descEn: "Every sensitive administrative action with reason." },
];

export default async function AdminReportsPage() {
  const { locale } = await adminContext();
  const l = makeL(locale);

  const counts: Record<string, number> = {
    students: db().students.length,
    grades: db().grades.length,
    attendance: db().attendanceRecords.length,
    exams: db().examinations.length,
    audit: db().auditLogs.length,
  };

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("التقارير والتصدير", "Reports & export")}
        subtitle={l("تصدير CSV حقيقي من بيانات الجلسة، وطباعة/PDF بتنسيق A4", "Real CSV export from session data, plus A4 print/PDF")}
        breadcrumb={[{ label: l("الحوكمة", "Governance") }, { label: l("التقارير", "Reports") }]}
        actions={<PrintButton />}
        badge={<Badge tone="success" dot>{l("كل تصدير يُسجَّل في التدقيق", "Every export is audited")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("سجلات قابلة للتصدير", "Exportable records")} value={Object.values(counts).reduce((a, b) => a + b, 0)} icon="download" tone="brand" />
        <StatCard label={l("تقارير معرفة", "Defined reports")} value={REPORTS.length} icon="file-text" tone="accent" />
        <StatCard label={l("آخر تصدير", "Last export")} value={db().auditLogs.filter((a) => a.action === "report.export").length} icon="clock" tone="neutral" hint={l("مرة مسجّلة", "logged calls")} />
        <StatCard label={l("الاحتفاظ", "Retention")} value="5" icon="shield-check" tone="success" hint={l("سنوات لسجلات الاختبارات", "years for exam records")} />
      </section>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.kind} className="flex flex-col">
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400">
                <Icon name={r.icon as never} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-fg">{l(r.ar, r.en)}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">{l(r.descAr, r.descEn)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5">
              <span className="text-[9.5px] text-fg-muted">{l("السجلات", "Records")}</span>
              <span className="tnum text-[12px] font-semibold text-fg">{counts[r.kind]}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              <a
                href={`/api/v1/reports/${r.kind}`}
                className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-[11.5px] font-semibold text-white transition hover:bg-brand-600"
              >
                <Icon name="download" size={13} /> {l("تصدير CSV", "Export CSV")}
              </a>
              <a href="#report-preview" className="inline-flex h-8 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 text-[10.5px] font-semibold text-fg-soft hover:text-fg">
                <Icon name="eye" size={12} /> {l("معاينة", "Preview")}
              </a>
            </div>
          </Card>
        ))}

        <Card className="flex flex-col justify-between border-dashed">
          <div>
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-fg-muted"><Icon name="printer" size={16} /></span>
              <div>
                <p className="text-[12.5px] font-semibold text-fg">{l("تقرير الموازنة (PDF)", "Board pack (PDF)")}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-fg-muted">
                  {l("ملخص تنفيذي A4: المؤشرات، الاتجاهات، النزاهة، والطلبات.", "Executive A4 summary: KPIs, trends, integrity and requests.")}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone="neutral">{l("عبر الطباعة", "via print")}</Badge>
            <PrintButton size="sm" label="تحضير PDF" />
          </div>
        </Card>
      </div>

      <div id="report-preview" className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title={l("معاينة: تقرير الطلاب", "Preview: student registry")} subtitle={l("أول 6 سجلات من البيانات الحقيقية", "First 6 rows of real data")} icon="eye" />
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-line text-fg-muted">
                  <th className="py-1.5 text-start font-medium">{l("الرقم", "Number")}</th>
                  <th className="py-1.5 text-start font-medium">{l("الاسم", "Name")}</th>
                  <th className="py-1.5 text-start font-medium">{l("القسم", "Dept")}</th>
                  <th className="py-1.5 text-center font-medium">GPA</th>
                  <th className="py-1.5 text-center font-medium">{l("الحضور", "Att.")}</th>
                </tr>
              </thead>
              <tbody>
                {db().students.slice(0, 6).map((s) => (
                  <tr key={s.id} className="border-b border-line/60">
                    <td className="py-1.5 font-mono text-[9px] text-fg-muted">{s.studentNumber}</td>
                    <td className="py-1.5 text-fg-soft">{l(s.nameAr, s.nameEn)}</td>
                    <td className="py-1.5 text-fg-muted">{s.departmentId.replace("dept_", "").toUpperCase()}</td>
                    <td className="py-1.5 text-center tnum text-fg-soft">{s.gpa.toFixed(2)}</td>
                    <td className="py-1.5 text-center tnum text-fg-soft">{s.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[9px] text-fg-muted">
            {l("المعاينة للقراءة فقط — التصدير الكامل عبر CSV يحمل كل السجلات مع ترميز UTF-8 BOM لدعم العربية في Excel.", "Preview is read-only — the CSV export carries all rows with a UTF-8 BOM so Arabic renders correctly in Excel.")}
          </p>
        </Card>

        <Card>
          <CardHeader title={l("جدول التصدير والصلاحيات", "Export matrix")} icon="key" />
          <div className="space-y-1.5">
            {[
              { r: l("مراقب الاختبارات", "Exam supervisor"), p: [l("الاختبارات", "Exams"), l("التدقيق", "Audit")] },
              { r: l("مدير المؤسسة", "Institution admin"), p: [l("كل التقارير", "All reports")] },
              { r: l("مدير المنصة", "Super admin"), p: [l("كل التقارير", "All reports"), l("بيانات المؤسسات", "Institution data")] },
              { r: l("المعلم", "Teacher"), p: [l("درجات مقرراته فقط", "Own course grades")] },
            ].map((x) => (
              <div key={x.r} className="flex items-start gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                <span className="w-24 shrink-0 text-[10px] font-medium text-fg-soft">{x.r}</span>
                <span className="text-[9.5px] text-fg-muted">{x.p.join(" · ")}</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5">
            <p className="mb-1 flex justify-between text-[9.5px] text-fg-muted"><span>{l("تغطية البيانات", "Data coverage")}</span><span className="tnum">100%</span></p>
            <Progress value={100} size="sm" tone="success" />
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-fg-muted">
            {l("كل تصدير يُسجَّل باسم المستخدم والوقت ونوع التقرير وعدد السجلات.", "Every export records the user, time, report kind and row count.")}
          </p>
        </Card>
      </div>
    </div>
  );
}
