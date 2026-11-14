import { Badge, Card, CardHeader, Icon, KeyValue, Progress, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { BarChart } from "@/components/charts";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { updateInstitutionStatus } from "@/app/actions/admin";
import { makeL } from "@/lib/utils";

export const metadata = { title: "المؤسسات" };

const PLAN_LABEL = { Enterprise: { ar: "مؤسسي", en: "Enterprise" }, Campus: { ar: "حرم جامعي", en: "Campus" }, Institute: { ar: "معهد", en: "Institute" } };
const STATUS_LABEL = {
  ACTIVE: { ar: "نشطة", en: "Active", tone: "success" as const },
  TRIAL: { ar: "تجريبية", en: "Trial", tone: "warning" as const },
  SUSPENDED: { ar: "موقوفة", en: "Suspended", tone: "danger" as const },
};

export default async function AdminInstitutionsPage() {
  const { user, locale } = await adminContext();
  const l = makeL(locale);
  const canManage = user.role === "SUPER_ADMIN";
  const institutions = db().institutions;

  const byPlan = ["Enterprise", "Campus", "Institute"].map((p, i) => ({
    label: l(PLAN_LABEL[p as keyof typeof PLAN_LABEL].ar, PLAN_LABEL[p as keyof typeof PLAN_LABEL].en),
    value: institutions.filter((x) => x.plan === p).reduce((a, x) => a + x.students, 0),
    color: ["#2864D9", "#38A5FF", "#19B88A"][i],
  }));

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("المؤسسات على المنصة", "Institutions on the platform")}
        subtitle={l("عزل البيانات لكل مؤسسة، وحصص المستخدمين والخطط", "Per-institution data isolation, seat counts and plans")}
        breadcrumb={[{ label: l("الحوكمة", "Governance") }, { label: l("المؤسسات", "Institutions") }]}
        badge={<Badge tone={canManage ? "brand" : "neutral"} dot>{user.role === "SUPER_ADMIN" ? l("مدير المنصة", "Super admin") : l("قراءة فقط", "Read only")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("المؤسسات", "Institutions")} value={institutions.length} icon="globe" tone="brand" />
        <StatCard label={l("الطلاب", "Students")} value={institutions.reduce((a, i) => a + i.students, 0)} icon="users" tone="accent" />
        <StatCard label={l("هيئة التدريس", "Faculty")} value={institutions.reduce((a, i) => a + i.teachers, 0)} icon="id-card" tone="neutral" />
        <StatCard label={l("تجريبية", "Trials")} value={institutions.filter((i) => i.status === "TRIAL").length} icon="timer" tone="warning" />
      </section>

      {!canManage && (
        <div className="rounded-lg border border-line bg-surface-2/60 px-4 py-2.5 text-[11.5px] text-fg-muted">
          <Icon name="lock" size={13} className="me-1 inline" />
          {l("عرض المؤسسات متاح للقراءة؛ تغيير الحالة يتطلب دور مدير المنصة (institution.manage).", "Institution listing is read-only here; status changes require the super-admin role (institution.manage).")}
        </div>
      )}

      <Card padded={false} className="overflow-hidden">
        <TableWrap>
          <thead>
            <tr>
              <Th>{l("المؤسسة", "Institution")}</Th>
              <Th>{l("المدينة / النطاق", "City / domain")}</Th>
              <Th align="center">{l("الطلاب", "Students")}</Th>
              <Th align="center">{l("هيئة التدريس", "Faculty")}</Th>
              <Th align="center">{l("الأقسام", "Departments")}</Th>
              <Th align="center">{l("الخطة", "Plan")}</Th>
              <Th align="center">{l("الحالة", "Status")}</Th>
              {canManage && <Th align="end">{l("إجراء", "Action")}</Th>}
            </tr>
          </thead>
          <tbody>
            {institutions.map((i) => {
              const st = STATUS_LABEL[i.status];
              const seats = i.plan === "Enterprise" ? 20000 : i.plan === "Campus" ? 8000 : 2500;
              return (
                <tr key={i.id} className="transition hover:bg-surface-2/60">
                  <Td>
                    <p className="text-[11.5px] font-medium text-fg">{l(i.nameAr, i.nameEn)}</p>
                    <p className="font-mono text-[9px] text-fg-muted">{i.code}</p>
                  </Td>
                  <Td>
                    <p className="text-[10.5px] text-fg-soft">{i.city}</p>
                    <p className="font-mono text-[9px] text-fg-muted">{i.domain}</p>
                  </Td>
                  <Td align="center">
                    <span className="tnum text-[10.5px] text-fg-soft">{i.students}</span>
                    <div className="mx-auto mt-0.5 w-14"><Progress value={Math.min(100, (i.students / seats) * 100)} size="sm" tone={i.students / seats > 0.85 ? "warning" : "brand"} /></div>
                  </Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{i.teachers}</span></Td>
                  <Td align="center"><span className="tnum text-[10.5px] text-fg-soft">{i.departments}</span></Td>
                  <Td align="center"><Badge tone="neutral">{l(PLAN_LABEL[i.plan].ar, PLAN_LABEL[i.plan].en)}</Badge></Td>
                  <Td align="center"><Badge tone={st.tone} dot>{l(st.ar, st.en)}</Badge></Td>
                  {canManage && (
                    <Td align="end">
                      <form action={updateInstitutionStatus} className="flex items-center justify-end gap-1">
                        <input type="hidden" name="id" value={i.id} />
                        <select name="status" defaultValue={i.status} className="h-7 rounded-md border border-line-strong bg-surface px-1 text-[9.5px] text-fg-soft">
                          <option value="ACTIVE">{l("نشطة", "Active")}</option>
                          <option value="TRIAL">{l("تجريبية", "Trial")}</option>
                          <option value="SUSPENDED">{l("موقوفة", "Suspended")}</option>
                        </select>
                        <button type="submit" className="grid h-7 w-7 place-items-center rounded-md border border-line-strong bg-surface text-fg-soft hover:text-brand-500" aria-label={l("تحديث", "Update")}>
                          <Icon name="check" size={12} />
                        </button>
                      </form>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={l("توزيع الطلاب حسب الخطة", "Students by plan")} icon="chart" />
          <BarChart data={byPlan} horizontal ariaLabel={l("توزيع الطلاب حسب الخطة", "Students by plan")} />
          <p className="mt-2 text-[9.5px] text-fg-muted">
            {l("السعة تُحسب على حدود الخطة؛ تخطي 85% يطلق تنبيهاً للترقية.", "Seats follow plan limits; crossing 85% raises an upgrade alert.")}
          </p>
        </Card>

        <Card>
          <CardHeader title={l("عزل البيانات", "Tenancy isolation")} icon="shield-check" />
          <div className="space-y-2">
            <KeyValue label={l("نموذج العزل", "Isolation model")} value={l("مستأجر مشترك + مؤسسة إلزامية", "Shared schema + mandatory institution scope")} />
            <KeyValue label={l("مفتاح العزل", "Scope key")} value="institution_id" mono />
            <KeyValue label={l("التحقق", "Enforcement")} value={l("في كل استعلام خادم وAPI", "Every server query and API call")} />
            <KeyValue label={l("النسخ الاحتياطي", "Backups")} value={l("مشفّر، لكل مؤسسة", "Encrypted, per institution")} />
          </div>
          <ul className="mt-2 space-y-1 text-[9.5px] leading-relaxed text-fg-muted">
            <li>· {l("لا استعلام بدون سياق مؤسسة — يُرفض الطلب عند الغياب.", "No query runs without institution context — it is rejected otherwise.")}</li>
            <li>· {l("اختبارات العزل مطلوبة قبل كل نشر.", "Isolation tests are required before every release.")}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
