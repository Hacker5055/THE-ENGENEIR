import { Avatar, Badge, Card, CardHeader, Icon, KeyValue } from "@/components/ui";
import { PageHeader, StatCard } from "@/components/shells/app-shell";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { ROLE_LABEL, ROLE_PERMISSIONS } from "@/lib/permissions";
import type { Permission, Role } from "@/lib/types";
import { makeL } from "@/lib/utils";

export const metadata = { title: "الأدوار والصلاحيات" };

const PERMISSION_GROUPS: { ar: string; en: string; items: { key: Permission; ar: string; en: string }[] }[] = [
  {
    ar: "المؤسسة والمستخدمون",
    en: "Institution & users",
    items: [
      { key: "institution.manage", ar: "إدارة المؤسسات", en: "Manage institutions" },
      { key: "user.manage", ar: "إدارة المستخدمين", en: "Manage users" },
      { key: "role.manage", ar: "إدارة الأدوار", en: "Manage roles" },
      { key: "settings.manage", ar: "إعدادات المؤسسة", en: "Institution settings" },
      { key: "audit.view", ar: "قراءة سجل التدقيق", en: "Read audit log" },
      { key: "report.export", ar: "تصدير التقارير", en: "Export reports" },
    ],
  },
  {
    ar: "البيانات الأكاديمية",
    en: "Academic data",
    items: [
      { key: "student.view_all", ar: "قراءة كل الطلاب", en: "Read all students" },
      { key: "teacher.view_all", ar: "قراءة هيئة التدريس", en: "Read faculty" },
      { key: "academic.manage", ar: "إدارة المقررات والجداول", en: "Manage courses & timetable" },
      { key: "grade.view_all", ar: "قراءة كل الدرجات", en: "Read all grades" },
      { key: "grade.edit", ar: "تعديل الدرجات", en: "Edit grades" },
    ],
  },
  {
    ar: "الاختبارات والحضور",
    en: "Exams & attendance",
    items: [
      { key: "exam.manage", ar: "إنشاء الاختبارات", en: "Create examinations" },
      { key: "exam.monitor", ar: "مراقبة مباشرة", en: "Live monitoring" },
      { key: "exam.incident.decide", ar: "قرار الحوادث", en: "Decide incidents" },
      { key: "question.manage", ar: "بنك الأسئلة", en: "Question bank" },
      { key: "attendance.record", ar: "تسجيل الحضور", en: "Record attendance" },
      { key: "attendance.view_all", ar: "قراءة كل الحضور", en: "Read all attendance" },
    ],
  },
  {
    ar: "العمليات",
    en: "Operations",
    items: [
      { key: "device.manage", ar: "إدارة الأجهزة", en: "Manage devices" },
      { key: "complaint.manage", ar: "إدارة الطلبات", en: "Manage requests" },
      { key: "notification.manage", ar: "إرسال التعميمات", en: "Send broadcasts" },
      { key: "self.read", ar: "قراءة بيانات الذات", en: "Read own data" },
    ],
  },
];

const ROLES: Role[] = ["SUPER_ADMIN", "INSTITUTION_ADMIN", "EXAM_SUPERVISOR", "TEACHER", "STUDENT"];

