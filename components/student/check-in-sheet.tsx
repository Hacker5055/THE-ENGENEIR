"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Icon, Input, Modal, Spinner } from "@/components/ui";
import { usePrefs, useToast } from "@/components/providers";
import { cx, fmtCountdown } from "@/lib/utils";

interface OpenSession {
  id: string;
  courseAr: string;
  courseEn: string;
  code: string;
  start: string;
  end: string;
  room: string;
  geoLabel: string;
  radiusM: number;
  expected: number;
}

type Result =
  | { kind: "idle" }
  | { kind: "ok"; status: string; message: string; distance?: number }
  | { kind: "error"; message: string; code?: string };

const DEMO_COORDS = { lat: 30.0131, lng: 31.2089 };

function deviceId() {
  if (typeof window === "undefined") return "web-unknown";
  let id = localStorage.getItem("am_device_id");
  if (!id) {
    id = `web_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("am_device_id", id);
  }
  return id;
}

export function CheckInSheet({ sessions, autoOpen }: { sessions: OpenSession[]; autoOpen?: boolean }) {
  const { l } = usePrefs();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(!!autoOpen && sessions.length > 0);
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [loadingToken, setLoadingToken] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [manualCode, setManualCode] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "ready" | "denied">("idle");

  const session = sessions.find((s) => s.id === sessionId) ?? sessions[0];

  const fetchToken = useCallback(async () => {
    if (!session) return;
    setLoadingToken(true);
    try {
      const res = await fetch(`/api/v1/attendance/sessions/${session.id}/token`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setExpiresAt(data.expiresAt);
      } else {
        setToken(null);
      }
    } finally {
      setLoadingToken(false);
    }
  }, [session]);

  useEffect(() => {
    if (!open) return;
    setResult({ kind: "idle" });
    fetchToken();
    const t = setInterval(fetchToken, 20_000);
    return () => clearInterval(t);
  }, [open, fetchToken]);

  const getPosition = () =>
    new Promise<{ lat: number; lng: number }>((resolve) => {
      if (!("geolocation" in navigator)) {
        setGeoState("denied");
        return resolve(DEMO_COORDS);
      }
      setGeoState("locating");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoState("ready");
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setGeoState("denied");
          resolve(DEMO_COORDS);
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 },
      );
    });

  const submit = async (codeOverride?: string) => {
    if (!session) return;
    setSubmitting(true);
    setResult({ kind: "idle" });
    try {
      const coords = await getPosition();
      const res = await fetch("/api/v1/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          token: codeOverride ?? token,
          lat: coords.lat,
          lng: coords.lng,
          deviceId: deviceId(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ kind: "ok", status: data.status, message: data.message, distance: data.distance });
        toast({ title: data.message, description: `${l("المسافة", "Distance")}: ${data.distance}م`, tone: "success" });
        router.refresh();
      } else {
        setResult({ kind: "error", message: data.message ?? l("تعذر تسجيل الحضور.", "Check-in failed."), code: data.error });
      }
    } catch {
      setResult({ kind: "error", message: l("تعذر الاتصال بالخادم. تحقق من الشبكة.", "Cannot reach the server. Check your connection.") });
    } finally {
      setSubmitting(false);
    }
  };

  if (!sessions.length) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/50 p-4 text-center">
        <p className="text-[12px] font-medium text-fg-soft">{l("لا توجد جلسة حضور مفتوحة الآن", "No open attendance session")}</p>
        <p className="mt-1 text-[10.5px] leading-relaxed text-fg-muted">
          {l("يفتح المعلم الجلسة أثناء المحاضرة ويظهر الكود هنا.", "Your teacher opens the session during the lecture and the code appears here.")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-brand/30 bg-brand/[0.07] p-3.5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/15 text-accent-400">
            <Icon name="qr" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-fg">{l("جلسة حضور مفتوحة", "Attendance session open")}</p>
            <p className="mt-0.5 truncate text-[10.5px] text-fg-muted">
              {l(session.courseAr, session.courseEn)} · {session.room} · {session.start}
            </p>
          </div>
        </div>
        <Button size="sm" className="mt-3 w-full" icon="qr" onClick={() => setOpen(true)}>
          {l("تسجيل الحضور الآن", "Check in now")}
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={l("تسجيل الحضور", "Attendance check-in")}
        description={l("امسح الكود الظاهر على شاشة المعلم أو أدخله يدوياً.", "Scan the code on your teacher's screen or enter it manually.")}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{l("إغلاق", "Close")}</Button>
            <Button size="sm" icon="check" loading={submitting} onClick={() => submit()} disabled={!token}>
              {l("محاكاة المسح والتسجيل", "Simulate scan & check in")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {sessions.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-fg-soft">{l("الجلسة", "Session")}</p>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSessionId(s.id)}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-start text-[11.5px] transition",
                    s.id === sessionId ? "border-brand/50 bg-brand/10 text-fg" : "border-line text-fg-soft hover:bg-surface-2",
                  )}
                >
                  <Icon name="calendar" size={13} /> {l(s.courseAr, s.courseEn)}
                  <span className="ms-auto font-mono text-[10px] text-fg-muted">{s.start}</span>
                </button>
              ))}
            </div>
          )}

          {/* simulated scanner */}
          <div className="relative overflow-hidden rounded-xl border border-line bg-navy-950 p-5">
            <div className="pointer-events-none absolute inset-0 opacity-20 app-grid-bg" aria-hidden="true" />
            <div className="relative mx-auto grid size-36 place-items-center rounded-xl border-2 border-dashed border-accent-500/40">
              <div className="absolute inset-x-3 top-1/2 h-px bg-accent-500/60 animate-scan" aria-hidden="true" />
              {loadingToken ? (
                <Spinner size={22} className="text-accent-400" />
              ) : (
                <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span key={i} className={cx("size-2 rounded-[1px]", (i * 7 + 3) % 3 === 0 ? "bg-white/90" : "bg-white/25")} />
                  ))}
                </div>
              )}
            </div>
            <p className="relative mt-3 text-center text-[10px] text-white/50">
              {l("محاكاة كاميرا المسح — لا يتم الوصول إلى الكاميرا في هذا النموذج", "Scanner simulation — the camera is never accessed in this prototype")}
            </p>
            <div className="relative mt-2 flex items-center justify-center gap-2">
              <Badge tone="accent" icon="clock">
                {l("صلاحية الكود", "Token TTL")} · {fmtCountdown(Math.max(0, expiresAt - Date.now()))}
              </Badge>
              <button onClick={fetchToken} className="text-[10px] text-accent-400 hover:underline" type="button">
                {l("تحديث", "Refresh")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            <div className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
              <p className="flex items-center gap-1 text-fg-muted"><Icon name="map-pin" size={11} /> {l("النطاق الجغرافي", "Geofence")}</p>
              <p className="mt-0.5 font-medium text-fg">{session.geoLabel} · {session.radiusM}م</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-2">
              <p className="flex items-center gap-1 text-fg-muted"><Icon name="smartphone" size={11} /> {l("الجهاز", "Device")}</p>
              <p className="mt-0.5 font-medium text-fg">{l("مرتبط بهذه الجلسة", "Bound to this session")}</p>
            </div>
          </div>

          {geoState === "denied" && (
            <Alert tone="warning" title={l("تعذر تحديد موقعك", "Location unavailable")}>
              {l("استخدمنا إحداثيات الحرم التجريبية للعرض. في الإنتاج يُرفض التسجيل بدون موقع موثّق.", "Demo campus coordinates were used. In production, check-in is rejected without a verified location.")}
            </Alert>
          )}

          {result.kind === "ok" && (
            <Alert tone="success" title={result.message} icon="check-circle">
              {l("تم حفظ السجل على الخادم", "Record persisted server-side")}
              {result.distance !== undefined ? ` · ${l("المسافة", "distance")} ${result.distance}م` : ""}
            </Alert>
          )}
          {result.kind === "error" && (
            <Alert tone="danger" title={result.message} icon="alert-circle">
              {result.code && <span className="font-mono text-[10px] text-fg-muted">code: {result.code}</span>}
            </Alert>
          )}

          <div className="border-t border-line pt-3">
            <p className="mb-1.5 text-[11px] font-medium text-fg-soft">{l("إدخال الكود يدوياً", "Enter the code manually")}</p>
            <div className="flex gap-2">
              <Input
                dir="ltr"
                placeholder="QR-XXXXXXXX"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="font-mono text-[11px]"
              />
              <Button size="sm" variant="secondary" onClick={() => submit(manualCode.trim())} disabled={!manualCode.trim() || submitting}>
                {l("تحقق", "Verify")}
              </Button>
            </div>
            <p className="mt-1.5 text-[10px] text-fg-muted">
              {l("الكود الفعلي الآن", "Current live token")}: <span className="font-mono">{token ?? "—"}</span>
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
