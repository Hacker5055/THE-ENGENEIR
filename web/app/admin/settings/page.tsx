import { Badge, Card, CardHeader, Field, Icon, Input, KeyValue, Select } from "@/components/ui";
import { PageHeader } from "@/components/shells/app-shell";
import { db } from "@/lib/server/store";
import { adminContext } from "@/lib/server/context";
import { saveInstitutionSettings } from "@/app/actions/admin";
import { makeL } from "@/lib/utils";

export const metadata = { title: "إعدادات المؤسسة" };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { user, locale } = await adminContext();
  const l = makeL(locale);
  const sp = await searchParams;
  const s = db().settings;
  const canEdit = user.role === "INSTITUTION_ADMIN" || user.role === "SUPER_ADMIN";

  const toggles: { name: string; label: string; desc: string; checked: boolean }[] = [
    { name: "requireTwoFactor", label: l("إلزام التحقق بخطوتين", "Require two-factor authentication"), desc: l("لكل الأدوار الإدارية وهيئة التدريس", "For administrative roles and faculty"), checked: s.requireTwoFactor },
    { name: "requireDeviceBinding", label: l("ربط الجهاز إلزامي للاختبارات المقيّدة", "Device binding required for restricted exams"), desc: l("جهاز مسجّل واحد لكل طالب لكل اختبار", "One registered device per student per exam"), checked: s.requireDeviceBinding },
    { name: "notifyAbsence", label: l("إشعار الغياب التلقائي", "Automatic absence notification"), desc: l("إشعار الطالب والمرشد عند تجاوز حد الغياب", "Notify student and advisor past the absence cap"), checked: s.notifyAbsence },
    { name: "allowPersonalDevices", label: l("السماح بالأجهزة الشخصية", "Allow personal devices"), desc: l("مع سياسة كشف وتوثيق لا حجز كامل", "With detection and evidence, not full lockdown"), checked: s.allowPersonalDevices },
  ];

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title={l("إعدادات المؤسسة", "Institution settings")}
        subtitle={l("الهوية، السياسات الأكاديمية، وضوابط الأمان", "Identity, academic policies, and security controls")}
        breadcrumb={[{ label: l("الحوكمة", "Governance") }, { label: l("الإعدادات", "Settings") }]}
        badge={<Badge tone="neutral" dot>{s.domain}</Badge>}
      />

      {sp.saved && (
        <div className="rounded-lg border border-success-500/30 bg-success-500/[0.08] px-4 py-2.5 text-[12px] text-success-500">
          <Icon name="check-circle" size={14} className="me-1 inline" /> {l("حُفظت الإعدادات وسُجّل التغيير في سجل التدقيق.", "Settings saved and the change was written to the audit log.")}
        </div>
      )}
      {!canEdit && (
        <div className="rounded-lg border border-warn-500/30 bg-warn-500/[0.08] px-4 py-2.5 text-[12px] text-warn-500">
          <Icon name="lock" size={14} className="me-1 inline" /> {l("دورك يسمح بالقراءة فقط — التعديل يتطلب settings.manage.", "Your role is read-only here — editing requires settings.manage.")}
        </div>
      )}

      <form action={saveInstitutionSettings} className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={l("هوية المؤسسة", "Institution identity")} icon="building" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={l("الاسم (عربي)", "Name (Arabic)")}>
                <Input name="nameAr" defaultValue={s.nameAr} disabled={!canEdit} />
              </Field>
              <Field label={l("الاسم (إنجليزي)", "Name (English)")}>
                <Input name="nameEn" defaultValue={s.nameEn} dir="ltr" disabled={!canEdit} />
              </Field>
              <Field label={l("النطاق", "Domain")} hint={l("يُستخدم في حسابات المؤسسة", "Used for institutional accounts")}>
                <Input name="domain" defaultValue={s.domain} dir="ltr" disabled={!canEdit} />
              </Field>
              <Field label={l("المنطقة الزمنية", "Time zone")}>
                <Select name="timezone" defaultValue={s.timezone} disabled={!canEdit}>
                  <option value="Africa/Cairo">Africa/Cairo (GMT+2)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                  <option value="Europe/London">Europe/London</option>
                </Select>
              </Field>
            </div>
            <p className="mt-2 text-[9.5px] leading-relaxed text-fg-muted">
              {l("كل أوقات المحاضرات والاختبارات تُخزَّن بتوقيت UTC وتُعرض بالتوقيت المحلي للمستخدم.", "All lecture and examination times are stored in UTC and rendered in the user's local time.")}
            </p>
          </Card>

          <Card>
            <CardHeader title={l("السياسات الأكاديمية", "Academic policies")} icon="percent" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={l("حد إنذار الغياب %", "Absence warning %")} hint={l("من المحاضرات", "of lectures")}>
                <Input name="attendanceWarningPct" type="number" min={5} max={50} defaultValue={s.attendanceWarningPct} disabled={!canEdit} />
              </Field>
              <Field label={l("سنوات حفظ الاختبارات", "Exam retention (years)")}>
                <Input name="examRetentionYears" type="number" min={1} max={10} defaultValue={s.examRetentionYears} disabled={!canEdit} />
              </Field>
              <Field label={l("نصف قطر الحضور (م)", "Geofence radius (m)")}>
                <Input name="geofenceRadiusM" type="number" min={25} max={500} defaultValue={s.geofenceRadiusM} disabled={!canEdit} />
              </Field>
            </div>
            <div className="mt-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
              <p className="text-[9.5px] leading-relaxed text-fg-muted">
                {l(
                  `الشعبة التي تتجاوز ${s.attendanceWarningPct}% غياباً تُعلَّم للمرشد ولا تُحرم آلياً من الاختبار — القرار الأكاديمي بشري.`,
                  `A section exceeding ${s.attendanceWarningPct}% absence is flagged to the advisor but never automatically barred from an examination — the academic decision stays human.`,
                )}
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title={l("ضوابط الأمان", "Security controls")} icon="shield-check" />
            <div className="space-y-2">
              {toggles.map((t) => (
                <label key={t.name} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface-2/50 px-3 py-2.5">
                  <input type="checkbox" name={t.name} defaultChecked={t.checked} disabled={!canEdit} className="mt-0.5 h-3.5 w-3.5 accent-[#2864D9]" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-medium text-fg">{t.label}</span>
                    <span className="block text-[9.5px] text-fg-muted">{t.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-600">
                <Icon name="check" size={14} /> {l("حفظ الإعدادات", "Save settings")}
              </button>
              <a href="/admin/settings" className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-surface px-3.5 text-[12px] font-semibold text-fg-soft hover:text-fg">
                {l("تراجع", "Discard")}
              </a>
              <span className="text-[9.5px] text-fg-muted">{l("التغيير يُسجَّل كمستوى حرج في التدقيق.", "Changes are recorded as CRITICAL in the audit log.")}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={l("ملخص الحالة", "Current posture")} icon="server" />
            <div className="space-y-2">
              <KeyValue label={l("التحقق بخطوتين", "Two-factor")} value={s.requireTwoFactor ? l("إلزامي", "Mandatory") : l("اختياري", "Optional")} />
              <KeyValue label={l("ربط الجهاز", "Device binding")} value={s.requireDeviceBinding ? l("إلزامي للمقيّد", "Required (restricted)") : l("معطّل", "Off")} />
              <KeyValue label={l("الأجهزة الشخصية", "Personal devices")} value={s.allowPersonalDevices ? l("مسموحة", "Allowed") : l("ممنوعة", "Blocked")} />
              <KeyValue label={l("حد الغياب", "Absence cap")} value={`${s.attendanceWarningPct}%`} />
              <KeyValue label={l("النطاق الجغرافي", "Geofence")} value={`${s.geofenceRadiusM} ${l("متراً", "m")}`} />
              <KeyValue label={l("حفظ الاختبارات", "Exam retention")} value={`${s.examRetentionYears} ${l("سنوات", "years")}`} />
            </div>
          </Card>

          <Card>
            <CardHeader title={l("التكاملات", "Integrations")} icon="link" />
            <div className="space-y-1.5">
              {[
                { n: "Student Information System", s: l("متصل — مزامنة ليلية", "Connected — nightly sync"), ok: true },
                { n: "SMS Gateway", s: l("غير مهيّأ", "Not configured"), ok: false },
                { n: "Object Storage (submissions)", s: l("متصل", "Connected"), ok: true },
                { n: "MDM (Android Enterprise)", s: l("متصل — 42 جهازاً", "Connected — 42 devices"), ok: true },
                { n: "SSO (SAML 2.0)", s: l("جاهز للتفعيل", "Ready to enable"), ok: false },
              ].map((x) => (
                <div key={x.n} className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${x.ok ? "bg-success-500" : "bg-fg-muted"}`} />
                  <span className="min-w-0 flex-1 truncate text-[10.5px] text-fg-soft">{x.n}</span>
                  <span className={`text-[8.5px] ${x.ok ? "text-success-500" : "text-fg-muted"}`}>{x.s}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={l("سجل التغييرات", "Change history")} icon="list-checks" />
            <div className="space-y-1.5">
              {db()
                .auditLogs.filter((a) => a.action.startsWith("settings") || a.action.startsWith("institution"))
                .slice(0, 4)
                .map((a) => (
                  <div key={a.id} className="rounded-lg bg-surface-2 px-2.5 py-1.5">
                    <p className="text-[10px] text-fg-soft">{a.actionAr}</p>
                    <p className="text-[8.5px] text-fg-muted">{a.actorName} · {a.target}</p>
                  </div>
                ))}
              {db().auditLogs.filter((a) => a.action.startsWith("settings") || a.action.startsWith("institution")).length === 0 && (
                <p className="text-[10px] text-fg-muted">{l("لا تغييرات بعد.", "No changes yet.")}</p>
              )}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-fg-muted">
              {l("كل تعديل إعدادات يُسجَّل بنسخة سابقة وتالية في بيئة الإنتاج.", "In production every settings change stores the before/after snapshot.")}
            </p>
          </Card>
        </div>
      </form>
    </div>
  );
}
