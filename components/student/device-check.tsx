"use client";

import { useEffect, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import { cx } from "@/lib/utils";

interface Check {
  key: string;
  ar: string;
  en: string;
  detail?: string;
  state: "ok" | "warn" | "fail" | "checking";
}

export function DeviceCheck({
  serverNow,
  deviceLabel,
  managed,
  geoRequired,
}: {
  serverNow: number;
  deviceLabel: string;
  managed: boolean;
  geoRequired: boolean;
}) {
  const { l } = usePrefs();
  const [checks, setChecks] = useState<Check[]>([]);
  const [rerun, setRerun] = useState(0);

  useEffect(() => {
    const run = async () => {
      const list: Check[] = [];
      list.push({
        key: "device",
        ar: "الجهاز المرتبط",
        en: "Registered device",
        detail: deviceLabel,
        state: "ok",
      });
      list.push({
        key: "network",
        ar: "اتصال الشبكة",
        en: "Network connection",
        detail: navigator.onLine ? l("متصل", "Online") : l("غير متصل", "Offline"),
        state: navigator.onLine ? "ok" : "fail",
      });
      const skew = Math.abs(Date.now() - serverNow);
      list.push({
        key: "clock",
        ar: "مزامنة الوقت مع الخادم",
        en: "Clock sync with server",
        detail: `${skew < 5000 ? l("فارق مقبول", "Within tolerance") : l("فارق كبير", "Large drift")} · ${skew}ms`,
        state: skew < 5000 ? "ok" : "warn",
      });
      const fs = typeof document !== "undefined" && (document.fullscreenEnabled || (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled);
      list.push({
        key: "fullscreen",
        ar: "دعم وضع التركيز (ملء الشاشة)",
        en: "Focus mode (fullscreen) support",
        detail: fs ? l("مدعوم", "Supported") : l("غير مدعوم — سيُستخدم بديل", "Unsupported — fallback used"),
        state: fs ? "ok" : "warn",
      });
      if (geoRequired) {
        const hasGeo = "geolocation" in navigator;
        list.push({
          key: "geo",
          ar: "خدمة الموقع الجغرافي",
          en: "Location service",
          detail: hasGeo ? l("متاحة للإذن", "Available") : l("غير متاحة", "Unavailable"),
          state: hasGeo ? "ok" : "fail",
        });
      }
      if (managed) {
        list.push({
          key: "kiosk",
          ar: "سياسة الجهاز المُدار",
          en: "Managed device policy",
          detail: l("Lock Task مُفعّل على مستوى الجهاز", "Lock Task enabled at device level"),
          state: "ok",
        });
      } else {
        list.push({
          key: "kiosk",
          ar: "قفل الجهاز (وضع Kiosk)",
          en: "Device lock (kiosk)",
          detail: l("جهاز شخصي — لا يمكن فرض قفل كامل", "Personal device — full lock is not enforceable"),
          state: "warn",
        });
      }
      list.push({
        key: "surveillance",
        ar: "مراقبة الشاشة أو الكاميرا",
        en: "Screen/camera monitoring",
        detail: l("غير مستخدمة إطلاقاً", "Never used"),
        state: "ok",
      });
      setChecks(list);
    };
    setChecks([
      { key: "loading", ar: "جارٍ فحص الجهاز…", en: "Checking device…", state: "checking" },
    ]);
    const t = setTimeout(run, 260);
    return () => clearTimeout(t);
  }, [rerun, serverNow, deviceLabel, managed, geoRequired, l]);

  const states = {
    ok: { icon: "check" as const, cls: "text-success-500 bg-success-500/12 border-success-500/25" },
    warn: { icon: "alert" as const, cls: "text-warn-500 bg-warn-500/12 border-warn-500/25" },
    fail: { icon: "x" as const, cls: "text-danger-500 bg-danger-500/12 border-danger-500/25" },
    checking: { icon: "refresh" as const, cls: "text-fg-muted bg-surface-3 border-line-strong animate-pulse" },
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-fg">
          <Icon name="shield-check" size={13} className="text-accent-400" /> {l("التحقق من الجهاز", "Device verification")}
        </p>
        <Button variant="ghost" size="xs" icon="refresh" onClick={() => setRerun((r) => r + 1)}>
          {l("إعادة الفحص", "Re-run")}
        </Button>
      </div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-start gap-2">
            <span className={cx("mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full border", states[c.state].cls)} style={{ width: 18, height: 18 }}>
              <Icon name={states[c.state].icon} size={10} strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-fg-soft">{l(c.ar, c.en)}</p>
              {c.detail && <p className="text-[9.5px] leading-relaxed text-fg-muted">{c.detail}</p>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 border-t border-line pt-2 text-[9.5px] leading-relaxed text-fg-muted">
        {l(
          "الفحص إرشادي: يوضح ما يمكن للتطبيق التحقق منه، ولا يضمن قفلاً كاملاً للجهاز على الأجهزة الشخصية.",
          "This check is advisory: it states what the app can verify and does not guarantee full device lockdown on personal devices.",
        )}
      </p>
    </div>
  );
}