export default async function AdminRolesPage() {
  const { user, locale } = await adminContext();
  const l = makeL(locale);

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الأدوار والصلاحيات", "Roles & permissions")}
        subtitle={l("مصفوفة صلاحيات واحدة تحكم الواجهة والخادم معاً — لا استثناءات في الكود", "One permission matrix governs UI and server alike — no hard-coded exceptions")}
        breadcrumb={[{ label: l("الحوكمة", "Governance") }, { label: l("الأدوار", "Roles") }]}
        badge={<Badge tone="brand" dot>{user.role}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("الأدوار", "Roles")} value={ROLES.length} icon="key" tone="brand" />
        <StatCard label={l("الصلاحيات", "Permissions")} value={new Set(Object.values(ROLE_PERMISSIONS).flat()).size} icon="lock" tone="accent" />
        <StatCard label={l("المستخدمون", "Users")} value={db().users.length} icon="users" tone="neutral" />
        <StatCard label={l("أدوار نظامية", "System roles")} value={db().roles.filter((r) => r.system).length} icon="shield-check" tone="success" hint={l("غير قابلة للحذف", "cannot be deleted")} />
      </section>

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {ROLES.map((r) => {
          const def = db().roles.find((x) => x.role === r);
          const perms = ROLE_PERMISSIONS[r];
          const users = db().users.filter((u) => u.role === r);
          return (
            <Card key={r}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-fg">{l(ROLE_LABEL[r].ar, ROLE_LABEL[r].en)}</p>
                  <p className="font-mono text-[9px] text-fg-muted">{r}</p>
                </div>
                <Badge tone={r === "SUPER_ADMIN" ? "danger" : r === "INSTITUTION_ADMIN" ? "brand" : r === "EXAM_SUPERVISOR" ? "warning" : "neutral"}>
                  {perms.length} {l("صلاحية", "perms")}
                </Badge>
              </div>
              {def && <p className="mt-1.5 text-[10px] leading-relaxed text-fg-muted">{l(def.descriptionAr, def.descriptionEn)}</p>}
              <div className="mt-2 flex items-center gap-1.5">
                <div className="flex -space-x-1.5 rtl:space-x-reverse">
                  {users.slice(0, 3).map((u) => <Avatar key={u.id} name={u.nameAr} size={22} />)}
                </div>
                <span className="text-[9.5px] text-fg-muted">{users.length} {l("مستخدماً", "users")}</span>
                {def?.system && <Badge tone="neutral">{l("نظامي", "System")}</Badge>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card padded={false} className="overflow-hidden">
        <CardHeader title={l("مصفوفة الصلاحيات", "Permission matrix")} subtitle={l("✓ = مسموح على الخادم والواجهة", "✓ = allowed on server and UI")} icon="lock" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[10.5px]">
            <thead>
              <tr className="border-y border-line bg-surface-2/60">
                <th className="px-4 py-2 text-start text-[10px] font-semibold text-fg-muted">{l("الصلاحية", "Permission")}</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2 text-center text-[9px] font-semibold text-fg-muted">
                    {l(ROLE_LABEL[r].ar, ROLE_LABEL[r].en)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((g) => (
                <tr key={g.ar} className="contents">
                  <tr>
                    <td colSpan={ROLES.length + 1} className="bg-surface-2/40 px-4 py-1 text-[9.5px] font-semibold uppercase tracking-wide text-fg-muted">
                      {l(g.ar, g.en)}
                    </td>
                  </tr>
                  {g.items.map((p) => (
                    <tr key={p.key} className="border-b border-line/60">
                      <td className="px-4 py-1.5">
                        <span className="text-[10.5px] text-fg-soft">{l(p.ar, p.en)}</span>
                        <span className="ms-1.5 font-mono text-[8.5px] text-fg-muted">{p.key}</span>
                      </td>
                      {ROLES.map((r) => {
                        const on = ROLE_PERMISSIONS[r].includes(p.key);
                        return (
                          <td key={r} className="px-2 py-1.5 text-center">
                            {on ? (
                              <Icon name="check" size={12} className="mx-auto text-success-500" />
                            ) : (
                              <span className="mx-auto block h-px w-2 bg-line-strong" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={l("مبادئ التصميم", "Design principles")} icon="shield-check" />
          <ul className="space-y-2">
            {[
              l("الحد الأدنى من الصلاحية: الدور يحصل على ما يحتاجه فقط.", "Least privilege: a role gets only what it needs."),
              l("الخادم هو الحكم: إخفاء زر ليس حماية — كل عملية تُفحص من جديد.", "The server is the judge: hiding a button is not protection — every mutation is re-checked."),
              l("فصل المهام: من ينشئ الاختبار لا يعتمد نتيجة الحوادث.", "Separation of duties: whoever authors an exam does not decide incidents."),
              l("كل تفويض جديد يُسجَّل في التدقيق باسم المفوّض.", "Every new grant is audited with the granting actor."),
            ].map((x, i) => (
              <li key={i} className="flex gap-2 text-[10.5px] leading-relaxed text-fg-muted">
                <Icon name="check-circle" size={12} className="mt-0.5 shrink-0 text-success-500" /> {x}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title={l("قيود التعديل", "Change constraints")} icon="lock" />
          <div className="space-y-2">
            <KeyValue label={l("أدوار النظام", "System roles")} value={l("غير قابلة للحذف أو إعادة التسمية", "Cannot be deleted or renamed")} />
            <KeyValue label={l("إضافة صلاحية", "Grant permission")} value={l("تتطلب دور role.manage + تدقيق", "Requires role.manage + audit")} />
            <KeyValue label={l("تعديل صلاحية", "Modify permission")} value={l("لا يسري على الجلسات القائمة", "Does not affect existing sessions")} />
            <KeyValue label={l("حسابك", "Your account")} value={`${user.nameAr} · ${user.role}`} />
          </div>
          <div className="mt-2.5 rounded-lg border border-warn-500/25 bg-warn-500/[0.06] px-2.5 py-2">
            <p className="text-[9.5px] leading-relaxed text-fg-muted">
              {l("في هذه النسخة، مصفوفة الصلاحيات ثابتة في الكود (lib/permissions.ts) وتُطابق مواصفة الـ API — التحرير من الواجهة معطّل عن قصد لضمان الاتساق.", "In this build the matrix is fixed in code (lib/permissions.ts) and matches the API specification — UI editing is intentionally disabled for consistency.")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
