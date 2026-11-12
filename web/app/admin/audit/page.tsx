import { Badge, Card, CardHeader, EmptyState, Icon, SearchInput, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard, ToolbarBar } from "@/components/shells/app-shell";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { fmtDateTime, makeL } from "@/lib/utils";

export const metadata = { title: "سجل التدقيق" };

const SEV = {
  INFO: { ar: "معلومة", en: "Info", tone: "neutral" as const },
  WARNING: { ar: "تحذير", en: "Warning", tone: "warning" as const },
  CRITICAL: { ar: "حرج", en: "Critical", tone: "danger" as const },
};

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ sev?: string; q?: string; role?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const all = [...db().auditLogs].sort((a, b) => b.at - a.at);
  const list = all.filter((a) => {
    if (sp.sev && a.severity !== sp.sev) return false;
    if (sp.role && a.actorRole !== sp.role) return false;
    if (!q) return true;
    return a.actionAr.includes(sp.q!) || a.action.includes(q) || a.actorName.includes(sp.q!) || a.target.toLowerCase().includes(q) || (a.reason ?? "").toLowerCase().includes(q);
  });

  const actions = new Set(all.map((a) => a.action)).size;
  const actors = new Set(all.map((a) => a.actorId)).size;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("سجل التدقيق", "Audit log")}
        subtitle={l("كل إجراء حساس: من فعله، متى، على ماذا، ولماذا", "Every sensitive action: who, when, on what, and why")}
        breadcrumb={[{ label: l("الحوكمة", "Governance") }, { label: l("التدقيق", "Audit") }]}
        badge={<Badge tone="neutral">{all.length} {l("قيداً", "entries")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("كل القيود", "Total entries")} value={all.length} icon="list-checks" tone="brand" />
        <StatCard label={l("أنواع الإجراءات", "Distinct actions")} value={actions} icon="layers" tone="accent" />
        <StatCard label={l("المنفّذون", "Actors")} value={actors} icon="users" tone="neutral" />
        <StatCard label={l("إجراءات حرجة", "Critical actions")} value={all.filter((a) => a.severity === "CRITICAL").length} icon="shield-alert" tone="danger" />
      </section>

      <ToolbarBar>
        <form action="/admin/audit" className="flex flex-1 flex-wrap items-center gap-2">
          <SearchInput name="q" defaultValue={sp.q} placeholder={l("إجراء، منفّذ، هدف، أو سبب…", "Action, actor, target, reason…")} className="h-9 w-full max-w-[280px]" />
          <select name="sev" defaultValue={sp.sev ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل المستويات", "Any severity")}</option>
            <option value="INFO">{l("معلومة", "Info")}</option>
            <option value="WARNING">{l("تحذير", "Warning")}</option>
            <option value="CRITICAL">{l("حرج", "Critical")}</option>
          </select>
          <select name="role" defaultValue={sp.role ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
            <option value="">{l("كل الأدوار", "Any role")}</option>
            {["STUDENT", "TEACHER", "EXAM_SUPERVISOR", "INSTITUTION_ADMIN", "SUPER_ADMIN"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
            <Icon name="filter" size={13} /> {l("تصفية", "Filter")}
          </button>
        </form>
        <span className="text-[11.5px] text-fg-muted">{list.length} {l("قيداً", "entries")}</span>
      </ToolbarBar>

      <Card padded={false} className="overflow-hidden">
        {list.length === 0 ? (
          <EmptyState icon="list-checks" title={l("لا قيود", "No entries")} description={l("غيّر التصفية.", "Change the filter.")} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{l("الوقت", "Time")}</Th>
                <Th>{l("الإجراء", "Action")}</Th>
                <Th>{l("المنفّذ", "Actor")}</Th>
                <Th>{l("الهدف", "Target")}</Th>
                <Th>{l("السبب", "Reason")}</Th>
                <Th align="center">IP</Th>
                <Th align="end">{l("الخطورة", "Severity")}</Th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 80).map((a) => (
                <tr key={a.id} className="transition hover:bg-surface-2/60">
                  <Td>
                    <p className="text-[10px] text-fg-soft">{fmtDateTime(a.at, locale)}</p>
                    <p className="font-mono text-[8.5px] text-fg-muted">{a.id}</p>
                  </Td>
                  <Td>
                    <p className="text-[10.5px] font-medium text-fg">{a.actionAr}</p>
                    <p className="font-mono text-[9px] text-fg-muted">{a.action}</p>
                  </Td>
                  <Td>
                    <p className="text-[10.5px] text-fg-soft">{a.actorName}</p>
                    <p className="font-mono text-[8.5px] text-fg-muted">{a.actorRole}</p>
                  </Td>
                  <Td><p className="max-w-[220px] truncate font-mono text-[9.5px] text-fg-muted">{a.target}</p></Td>
                  <Td><p className="max-w-[220px] truncate text-[9.5px] text-fg-muted">{a.reason ?? "—"}</p></Td>
                  <Td align="center"><span className="font-mono text-[9px] text-fg-muted">{a.ip}</span></Td>
                  <Td align="end"><Badge tone={SEV[a.severity].tone}>{l(SEV[a.severity].ar, SEV[a.severity].en)}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        {list.length > 80 && <p className="px-4 py-2.5 text-[10px] text-fg-muted">{l(`تُعرض أول 80 من ${list.length} — صدّر التقرير للباقي.`, `Showing first 80 of ${list.length} — export for the rest.`)}</p>}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: l("غير قابل للتعديل", "Append-only"), d: l("لا يمكن حذف أو تعديل أي قيد — الإصلاح يتم بقيد جديد يشرح التغيير.", "Entries can never be deleted or edited — corrections are new entries explaining the change.") },
          { t: l("سياسة الاحتفاظ", "Retention"), d: l("قيود الاختبارات والحوادث: 5 سنوات. قيود الدخول: 18 شهراً.", "Examination and incident entries: 5 years. Sign-in entries: 18 months.") },
          { t: l("الوصول", "Access"), d: l("مراقب الاختبارات يقرأ، المدير يقرأ، المدير الأعلى يقرأ ويصدّر. لا يكتب أحد.", "Supervisors read, admins read, super admins read and export. Nobody writes.") },
        ].map((x) => (
          <Card key={x.t}>
            <p className="text-[11px] font-semibold text-fg">{x.t}</p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-fg-muted">{x.d}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
