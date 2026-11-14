"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Card, CardHeader, Icon, Segmented, Switch } from "@/components/ui";
import { usePrefs, useToast } from "@/components/providers";
import { updateStudentPrefs } from "@/app/actions/student";
import type { Locale, Theme } from "@/lib/types";

const CATEGORIES = [
  { key: "ATTENDANCE", ar: "تنبيهات الحضور", en: "Attendance alerts" },
  { key: "ABSENCE", ar: "تحذيرات الغياب", en: "Absence warnings" },
  { key: "EXAM", ar: "الاختبارات والتذكيرات", en: "Exams & reminders" },
  { key: "RESULT", ar: "نتائج الاختبارات", en: "Exam results" },
  { key: "SCHEDULE", ar: "تغييرات الجدول", en: "Schedule changes" },
  { key: "ANNOUNCEMENT", ar: "إعلانات المعلمين", en: "Teacher announcements" },
  { key: "COMPLAINT", ar: "ردود الطلبات", en: "Request replies" },
];

export function SettingsPanel({
  initial,
}: {
  initial?: { categories?: Record<string, boolean>; quietHours?: boolean; updatedAt?: number };
}) {
  const { locale, theme, setLocale, setTheme, l } = usePrefs();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => ({
    ...Object.fromEntries(CATEGORIES.map((c) => [c.key, true])),
    ...(initial?.categories ?? {}),
  }));
  const [quiet, setQuiet] = useState(Boolean(initial?.quietHours));
  const [saving, startSaving] = useTransition();

  const save = (nextPrefs: Record<string, boolean>, nextQuiet: boolean) => {
    startSaving(async () => {
      const res = await updateStudentPrefs({ categories: nextPrefs, quietHours: nextQuiet });
      if (!res.ok) {
        toast({ title: l("تعذّر الحفظ", "Could not save"), tone: "error" });
      }
    });
  };

  const toggle = (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    save(next, quiet);
    toast({
      title: value ? l("تم تفعيل التنبيه", "Alert enabled") : l("تم إيقاف التنبيه", "Alert disabled"),
      description: l("محفوظ على الخادم — يطبَّق على الإشعارات القادمة.", "Saved on the server — applies to future notifications."),
      tone: "success",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={l("المظهر واللغة", "Appearance & language")} icon="sun" subtitle={l("يُطبَّق فوراً على التطبيق", "Applied instantly across the app")} />
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-fg">{l("نمط العرض", "Display mode")}</p>
              <p className="text-[10px] text-fg-muted">{l("داكن أو فاتح مع تباين مطابق", "Dark or light with matching contrast")}</p>
            </div>
            <Segmented<Theme>
              options={[{ value: "dark", label: l("داكن", "Dark") }, { value: "light", label: l("فاتح", "Light") }]}
              value={theme}
              onChange={setTheme}
              ariaLabel={l("نمط العرض", "Display mode")}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-fg">{l("لغة الواجهة", "Interface language")}</p>
              <p className="text-[10px] text-fg-muted">{l("العربية أولاً مع دعم RTL كامل", "Arabic-first with full RTL support")}</p>
            </div>
            <Segmented<Locale>
              options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]}
              value={locale}
              onChange={setLocale}
              ariaLabel={l("لغة الواجهة", "Interface language")}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={l("تفضيلات الإشعارات", "Notification preferences")}
          icon="bell"
          subtitle={
            saving
              ? l("جارٍ الحفظ على الخادم…", "Saving to the server…")
              : initial?.updatedAt
                ? `${l("محفوظة", "Saved")} · ${new Date(initial.updatedAt).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}`
                : l("تتحكم في ما يصلك عبر التطبيق", "Controls what reaches you in-app")
          }
        />
        <div className="space-y-3.5">
          {CATEGORIES.map((c) => (
            <Switch key={c.key} checked={prefs[c.key]} onChange={(v) => toggle(c.key, v)} label={l(c.ar, c.en)} />
          ))}
          <div className="border-t border-line pt-3">
            <Switch
              checked={quiet}
              onChange={(v) => {
                setQuiet(v);
                save(prefs, v);
                toast({ title: v ? l("تم تفعيل الساعات الهادئة", "Quiet hours on") : l("تم إيقاف الساعات الهادئة", "Quiet hours off"), tone: "success" });
              }}
              label={l("ساعات هادئة (22:00 – 07:00)", "Quiet hours (22:00 – 07:00)")}
              description={l("تُؤجَّل الإشعارات غير العاجلة إلى الصباح.", "Non-urgent notifications are deferred to the morning.")}
            />
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-surface-2 px-2.5 py-2 text-[9.5px] leading-relaxed text-fg-muted">
          {l(
            "تُرسَل الإشعارات الحرجة المتعلقة بالاختبارات والحوادث دائماً، ولا يمكن تعطيلها حفاظاً على نزاهة الاختبار.",
            "Critical exam and incident notifications are always delivered and cannot be disabled, to protect exam integrity.",
          )}
        </p>
      </Card>

      <Card>
        <CardHeader title={l("الخصوصية والبيانات", "Privacy & data")} icon="shield" />
        <div className="space-y-1">
          {[
            { href: "/student/security", icon: "smartphone" as const, ar: "الأجهزة والجلسات", en: "Devices & sessions" },
            { href: "/docs/security-architecture", icon: "lock" as const, ar: "سياسة الخصوصية", en: "Privacy policy" },
            { href: "/student/complaints/new?category=TECHNICAL", icon: "message" as const, ar: "طلب تصدير بياناتي", en: "Request a data export" },
          ].map((row) => (
            <Link key={row.href} href={row.href} className="flex items-center gap-2.5 rounded-lg px-1 py-2 transition hover:bg-surface-2">
              <Icon name={row.icon} size={14} className="text-fg-muted" />
              <span className="flex-1 text-[11.5px] text-fg-soft">{l(row.ar, row.en)}</span>
              <Icon name="chevron-left" size={13} className="text-fg-muted ltr:rotate-180" />
            </Link>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="neutral" icon="lock">{l("لا مراقبة خفية", "No covert monitoring")}</Badge>
          <Badge tone="neutral" icon="shield-check">{l("حد أدنى من البيانات", "Data minimisation")}</Badge>
        </div>
      </Card>

      <Card>
        <CardHeader title={l("عن التطبيق", "About")} icon="info" />
        <div className="space-y-1.5 text-[10.5px]">
          {[
            [l("الإصدار", "Version"), "1.0.0 (prototype)"],
            [l("المؤسسة", "Institution"), "AL MOHANDES Academy"],
            [l("بيئة البيانات", "Data environment"), l("تجريبية — تُعاد عند إعادة التشغيل", "Demo — resets on restart")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-fg-muted">{k}</span>
              <span className="text-end font-medium text-fg">{v}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
