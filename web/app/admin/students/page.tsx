import Link from "next/link";
import { Avatar, Badge, Card, EmptyState, Icon, Progress, SearchInput, Select, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard, ToolbarBar } from "@/components/shells/app-shell";
import { db, findDepartment, studentAttendance } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { makeL } from "@/lib/utils";

export const metadata = { title: "الطلاب" };

const STANDING: Record<string, { ar: string; en: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  ACTIVE: { ar: "منتظم", en: "Active", tone: "success" },
  PROBATION: { ar: "إنذار أكاديمي", en: "Probation", tone: "warning" },
  SUSPENDED: { ar: "موقوف", en: "Suspended", tone: "danger" },
  GRADUATED: { ar: "متخرج", en: "Graduated", tone: "neutral" },
};

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; dept?: string; status?: string; level?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const rows = db().students.filter((s) => {
    if (q && !s.nameAr.toLowerCase().includes(q) && !s.nameEn.toLowerCase().includes(q) && !s.studentNumber.includes(q)) return false;
    if (sp.dept && s.departmentId !== sp.dept) return false;
    if (sp.status && s.academicStatus !== sp.status) return false;
    if (sp.level && String(s.level) !== sp.level) return false;
    return true;
  });

  const all = db().students;
  const avgGpa = (all.reduce((a, s) => a + s.gpa, 0) / Math.max(1, all.length)).toFixed(2);
  const probation = all.filter((s) => s.academicStatus === "PROBATION").length;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("سجل الطلاب", "Student registry")}
        subtitle={l("بحث، تصفية، ومتابعة الحالة الأكاديمية والحضور", "Search, filter, and track standing and attendance")}
        breadcrumb={[{ label: l("الشؤون الأكاديمية", "Academics") }, { label: l("الطلاب", "Students") }]}
        actions={<Badge tone="neutral">{all.length} {l("طالباً", "students")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("إجمالي الطلاب", "Total students")} value={all.length} icon="users" tone="brand" />
        <StatCard label={l("متوسط المعدل", "Average GPA")} value={avgGpa} icon="percent" tone="accent" />
        <StatCard label={l("إنذارات أكاديمية", "Probation")} value={probation} icon="alert" tone={probation ? "warning" : "success"} />
        <StatCard label={l("الأقسام", "Departments")} value={db().departments.length} icon="building" tone="neutral" />
      </section>

      <ToolbarBar>
        <form action="/admin/students" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput name="q" defaultValue={sp.q} placeholder={l("اسم أو رقم أكاديمي…", "Name or student number…")} className="h-9 w-full max-w-[240px]" />
          <Select name="dept" defaultValue={sp.dept ?? ""} className="h-9 w-auto">
            <option value="">{l("كل الأقسام", "All departments")}</option>
            {db().departments.map((d) => (
              <option key={d.id} value={d.id}>{l(d.nameAr, d.nameEn)}</option>
            ))}
          </Select>
          <Select name="level" defaultValue={sp.level ?? ""} className="h-9 w-auto">
            <option value="">{l("كل المستويات", "All levels")}</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{l(`المستوى ${n}`, `Level ${n}`)}</option>)}
          </Select>
          <Select name="status" defaultValue={sp.status ?? ""} className="h-9 w-auto">
            <option value="">{l("كل الحالات", "Any standing")}</option>
            <option value="ACTIVE">{l("منتظم", "Active")}</option>
            <option value="PROBATION">{l("إنذار", "Probation")}</option>
            <option value="SUSPENDED">{l("موقوف", "Suspended")}</option>
            <option value="GRADUATED">{l("متخرج", "Graduated")}</option>
          </Select>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={13} /> {l("تطبيق", "Apply")}
          </button>
          {(q || sp.dept || sp.status || sp.level) && <Link href="/admin/students" className="text-[11.5px] text-fg-muted hover:text-fg">{l("مسح", "Clear")}</Link>}
        </form>
        <span className="text-[11.5px] text-fg-muted">{rows.length} {l("نتيجة", "results")}</span>
      </ToolbarBar>

      <Card padded={false} className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="users" title={l("لا طلاب مطابقون", "No matching students")} description={l("غيّر عوامل التصفية.", "Adjust the filters.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("الطالب", "Student")}</Th>
                <Th>{l("القسم", "Department")}</Th>
                <Th align="center">{l("المستوى", "Level")}</Th>
                <Th align="center">{l("المعدل", "GPA")}</Th>
                <Th>{l("الحضور", "Attendance")}</Th>
                <Th align="center">{l("الحالة", "Standing")}</Th>
                <Th align="end" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((s) => {
                const dept = findDepartment(s.departmentId);
                const att = studentAttendance(s.id);
                return (
                  <tr key={s.id} className="transition hover:bg-surface-2/60">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={s.nameAr} size={26} />
                        <div className="min-w-0">
                          <p className="truncate text-[11.5px] font-medium text-fg">{l(s.nameAr, s.nameEn)}</p>
                          <p className="font-mono text-[9px] text-fg-muted">{s.studentNumber}</p>
                        </div>
                      </div>
                    </Td>
                    <Td><span className="text-[10.5px] text-fg-soft">{dept ? l(dept.nameAr, dept.nameEn) : "—"}</span></Td>
                    <Td align="center"><span className="tnum text-[11px] text-fg-soft">{s.level}</span></Td>
                    <Td align="center"><span className={`tnum text-[11.5px] font-semibold ${s.gpa >= 3 ? "text-success-500" : s.gpa >= 2 ? "text-fg" : "text-warn-500"}`}>{s.gpa.toFixed(2)}</span></Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-16"><Progress value={att.rate} size="sm" tone={att.rate >= 85 ? "success" : att.rate >= 75 ? "warning" : "danger"} /></div>
                        <span className="tnum text-[10px] text-fg-muted">{att.rate}%</span>
                      </div>
                    </Td>
                    <Td align="center"><Badge tone={STANDING[s.academicStatus].tone} dot>{l(STANDING[s.academicStatus].ar, STANDING[s.academicStatus].en)}</Badge></Td>
                    <Td align="end">
                      <Link href={`/admin/students/${s.id}`} className="text-[10.5px] font-semibold text-brand-500 hover:underline">{l("ملف", "Open")}</Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
        {rows.length > 40 && <p className="px-4 py-2.5 text-[10px] text-fg-muted">{l(`تُعرض أول 40 من ${rows.length} — استخدم التصفية.`, `Showing first 40 of ${rows.length} — refine the filters.`)}</p>}
      </Card>

      <p className="text-center text-[9.5px] text-fg-muted">
        {l("عرض البيانات وفق مبدأ الحد الأدنى: لا تُعرض بيانات الاتصال الكاملة في القوائم.", "Least-privilege display: full contact data is never shown in list views.")}
      </p>
    </div>
  );
}
