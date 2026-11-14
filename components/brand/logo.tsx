import { cx } from "@/lib/utils";

/**
 * AL MOHANDES monogram — the authentic Arabic mīm (IBM Plex Sans Arabic 600)
 * set inside a measured architectural frame: a cyan datum line with end ticks
 * reads as structural engineering, while the letterform keeps it unmistakably
 * Arabic. No graduation-cap cliché.
 */
const GLYPH_PATH =
  "M46 -60Q46 58 96 114.5Q146 171 251 171L468 171Q466 237 432.5 275Q399 313 348 313Q302 313 275.5 290.5Q249 268 235 230L141 270Q151 318 173 351Q195 384 223 404.5Q251 425 283 434.5Q315 444 346 444Q445 444 502 369Q559 294 559 155L559 40L251 40Q222 40 203 35Q184 30 172.5 18.5Q161 7 156 -12Q151 -31 151 -60L151 -304L46 -304Z";

export function LogoGlyph({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} role="img" aria-label="المهندس">
      <defs>
        <linearGradient id="amGlyph" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="0.62" stopColor="#EAF4FF" />
          <stop offset="1" stopColor="#A9D4FF" />
        </linearGradient>
      </defs>
      <g transform="translate(14.213 36.107) scale(0.0588 -0.0588)">
        <path d={GLYPH_PATH} fill={mono ? "currentColor" : "url(#amGlyph)"} />
      </g>
      <path d="M12 55.6H52" stroke={mono ? "currentColor" : "#38A5FF"} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
      <path d="M12 53.2v4.8M52 53.2v4.8" stroke={mono ? "currentColor" : "#38A5FF"} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function LogoMark({
  size = 40,
  variant = "gradient",
  className,
  rounded = "rounded-[26%]",
}: {
  size?: number;
  variant?: "gradient" | "dark" | "light" | "bare";
  className?: string;
  rounded?: string;
}) {
  if (variant === "bare") return <LogoGlyph className={className} />;

  const bg =
    variant === "gradient"
      ? "bg-[linear-gradient(145deg,#2E6FE6_0%,#1B4AA8_55%,#0F2650_100%)]"
      : variant === "light"
        ? "bg-[#F3F6FA]"
        : "bg-[linear-gradient(145deg,#192B45_0%,#101B2D_100%)]";

  return (
    <span
      className={cx("relative grid shrink-0 place-items-center overflow-hidden ring-1 ring-white/10 shadow-sm", bg, rounded, className)}
      style={{ width: size, height: size }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(120% 90% at 18% -8%, rgba(255,255,255,.35) 0%, transparent 55%), linear-gradient(transparent 60%, rgba(0,0,0,.22))",
        }}
      />
      <LogoGlyph className={cx("relative", variant === "light" && "[&_path]:stroke-[#2864D9]")} mono={variant === "light"} />
    </span>
  );
}

export function Wordmark({
  locale = "ar",
  size = "md",
  showTagline = false,
  className,
}: {
  locale?: "ar" | "en";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}) {
  const title = locale === "ar" ? "المهندس" : "AL MOHANDES";
  const sub = "AL MOHANDES";
  const tagline = locale === "ar" ? "إدارة تعليمية ذكية · اختبارات آمنة" : "Intelligent Education · Secure Exams";
  const sizes = {
    sm: { t: "text-[15px] leading-none", s: "text-[7.5px] tracking-[0.26em]" },
    md: { t: "text-xl leading-none", s: "text-[8.5px] tracking-[0.28em]" },
    lg: { t: "text-3xl leading-none", s: "text-[10px] tracking-[0.3em]" },
  }[size];

  return (
    <span className={cx("flex flex-col gap-1", className)}>
      <span className={cx("font-semibold tracking-tight text-fg", sizes.t)}>{title}</span>
      <span className={cx("font-medium text-accent-500/90", sizes.s)}>{sub}</span>
      {showTagline && <span className="text-[11px] text-fg-muted">{tagline}</span>}
    </span>
  );
}
