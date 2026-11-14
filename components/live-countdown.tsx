"use client";

import { useEffect, useState } from "react";
import { cx, fmtCountdown } from "@/lib/utils";

/**
 * Purely a presentation clock. The authoritative remaining time always comes
 * from the server (`serverEndsAt`); this component only interpolates between
 * server resyncs and re-syncs if the local drift exceeds 2s.
 */
export function LiveCountdown({
  serverEndsAt,
  serverNowOffset = 0,
  className,
  tone = "default",
  showIcon,
  compact,
  onExpire,
}: {
  serverEndsAt: number;
  serverNowOffset?: number;
  className?: string;
  tone?: "default" | "danger" | "warning";
  showIcon?: boolean;
  compact?: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, serverEndsAt - (Date.now() + serverNowOffset)));

  useEffect(() => {
    const tick = () => {
      const next = Math.max(0, serverEndsAt - (Date.now() + serverNowOffset));
      setRemaining(next);
      if (next === 0) onExpire?.();
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [serverEndsAt, serverNowOffset, onExpire]);

  const critical = remaining < 5 * 60_000;
  const warn = remaining < 15 * 60_000;
  const effective = tone === "danger" ? "danger" : tone === "warning" ? "warning" : critical ? "danger" : warn ? "warning" : "default";
  const tones = {
    default: "text-fg",
    warning: "text-warn-500",
    danger: "text-danger-500",
  };

  return (
    <span
      className={cx("tnum inline-flex items-center gap-1.5 font-mono font-semibold", tones[effective], compact ? "text-[12px]" : "text-[15px]", className)}
      role="timer"
      aria-live="off"
      aria-label={`الوقت المتبقي ${fmtCountdown(remaining)}`}
    >
      {showIcon && <span className={cx("size-1.5 rounded-full", effective === "danger" ? "bg-danger-500 animate-pulse" : effective === "warning" ? "bg-warn-500" : "bg-success-500")} />}
      {fmtCountdown(remaining)}
    </span>
  );
}
