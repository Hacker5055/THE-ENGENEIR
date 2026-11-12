"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Icon, Progress } from "@/components/ui";
import { usePrefs } from "@/components/providers";

const WINDOW_MS = 20_000;

/**
 * Rotating check-in QR. The token itself is minted server-side; this component
 * only re-reads it before expiry so the on-screen code can never be reused.
 */
export function LiveQr({ sessionId, initialExpiresAt, expected, present, geoLabel }: { sessionId: string; initialExpiresAt: number; expected: number; present: number; geoLabel: string }) {
  const { l } = usePrefs();
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [now, setNow] = useState(() => Date.now());
  const [frame, setFrame] = useState(0);
  const [pulse, setPulse] = useState(false);
  const lastRefresh = useRef(0);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/attendance/sessions/${sessionId}/token`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setExpiresAt(data.expiresAt);
      setFrame((f) => f + 1);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 400);
      if (Date.now() - lastRefresh.current > 12_000) {
        lastRefresh.current = Date.now();
        router.refresh();
      }
    } catch {
      /* offline: keep the last frame, countdown will show it as expired */
    }
  }, [sessionId, router]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (expiresAt - now <= 1200) void refetch();
  }, [now, expiresAt, refetch]);

  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const remaining = Math.max(0, expiresAt - now);
  const pct = Math.round((remaining / WINDOW_MS) * 100);
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[#0B1424] p-5 text-white" style={{ boxShadow: "inset 0 0 90px rgba(56,165,255,0.08)" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#9FB3C8]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#19B88A] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#19B88A]" />
            </span>
            {l("مباشر — تحقق حضور", "Live — attendance check-in")}
          </p>
          <p className="mt-1 text-[15px] font-semibold">{l("امسح الرمز من تطبيق الطالب", "Scan with the student app")}</p>
        </div>
        <Badge tone="accent">{l("SEM-2026", "SEM-2026")}</Badge>
      </div>

      <div className="relative mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className={`relative shrink-0 rounded-xl bg-white p-2.5 transition-transform duration-300 ${pulse ? "scale-[0.97]" : "scale-100"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/v1/attendance/sessions/${sessionId}/qr?v=${frame}`}
            alt={l("رمز حضور متغيّر", "Rotating attendance QR")}
            width={188}
            height={188}
            className="h-[188px] w-[188px]"
          />
          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 h-[3px] rounded-full bg-[#2864D9] opacity-70" style={{ top: `${8 + (100 - pct) * 1.72}px` }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="tnum text-[34px] font-semibold leading-none">{String(seconds).padStart(2, "0")}</p>
            <span className="text-[11px] text-[#9FB3C8]">{l("ثانية حتى التجديد", "sec until rotation")}</span>
          </div>
          <Progress value={pct} tone={pct > 40 ? "success" : pct > 15 ? "warning" : "danger"} size="sm" className="mt-2 max-w-[220px]" />
          <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] leading-relaxed text-[#9FB3C8]">
            <Icon name="refresh" size={12} />
            {l("يُعاد توليد الرمز تلقائياً. لقطة الشاشة القديمة تُرفض على الخادم.", "Regenerated automatically. A stale screenshot is rejected server-side.")}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/[0.06] px-2.5 py-2">
              <p className="text-[9.5px] text-[#9FB3C8]">{l("سجّلوا الحضور", "Checked in")}</p>
              <p className="tnum text-[15px] font-semibold">
                {present}
                <span className="text-[10px] font-normal text-[#9FB3C8]"> / {expected}</span>
              </p>
            </div>
            <div className="rounded-lg bg-white/[0.06] px-2.5 py-2">
              <p className="text-[9.5px] text-[#9FB3C8]">{l("النطاق الجغرافي", "Geofence")}</p>
              <p className="truncate text-[11px] font-medium">{geoLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {remaining === 0 && (
        <p className="relative mt-3 rounded-lg bg-[#F2A93B]/15 px-2.5 py-1.5 text-[10px] text-[#F2A93B]">
          {l("جارٍ تجديد الرمز…", "Rotating token…")}
        </p>
      )}
    </div>
  );
}
