"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx, avatarStyle, initials } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";
import { usePrefs, useToast } from "@/components/providers";

/* --------------------------------- Button -------------------------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success" | "warning" | "subtle";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm shadow-brand/20 disabled:bg-brand/50",
  secondary: "bg-surface-3 text-fg hover:bg-surface-3/80 border border-line-strong",
  subtle: "bg-brand-soft text-accent-400 hover:bg-brand/25 border border-brand/30",
  ghost: "text-fg-soft hover:bg-surface-2 hover:text-fg",
  outline: "border border-line-strong text-fg hover:bg-surface-2 bg-transparent",
  danger: "bg-danger-500 text-white hover:bg-danger-600 shadow-sm",
  success: "bg-success-500 text-navy-950 hover:bg-success-600",
  warning: "bg-warn-500 text-navy-950 hover:bg-warn-600",
};
const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1 rounded-md",
  sm: "h-8.5 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[13px] gap-2 rounded-lg",
  lg: "h-12 px-6 text-sm gap-2.5 rounded-xl",
  icon: "size-9 rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  loading,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "tap inline-flex select-none items-center justify-center font-medium transition-[background,color,box-shadow,transform] duration-150 active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-60",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={rest.disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={size === "xs" ? 12 : 15} /> : icon ? <Icon name={icon} size={size === "xs" ? 13 : size === "lg" ? 18 : 16} /> : null}
      {children}
      {iconEnd && <Icon name={iconEnd} size={size === "xs" ? 13 : 16} className="opacity-80" />}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  className?: string;
  children?: ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={cx(
        "tap inline-flex select-none items-center justify-center font-medium transition active:scale-[.985]",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === "xs" ? 13 : 16} />}
      {children}
      {iconEnd && <Icon name={iconEnd} size={16} className="opacity-80" />}
    </Link>
  );
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-80", className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="جارٍ التحميل"
    />
  );
}

/* ---------------------------------- Card --------------------------------- */
export function Card({
  className,
  children,
  padded = true,
  as: As = "section",
  ...rest
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
  as?: "section" | "div" | "article" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cx("rounded-xl border border-line bg-surface shadow-xs", padded && "p-4 md:p-5", className)}
      {...rest}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && (
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-accent-400">
            <Icon name={icon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* --------------------------------- Badges -------------------------------- */
export type Tone = "brand" | "accent" | "success" | "warning" | "danger" | "neutral" | "purple";

const TONE_CHIP: Record<Tone, string> = {
  brand: "bg-brand/15 text-accent-300 border-brand/30",
  accent: "bg-accent-500/12 text-accent-400 border-accent-500/30",
  success: "bg-success-500/12 text-success-500 border-success-500/30",
  warning: "bg-warn-500/14 text-warn-500 border-warn-500/30",
  danger: "bg-danger-500/12 text-danger-500 border-danger-500/30",
  neutral: "bg-surface-3 text-fg-muted border-line-strong",
  purple: "bg-[#7A8CF0]/14 text-[#9DA9F5] border-[#7A8CF0]/30",
};
const TONE_DOT: Record<Tone, string> = {
  brand: "bg-brand", accent: "bg-accent-500", success: "bg-success-500", warning: "bg-warn-500",
  danger: "bg-danger-500", neutral: "bg-fg-muted", purple: "bg-[#9DA9F5]",
};

export function Badge({
  tone = "neutral",
  children,
  dot,
  className,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
  icon?: IconName;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        TONE_CHIP[tone],
        className,
      )}
    >
      {dot && <span className={cx("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; ar: string; en: string }> = {
    ACTIVE: { tone: "success", ar: "نشط", en: "Active" },
    INACTIVE: { tone: "neutral", ar: "غير نشط", en: "Inactive" },
    LOCKED: { tone: "danger", ar: "مقيّد", en: "Locked" },
    FLAGGED: { tone: "warning", ar: "معلَّم", en: "Flagged" },
    IN_PROGRESS: { tone: "accent", ar: "قيد التنفيذ", en: "In progress" },
    NOT_STARTED: { tone: "neutral", ar: "لم يبدأ", en: "Not started" },
    SUBMITTED: { tone: "brand", ar: "تم التسليم", en: "Submitted" },
    GRADING: { tone: "warning", ar: "قيد التصحيح", en: "Grading" },
    GRADED: { tone: "success", ar: "مُصحَّح", en: "Graded" },
    CANCELLED: { tone: "neutral", ar: "ملغي", en: "Cancelled" },
    EXPIRED: { tone: "neutral", ar: "منتهي", en: "Expired" },
    LIVE: { tone: "danger", ar: "جارٍ الآن", en: "Live" },
    SCHEDULED: { tone: "accent", ar: "مجدول", en: "Scheduled" },
    DRAFT: { tone: "neutral", ar: "مسودة", en: "Draft" },
    CLOSED: { tone: "neutral", ar: "مغلق", en: "Closed" },
    OPEN: { tone: "accent", ar: "مفتوح", en: "Open" },
    UNDER_REVIEW: { tone: "warning", ar: "قيد المراجعة", en: "Under review" },
    WAITING_FOR_STUDENT: { tone: "purple", ar: "بانتظار الطالب", en: "Waiting for student" },
    RESOLVED: { tone: "success", ar: "تم الحل", en: "Resolved" },
    REJECTED: { tone: "danger", ar: "مرفوض", en: "Rejected" },
    PRESENT: { tone: "success", ar: "حاضر", en: "Present" },
    LATE: { tone: "warning", ar: "متأخر", en: "Late" },
    ABSENT: { tone: "danger", ar: "غائب", en: "Absent" },
    EXCUSED: { tone: "neutral", ar: "غياب بعذر", en: "Excused" },
    PROBATION: { tone: "warning", ar: "إنذار أكاديمي", en: "Probation" },
    SUSPENDED: { tone: "danger", ar: "موقوف", en: "Suspended" },
    GRADUATED: { tone: "success", ar: "متخرج", en: "Graduated" },
    ON_LEAVE: { tone: "warning", ar: "في إجازة", en: "On leave" },
    HIGH: { tone: "danger", ar: "مرتفع", en: "High" },
    MEDIUM: { tone: "warning", ar: "متوسط", en: "Medium" },
    LOW: { tone: "success", ar: "منخفض", en: "Low" },
    TRIAL: { tone: "accent", ar: "تجريبي", en: "Trial" },
    ARCHIVED: { tone: "neutral", ar: "مؤرشف", en: "Archived" },
    PLANNED: { tone: "accent", ar: "مخطط", en: "Planned" },
    REVOKED: { tone: "danger", ar: "ملغى", en: "Revoked" },
  };
  const meta = map[status] ?? { tone: "neutral" as Tone, ar: status, en: status };
  const { l } = usePrefs();
  return (
    <Badge tone={meta.tone} dot>
      {l(meta.ar, meta.en)}
    </Badge>
  );
}

/* --------------------------------- Avatar -------------------------------- */
export function Avatar({
  name,
  hue = 210,
  size = 36,
  ring,
  className,
}: {
  name: string;
  hue?: number;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-semibold select-none",
        ring && "ring-2 ring-bg",
        className,
      )}
      style={{ ...avatarStyle(hue), width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/* -------------------------------- Progress ------------------------------- */
export function Progress({
  value,
  tone = "brand",
  size = "md",
  className,
  showLabel,
}: {
  value: number;
  tone?: "brand" | "success" | "warning" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
}) {
  const tones = {
    brand: "bg-brand",
    accent: "bg-accent-500",
    success: "bg-success-500",
    warning: "bg-warn-500",
    danger: "bg-danger-500",
  };
  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2.5" };
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <div className={cx("relative w-full overflow-hidden rounded-full bg-surface-3", heights[size])}>
        <div
          className={cx("h-full rounded-full transition-[width] duration-500", tones[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(value)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && <span className="tnum shrink-0 text-[11px] font-medium text-fg-muted">{Math.round(value)}%</span>}
    </div>
  );
}

export function Ring({
  value,
  size = 88,
  thickness = 8,
  tone = "#38A5FF",
  track = "rgba(255,255,255,.10)",
  children,
  label,
}: {
  value: number;
  size?: number;
  thickness?: number;
  tone?: string;
  track?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label ?? `${Math.round(clamped)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: "stroke-dashoffset .7s cubic-bezier(.22,.61,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/* -------------------------------- Fields --------------------------------- */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="flex items-center gap-1 text-xs font-medium text-fg-soft">
          {label}
          {required && <span className="text-danger-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] leading-relaxed text-fg-muted">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-danger-500" role="alert">
          <Icon name="alert-circle" size={12} /> {error}
        </p>
      )}
    </div>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border bg-bg-elevated/60 px-3 text-[13px] text-fg placeholder:text-fg-muted/70 transition focus:border-accent-500/60 focus:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent-500/20 disabled:opacity-60";

export function Input({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx(FIELD_BASE, "h-10", invalid ? "border-danger-500/60" : "border-line-strong", className)} {...props} />;
}

export function Textarea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx(FIELD_BASE, "min-h-24 py-2.5 leading-relaxed", invalid ? "border-danger-500/60" : "border-line-strong", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cx(FIELD_BASE, "h-10 appearance-none border-line-strong pe-9", className)}
        {...props}
      >
        {children}
      </select>
      <Icon name="chevron-down" size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-fg-muted" />
    </div>
  );
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx("relative", className)}>
      <Icon name="search" size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
      <input className={cx(FIELD_BASE, "h-10 border-line-strong ps-9")} type="search" {...props} />
    </div>
  );
}

export function Switch({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx("flex cursor-pointer items-start justify-between gap-3", disabled && "cursor-not-allowed opacity-60")}>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[13px] font-medium text-fg">{label}</span>}
          {description && <span className="mt-0.5 block text-[11px] leading-relaxed text-fg-muted">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === "string" ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-brand bg-brand" : "border-line-strong bg-surface-3",
        )}
      >
        <span
          className={cx(
            "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
            checked ? "start-[18px]" : "start-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, description, className }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cx("flex items-start gap-2.5", className)}>
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition",
          checked ? "border-brand bg-brand text-white" : "border-line-strong bg-bg-elevated",
        )}
      >
        {checked && <Icon name="check" size={12} strokeWidth={3} />}
      </button>
      <label htmlFor={id} className="cursor-pointer text-[13px] leading-snug text-fg-soft">
        {label}
        {description && <span className="mt-0.5 block text-[11px] text-fg-muted">{description}</span>}
      </label>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cx("inline-flex rounded-lg border border-line bg-surface-2 p-0.5", className)} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-[7px] font-medium transition",
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
            value === o.value ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Modal --------------------------------- */
const ModalCtx = createContext<{ close: () => void }>({ close: () => {} });
export const useModal = () => useContext(ModalCtx);

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  tone,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "danger" | "warning";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center p-4 no-print">
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-[3px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "نافذة"}
        className={cx(
          "relative w-full overflow-hidden rounded-2xl border border-line-strong bg-bg-elevated shadow-lg animate-scale-in",
          widths[size],
        )}
      >
        <div
          className={cx(
            "flex items-start justify-between gap-4 border-b border-line px-5 py-4",
            tone === "danger" && "bg-danger-500/[0.06]",
            tone === "warning" && "bg-warn-500/[0.06]",
          )}
        >
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
            {description && <p className="mt-1 text-xs leading-relaxed text-fg-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-fg-muted transition hover:bg-surface-2 hover:text-fg" aria-label="إغلاق">
            <Icon name="x" size={16} />
          </button>
        </div>
        <ModalCtx.Provider value={{ close: onClose }}>
          <div className="max-h-[65vh] overflow-y-auto px-5 py-4 scroll-slim">{children}</div>
        </ModalCtx.Provider>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------- Sheet --------------------------------- */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[85] no-print">
      <div className="absolute inset-0 bg-navy-950/65 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "لوحة"}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-bg-elevated p-5 shadow-lg animate-fade-up scroll-slim"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2" aria-label="إغلاق">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-4 flex gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* --------------------------------- States -------------------------------- */
export function EmptyState({
  icon = "layers",
  title,
  description,
  action,
  compact,
}: {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cx("flex flex-col items-center justify-center text-center", compact ? "py-8" : "py-14 px-6")}>
      <span className="mb-3 grid size-12 place-items-center rounded-2xl border border-line bg-surface-2 text-fg-muted">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx("animate-pulse rounded-md bg-surface-3/70", className)}
      style={{ backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent)", backgroundSize: "200% 100%", animation: "shimmer 1.6s linear infinite" }}
    />
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  icon,
  action,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success" | "neutral";
  title?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-accent-500/25 bg-accent-500/[0.07] text-accent-300",
    warning: "border-warn-500/25 bg-warn-500/[0.07] text-warn-500",
    danger: "border-danger-500/25 bg-danger-500/[0.07] text-danger-500",
    success: "border-success-500/25 bg-success-500/[0.07] text-success-500",
    neutral: "border-line-strong bg-surface-2 text-fg-soft",
  };
  const icons: Record<string, IconName> = { info: "info", warning: "alert", danger: "shield-alert", success: "check-circle", neutral: "info" };
  return (
    <div className={cx("flex items-start gap-3 rounded-lg border p-3", tones[tone], className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon name={icon ?? icons[tone]} size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-[13px] font-semibold">{title}</p>}
        {children && <div className="mt-0.5 text-xs leading-relaxed text-fg-soft">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------- Table --------------------------------- */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto rounded-xl border border-line bg-surface scroll-slim", className)}>
      <table className="w-full min-w-[640px] border-collapse text-start text-[13px]">{children}</table>
    </div>
  );
}
export function Th({ children, className, align = "start" }: { children?: ReactNode; className?: string; align?: "start" | "end" | "center" }) {
  return (
    <th
      scope="col"
      className={cx(
        "sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-surface-2 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted",
        align === "end" && "text-end",
        align === "center" && "text-center",
        align === "start" && "text-start",
        className,
      )}
    >
      {children}
    </th>
  );
}
export function Td({ children, className, align = "start", colSpan }: { children?: ReactNode; className?: string; align?: "start" | "end" | "center"; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={cx(
        "border-b border-line/70 px-3 py-2.5 align-middle text-fg-soft",
        align === "end" && "text-end tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* -------------------------------- Toolbar -------------------------------- */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap items-center gap-2", children ? className : undefined)}>{children}</div>;
}

export function KeyValue({ label, value, mono, className }: { label: ReactNode; value: ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={cx("flex items-baseline justify-between gap-3 py-1.5", className)}>
      <dt className="shrink-0 text-[11px] text-fg-muted">{label}</dt>
      <dd className={cx("min-w-0 text-end text-[12.5px] font-medium text-fg", mono && "font-mono text-[11.5px]")}>{value}</dd>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx("h-px w-full bg-line", className)} />;
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast({ title: "تم النسخ", tone: "success" });
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast({ title: "تعذر النسخ", tone: "error" });
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] text-fg-muted transition hover:border-line-strong hover:text-fg"
      aria-label="نسخ"
    >
      <Icon name={copied ? "check" : "link"} size={10} />
      {label ?? (copied ? "تم" : "نسخ")}
    </button>
  );
}



/* Re-exported so pages can import the whole primitives surface from one module. */
export { Icon, type IconName } from "@/components/icons";
