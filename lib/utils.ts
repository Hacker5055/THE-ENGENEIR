import type { Locale } from "@/lib/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Pick an Arabic/English string based on the active locale. */
export function tx(locale: Locale, ar: string, en: string) {
  return locale === "ar" ? ar : en;
}

export function makeL(locale: Locale) {
  return (ar: string, en: string) => (locale === "ar" ? ar : en);
}

/* ------------------------------- numbers ------------------------------- */
export const nf = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

export const pct = (n: number, digits = 0) => `${nf(n, digits)}%`;

/* -------------------------------- dates -------------------------------- */
const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDate = (v: string | number | Date) => (v instanceof Date ? v : new Date(v));

export function fmtDate(v: string | number | Date, locale: Locale = "ar", opts: { weekday?: boolean; year?: boolean } = {}) {
  const d = toDate(v);
  const day = d.getDate();
  const month = locale === "ar" ? AR_MONTHS[d.getMonth()] : EN_MONTHS[d.getMonth()];
  const year = opts.year === false ? "" : ` ${d.getFullYear()}`;
  const wd = opts.weekday ? `${(locale === "ar" ? AR_DAYS : EN_DAYS)[d.getDay()]}، ` : "";
  return `${wd}${day} ${month}${year}`;
}

export function fmtDateTime(v: string | number | Date, locale: Locale = "ar") {
  const d = toDate(v);
  return `${fmtDate(d, locale, { year: false })} · ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export const weekdayName = (day: number, locale: Locale) => (locale === "ar" ? AR_DAYS : EN_DAYS)[day] ?? "";
export const weekdayShort = (day: number, locale: Locale) => (locale === "ar" ? ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"] : EN_DAYS)[day];
export const monthName = (m: number, locale: Locale) => (locale === "ar" ? AR_MONTHS : EN_MONTHS)[m];

export function relTime(v: string | number, locale: Locale = "ar") {
  const diff = Date.now() - Number(v);
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return locale === "ar" ? "الآن" : "just now";
  if (mins < 60) return locale === "ar" ? `قبل ${mins} دقيقة` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return locale === "ar" ? `قبل ${hours} ساعة` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return locale === "ar" ? `قبل ${days} يوم` : `${days}d ago`;
  return fmtDate(v, locale, { year: false });
}

/** mm:ss / hh:mm:ss countdown formatter */
export function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function addMinutes(ts: number, mins: number) {
  return ts + mins * 60_000;
}

export function timeRange(start: string, end: string) {
  return `${start} – ${end}`;
}

/* -------------------------------- misc --------------------------------- */
export function initials(name: string) {
  const parts = name.replace(/^(د\.|أ\.د\.|م\.|أ\.)\s*/, "").split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function avatarStyle(hue: number) {
  return {
    background: `linear-gradient(140deg, hsl(${hue} 62% 52%), hsl(${(hue + 36) % 360} 58% 38%))`,
    color: "#fff",
  } as const;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function fileSize(kb: number) {
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
}

export function csrfSafe(value: string) {
  return /^[\w:./-]+$/.test(value);
}
