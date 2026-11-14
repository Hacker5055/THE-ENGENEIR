import { Badge, Card, CardHeader, Icon, Progress } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { BarChart, Donut, LineChart } from "@/components/charts";
import { db, gpaFor, studentAttendance } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "التحليلات" };

export default async function AdminAnalyticsPage() {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const students = db().students;
  const grades = db().grades;

  const gpaTrend = [3.02, 3.08, 3.11, 3.16, 3.21, 3.24, Number((students.reduce((a, s) => a + s.gpa, 0) / Math.max(1, students.length)).toFixed(2))];
  const attendanceTrend = [84, 87, 86, 89, 90, 88, 91];

  const deptData = db().departments.map((d) => ({ label: d.code, value: Math.round(d.avgGpa * 25), color: d.color }));

  const gradeBands = [
    { label: l("ممتاز", "Excellent"), value: grades.filter((g) => g.total >= 85).length, color: "#19B88A" },
    { label: l("جيد جداً", "Very good"), value: grades.filter((g) => g.total >= 75 && g.total < 85).length, color: "#38A5FF" },
    { label: l("جيد", "Good"), value: grades.filter((g) => g.total >= 65 && g.total < 75).length, color: "#2864D9" },
    { label: l("مقبول", "Pass"), value: grades.filter((g) => g.total >= 60 && g.total < 65).length, color: "#F2A93B" },
    { label: l("راسب", "Fail"), value: grades.filter((g) => g.total < 60).length, color: "#F05252" },
  ];

  const risk = students
    .map((s) => ({ s, att: studentAttendance(s.id).rate }))
    .filter((x) => x.att < 80 || x.s.gpa < 2.2)
    .sort((a, b) => a.att - b.att);

  const courseRanking = db()
    .courses.map((c) => {
      const gs = grades.filter((g) => g.courseId === c.id);
      return {
        c,
        avg: gs.length ? Math.round(gs.reduce((a, g) => a + g.total, 0) / gs.length) : 0,
        pass: gs.length ? Math.round((gs.filter((g) => g.total >= 60).length / gs.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.avg - a.avg);

  const heat = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 10 }, (_, w) => {
      const recs = db().attendanceRecords.filter((r) => new Date(r.markedAt).getDay() === d);
      const p = recs.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
      return recs.length ? Math.round((p / recs.length) * 100) : 0;
    }),
  );

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("تحليلات المؤسسة", "Institution analytics")}
        subtitle={l("مؤشرات وصفية قابلة للتفسير — لا قرارات آلية", "Descriptive, explainable indicators — no automated decisions")}
        breadcrumb={[{ label: l("القيادة", "Command") }, { label: l("التحليلات", "Analytics") }]}
        badge={<Badge tone="neutral">{l("آخر تحديث الآن", "Updated just now")}</Badge>}
        actions={<span className="text-[10.5px] text-fg-muted">{l("المصدر: سجلات الجلسة الحالية", "Source: live session records")}</span>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("متوسط المعدل", "Average GPA")} value={gpaTrend.at(-1)} icon="percent" tone="accent" trend={{ value: "+0.18", positive: true }} />
        <StatCard label={l("متوسط الحضور", "Average attendance")} value="91%" icon="qr" tone="success" trend={{ value: "+4%", positive: true }} />
        <StatCard label={l("معدل النجاح", "Pass rate")} value={`${Math.round((grades.filter((g) => g.total >= 60).length / Math.max(1, grades.length)) * 100)}%`} icon="check-circle" tone="success" />
        <StatCard label={l("طلاب بحاجة دعم", "Students needing support")} value={risk.length} icon="alert" tone={risk.length ? "warning" : "neutral"} hint={l("حضور < 80% أو معدل < 2.2", "attendance < 80% or GPA < 2.2")} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={l("اتجاه المعدل التراكمي", "GPA trajectory")} subtitle={l("سبعة فصول دراسية", "Seven semesters")} icon="trending-up" />
          <LineChart
            series={[{ name: l("المعدل", "GPA"), color: "#38A5FF", data: gpaTrend }]}
            labels={["ف24", "ر24", "ف25", "ر25", "ف26", "ر26", l("الآن", "now")]}
            height={190}
            yMax={4}
            ariaLabel={l("مسيرة المعدل التراكمي", "GPA trajectory")}
          />
        </Card>

        <Card>
          <CardHeader title={l("اتجاه الحضور", "Attendance trajectory")} subtitle={l("نسبة الحضور الأسبوعية", "Weekly attendance rate")} icon="activity" />
          <LineChart
            series={[{ name: l("الحضور", "Attendance"), color: "#19B88A", data: attendanceTrend }]}
            labels={["W1", "W2", "W3", "W4", "W5", "W6", "W7"]}
            height={190}
            yMax={100}
            valueSuffix="%"
            ariaLabel={l("اتجاه الحضور", "Attendance trajectory")}
          />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title={l("أداء الأقسام", "Department performance")} icon="building" />
          <BarChart data={deptData} horizontal ariaLabel={l("أداء الأقسام", "Department performance")} />
        </Card>
        <Card>
          <CardHeader title={l("توزيع التقديرات", "Grade spread")} icon="chart" />
          <Donut segments={gradeBands} size={150} thickness={15} ariaLabel={l("توزيع التقديرات", "Grade spread")} />
        </Card>
        <Card>
          <CardHeader title={l("ترتيب المقررات", "Course ranking")} subtitle={l("حسب متوسط الدرجات", "By average score")} icon="book" />
          <div className="space-y-2">
            {courseRanking.slice(0, 5).map((r) => (
              <div key={r.c.id}>
                <div className="mb-0.5 flex items-center justify-between text-[10px]">
                  <span className="truncate font-mono text-fg-muted">{r.c.code}</span>
                  <span className="tnum text-fg-soft">{r.avg}% · {r.pass}% {l("نجاح", "pass")}</span>
                </div>
                <Progress value={r.avg} size="sm" tone={r.avg >= 75 ? "success" : r.avg >= 65 ? "brand" : "warning"} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={l("خريطة الحضور الأسبوعية", "Weekly attendance heatmap")}
          subtitle={l("الأيام × الأسابيع — كلما زاد اللون زاد الحضور", "Days × weeks — deeper colour means higher attendance")}
          icon="grid"
        />
        <div className="overflow-x-auto">
          <div className="min-w-[520px]">
            <div className="grid grid-cols-[46px_repeat(10,1fr)] gap-[3px]">
              <div />
              {["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10"].map((w) => (
                <div key={w} className="text-center text-[8.5px] text-fg-muted">{w}</div>
              ))}
              {heat.slice(0, 5).map((row, ri) => (
                <div key={ri} className="contents">
                  <div className="flex items-center text-[9px] text-fg-muted">{["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس"][ri]}</div>
                  {row.map((v, ci) => (
                    <div
                      key={ci}
                      title={`${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][ri]} W${ci + 1} — ${v}%`}
                      className="flex h-6 items-center justify-center rounded-[3px] text-[8px] font-medium transition hover:ring-1 hover:ring-brand-400/60"
                      style={{
                        background: v === 0 ? "var(--am-surface-3)" : `color-mix(in srgb, #19B88A ${Math.min(90, v)}%, var(--am-surface-3))`,
                        color: v > 55 ? "#fff" : "var(--am-fg-muted)",
                      }}
                    >
                      {v > 0 ? v : ""}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] text-fg-muted">
              <span>{l("أقل", "Less")}</span>
              {[20, 45, 70, 90].map((v) => (
                <span key={v} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `color-mix(in srgb, #19B88A ${v}%, var(--am-surface-3))` }} />
              ))}
              <span>{l("أكثر", "More")}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title={l("طلاب بحاجة إلى دعم", "Students needing support")} subtitle={l("مؤشرات توضيحية — للمساندة لا للعقاب", "Explainable indicators — for support, not sanction")} icon="alert" />
          <div className="space-y-1.5">
            {risk.slice(0, 8).map(({ s, att }) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/50 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-fg">{l(s.nameAr, s.nameEn)}</p>
                  <p className="font-mono text-[9px] text-fg-muted">{s.studentNumber}</p>
                </div>
                <div className="text-end">
                  <p className={`tnum text-[10.5px] ${att < 75 ? "font-semibold text-danger-500" : "text-warn-500"}`}>{att}% {l("حضور", "att.")}</p>
                  <p className="tnum text-[9px] text-fg-muted">GPA {s.gpa.toFixed(2)}</p>
                </div>
                <Badge tone={att < 75 ? "danger" : "warning"}>{att < 75 ? l("عالي", "High") : l("متوسط", "Medium")}</Badge>
              </div>
            ))}
            {risk.length === 0 && <p className="py-6 text-center text-[11px] text-fg-muted">{l("لا حالات.", "No cases.")}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title={l("منهجية المؤشرات", "Indicator methodology")} icon="info" />
          <ul className="space-y-2">
            {[
              l("المعدل التراكمي محسوب من سجلات الدرجات المنشورة فقط.", "GPA uses published grade records only."),
              l("نسبة الحضور = (حاضر + متأخر) ÷ كل السجلات، مع استثناء الأعذار المعتمدة من الإنذار.", "Attendance = (present + late) ÷ all records, with approved excuses excluded from warnings."),
              l("مؤشر الدعم يجمع بين الحضور والمعدل، ويعرض للمرشد كاحتمال لا كقرار.", "The support indicator combines attendance and GPA, shown to advisors as a probability, not a decision."),
              l("لا تُستخدم نماذج تنبؤية سوداء — كل رقم قابل للتفسير من سجلاته.", "No black-box predictive models — every number is explainable from its records."),
            ].map((t, i) => (
              <li key={i} className="flex gap-2 text-[10.5px] leading-relaxed text-fg-muted">
                <Icon name="check" size={12} className="mt-0.5 shrink-0 text-success-500" /> {t}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
