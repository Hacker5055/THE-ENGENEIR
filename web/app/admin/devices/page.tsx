import { Badge, Card, CardHeader, Icon, SearchInput, TableWrap, Td, Th } from "@/components/ui";
import { PageHeader, StatCard, ToolbarBar } from "@/components/shells/app-shell";
import { Donut } from "@/components/charts";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { setDeviceTrust } from "@/app/actions/admin";
import { makeL, relTime } from "@/lib/utils";

export const metadata = { title: "الأجهزة والثقة" };

export default async function AdminDevicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  const devices = db().devices.filter((d) => {
    if (sp.status && d.status !== sp.status) return false;
    if (!q) return true;
    const student = db().students.find((s) => s.id === d.studentId);
    return d.label.toLowerCase().includes(q) || d.fingerprint.toLowerCase().includes(q) || (student?.nameAr.includes(q) ?? false) || (student?.studentNumber.includes(q) ?? false);
  });

  const all = db().devices;
  const platform = [
    { label: "Android", value: all.filter((d) => d.platform === "ANDROID").length, color: "#19B88A" },
    { label: "iOS", value: all.filter((d) => d.platform === "IOS").length, color: "#38A5FF" },
    { label: "Web", value: all.filter((d) => d.platform === "WEB").length, color: "#78879B" },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("الأجهزة والثقة", "Devices & trust")}
        subtitle={l("الأجهزة المسجّلة، المُدارة، والموثوقة — أساس منع تبديل الجهاز", "Registered, managed and trusted devices — the basis of device binding")}
        breadcrumb={[{ label: l("العمليات", "Operations") }, { label: l("الأجهزة", "Devices") }]}
        badge={<Badge tone="brand" dot>{all.filter((d) => d.trusted).length} {l("موثوق", "trusted")}</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={l("كل الأجهزة", "All devices")} value={all.length} icon="smartphone" tone="brand" />
        <StatCard label={l("أجهزة مُدارة", "Managed devices")} value={all.filter((d) => d.managed).length} icon="shield-check" tone="success" hint={l("تحكم مؤسسي", "institutional control")} />
        <StatCard label={l("أجهزة شخصية", "Personal devices")} value={all.filter((d) => !d.managed).length} icon="user" tone="warning" hint={l("قيود أقل — سياسة مستقلة", "fewer guarantees")} />
        <StatCard label={l("ملغاة الثقة", "Revoked")} value={all.filter((d) => d.status === "REVOKED").length} icon="x" tone="danger" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <ToolbarBar>
            <form action="/admin/devices" className="flex flex-1 flex-wrap items-center gap-2">
              <SearchInput name="q" defaultValue={sp.q} placeholder={l("بصمة الجهاز أو الطالب…", "Device fingerprint or student…")} className="h-9 w-full max-w-[280px]" />
              <select name="status" defaultValue={sp.status ?? ""} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[11.5px] text-fg-soft">
                <option value="">{l("كل الحالات", "Any status")}</option>
                <option value="ACTIVE">{l("نشط", "Active")}</option>
                <option value="REVOKED">{l("ملغى", "Revoked")}</option>
              </select>
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-[12px] font-semibold text-fg-soft hover:text-fg">
                <Icon name="filter" size={13} /> {l("تصفية", "Filter")}
              </button>
            </form>
            <span className="text-[11.5px] text-fg-muted">{devices.length} {l("جهازاً", "devices")}</span>
          </ToolbarBar>

          <Card padded={false} className="overflow-hidden">
            <TableWrap>
              <thead>
                <tr>
                  <Th>{l("الجهاز", "Device")}</Th>
                  <Th>{l("الطالب", "Student")}</Th>
                  <Th align="center">{l("النوع", "Platform")}</Th>
                  <Th align="center">{l("الثقة", "Trust")}</Th>
                  <Th align="center">{l("آخر ظهور", "Last seen")}</Th>
                  <Th align="end">{l("إجراء", "Action")}</Th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const student = db().students.find((s) => s.id === d.studentId);
                  return (
                    <tr key={d.id} className="transition hover:bg-surface-2/60">
                      <Td>
                        <p className="text-[11px] font-medium text-fg">{d.label}</p>
                        <p className="font-mono text-[8.5px] text-fg-muted">{d.fingerprint}</p>
                        <div className="mt-0.5 flex gap-1">
                          {d.managed && <Badge tone="success">{l("مُدار", "Managed")}</Badge>}
                          {!d.managed && <Badge tone="neutral">{l("شخصي", "Personal")}</Badge>}
                        </div>
                      </Td>
                      <Td>
                        <p className="truncate text-[10.5px] text-fg-soft">{student ? l(student.nameAr, student.nameEn) : d.studentId}</p>
                        <p className="font-mono text-[9px] text-fg-muted">{student?.studentNumber}</p>
                      </Td>
                      <Td align="center"><Badge tone="neutral">{d.platform}</Badge></Td>
                      <Td align="center">
                        <Badge tone={d.status === "REVOKED" ? "danger" : d.trusted ? "success" : "warning"} dot>
                          {d.status === "REVOKED" ? l("ملغى", "Revoked") : d.trusted ? l("موثوق", "Trusted") : l("غير موثوق", "Untrusted")}
                        </Badge>
                      </Td>
                      <Td align="center"><span className="text-[9.5px] text-fg-muted">{relTime(d.lastSeenAt, locale)}</span></Td>
                      <Td align="end">
                        <form action={setDeviceTrust}>
                          <input type="hidden" name="deviceId" value={d.id} />
                          <input type="hidden" name="op" value={d.status === "ACTIVE" ? "revoke" : "trust"} />
                          <button
                            type="submit"
                            className={`inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition ${
                              d.status === "ACTIVE"
                                ? "border-danger-500/40 bg-danger-500/[0.08] text-danger-500 hover:bg-danger-500/[0.14]"
                                : "border-success-500/40 bg-success-500/[0.08] text-success-500 hover:bg-success-500/[0.14]"
                            }`}
                          >
                            <Icon name={d.status === "ACTIVE" ? "x" : "check"} size={11} />
                            {d.status === "ACTIVE" ? l("إلغاء الثقة", "Revoke") : l("اعتماد", "Trust")}
                          </button>
                        </form>
                      </Td>
                    </tr>
                  );
                })}
                {devices.length === 0 && <tr><Td colSpan={6} className="py-8 text-center text-[11.5px] text-fg-muted">{l("لا أجهزة مطابقة.", "No matching devices.")}</Td></tr>}
              </tbody>
            </TableWrap>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("المنصات", "Platforms")} icon="smartphone" />
            <Donut segments={platform} size={110} thickness={12} ariaLabel={l("توزيع المنصات", "Platform distribution")} />
          </Card>

          <Card>
            <CardHeader title={l("ما يعنيه «مُدار»", "What “managed” means")} icon="info" />
            <p className="text-[10px] leading-relaxed text-fg-muted">
              {l(
                "الجهاز المُدار مملوك للمؤسسة ويديره MDM (مثل Android Enterprise أو Apple School Manager)، ويمكن تقييد التطبيقات واللقطات وكاميرا أمامية أثناء الاختبار. الجهاز الشخصي لا يمنح هذه الضمانات — لذلك لا نَعد بحجز كامل للجهاز، ونكتفي بأحداث الحالة وتوثيقها.",
                "A managed device is institution-owned and controlled by MDM (e.g. Android Enterprise or Apple School Manager), which can restrict apps, screenshots and the front camera during an examination. A personal device gives none of those guarantees — so we never promise full lockdown, only device-state events with an audit trail.",
              )}
            </p>
            <div className="mt-2 space-y-1.5">
              {[
                { t: l("مُدار: قيود تقنية", "Managed: technical limits"), ok: true },
                { t: l("شخصي: كشف + توثيق فقط", "Personal: detection + evidence only"), ok: false },
              ].map((x) => (
                <p key={x.t} className="flex items-center gap-1.5 text-[10px] text-fg-soft">
                  <Icon name={x.ok ? "check-circle" : "info"} size={11} className={x.ok ? "text-success-500" : "text-warn-500"} /> {x.t}
                </p>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={l("أثر التدقيق", "Audit impact")} icon="list-checks" />
            <p className="text-[9.5px] leading-relaxed text-fg-muted">
              {l("كل اعتماد أو إلغاء ثقة يُسجَّل باسم المنفّذ والوقت والجهاز. إلغاء الثقة يمنع الدخول للاختبارات المقيّدة فقط، ولا يمنع التطبيق العادي.", "Every trust change records the actor, time and device. Revoking trust blocks restricted examinations only — never normal app use.")}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
