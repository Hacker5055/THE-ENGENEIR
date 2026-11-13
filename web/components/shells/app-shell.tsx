"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, Badge, Button, Modal } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import { PrefToggles } from "@/components/pref-toggles";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import type { NavGroup } from "@/lib/nav";
import type { SessionUser } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { cx } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";

type SearchHit = { kind: string; title: string; subtitle: string; href: string };
type SearchGroup = { key: string; items: SearchHit[] };

const KIND_ICON: Record<string, IconName> = {
  student: "graduation",
  teacher: "user-check",
  course: "book",
  exam: "clipboard",
  complaint: "inbox",
  institution: "building",
  question: "file-text",
};

const GROUP_LABEL: Record<string, { ar: string; en: string }> = {
  students: { ar: "الطلاب", en: "Students" },
  teachers: { ar: "هيئة التدريس", en: "Teachers" },
  courses: { ar: "المقررات", en: "Courses" },
  exams: { ar: "الاختبارات", en: "Exams" },
  complaints: { ar: "الشكاوى", en: "Complaints" },
  institutions: { ar: "المؤسسات", en: "Institutions" },
  questions: { ar: "بنك الأسئلة", en: "Questions" },
};

const ROLE_LABEL: Record<string, { ar: string; en: string }> = {
  SUPER_ADMIN: { ar: "مدير المنصة", en: "Super admin" },
  INSTITUTION_ADMIN: { ar: "مدير المؤسسة", en: "Institution admin" },
  EXAM_SUPERVISOR: { ar: "مراقب الاختبارات", en: "Exam supervisor" },
  TEACHER: { ar: "عضو هيئة تدريس", en: "Teacher" },
  STUDENT: { ar: "طالب", en: "Student" },
};

export function AppShell({
  user,
  nav,
  children,
  notificationsHref,
  unread = 0,
  badges,
}: {
  user: SessionUser;
  nav: NavGroup[];
  children: React.ReactNode;
  notificationsHref: string;
  unread?: number;
  badges?: Partial<Record<"attemptReviews" | "complaints" | "grading" | "incidents", number>>;
}) {
  const pathname = usePathname();
  const { l, locale } = usePrefs();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement | null>(null);

  const allowed = ROLE_PERMISSIONS[user.role] ?? [];
  const groups = useMemo(
    () =>
      nav
        .map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || allowed.includes(i.permission)) }))
        .filter((g) => g.items.length > 0),
    [nav, allowed],
  );

  const allItems = groups.flatMap((g) => g.items);

  const pageHits = allItems
    .filter((i) => !query.trim() || `${i.labelAr} ${i.labelEn} ${i.href}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
  const flat = [...pageHits.map((p) => ({ href: p.href })), ...hits.flatMap((g) => g.items.map((i) => ({ href: i.href })))];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  // Entity search behind the ⌘K palette (debounced, cancelled on change).
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await res.json()) as { groups?: SearchGroup[] };
        setHits(data.groups ?? []);
      } catch {
        // aborted or offline — keep the previous results
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => setCursor(0), [query]);

  const isActive = (href: string) => (href === "/admin" || href === "/teacher" ? pathname === href : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cx("flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4", collapsed && "justify-center px-2")}>
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden" aria-label="المهندس">
          <LogoMark size={34} />
          {!collapsed && <Wordmark locale={locale} size="sm" className="whitespace-nowrap" />}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 scroll-slim" aria-label="التنقل الجانبي">
        {groups.map((group) => (
          <div key={group.labelAr} className="mb-3">
            {!collapsed && (
              <p className="px-2.5 pb-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-fg-muted/80">
                {l(group.labelAr, group.labelEn)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const count = item.badgeKey ? badges?.[item.badgeKey] : undefined;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? l(item.labelAr, item.labelEn) : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "tap group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition",
                        active ? "bg-brand/15 font-medium text-accent-300" : "text-fg-soft hover:bg-surface-2 hover:text-fg",
                        collapsed && "justify-center px-2",
                      )}
                    >
                      <Icon name={item.icon} size={16} className={cx("shrink-0", active ? "text-accent-400" : "text-fg-muted group-hover:text-fg-soft")} />
                      {!collapsed && <span className="min-w-0 flex-1 truncate">{l(item.labelAr, item.labelEn)}</span>}
                      {!collapsed && count ? (
                        <span className="grid min-w-4.5 place-items-center rounded-full bg-danger-500/15 px-1.5 text-[10px] font-semibold leading-4.5 text-danger-500">
                          {count}
                        </span>
                      ) : null}
                      {active && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-accent-500" aria-hidden="true" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-2">
        {!collapsed ? (
          <div className="mb-2 rounded-lg border border-line bg-surface-2/60 p-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar name={user.nameAr} hue={user.avatarHue} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-fg">{user.nameAr}</p>
                <p className="truncate text-[10px] text-fg-muted">{l(ROLE_LABEL[user.role].ar, ROLE_LABEL[user.role].en)}</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-2">
              <Button type="submit" variant="ghost" size="xs" icon="logout" className="w-full justify-start text-fg-muted">
                {l("تسجيل الخروج", "Sign out")}
              </Button>
            </form>
          </div>
        ) : (
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon" aria-label="تسجيل الخروج" className="mx-auto flex">
              <Icon name="logout" size={16} />
            </Button>
          </form>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[10.5px] text-fg-muted transition hover:bg-surface-2 hover:text-fg lg:flex"
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={12} />
          {!collapsed && l("طي القائمة", "Collapse")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* desktop sidebar */}
      <aside
        className={cx(
          "sticky top-0 hidden h-dvh shrink-0 border-e border-line bg-bg-elevated transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-[248px]",
        )}
      >
        {sidebar}
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-navy-950/70" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 start-0 w-[270px] border-e border-line bg-bg-elevated shadow-lg animate-fade-in">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-xl md:px-6 no-print">
          <button onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted lg:hidden" aria-label="فتح القائمة">
            <Icon name="panel-left" size={17} />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 text-[12px] text-fg-muted transition hover:border-line-strong hover:bg-surface md:flex"
          >
            <Icon name="search" size={14} />
            <span className="flex-1 text-start">{l("ابحث في المنصة…", "Search the platform…")}</span>
            <kbd className="rounded border border-line px-1 py-0.5 font-mono text-[9px] text-fg-muted">⌘K</kbd>
          </button>

          <div className="ms-auto flex items-center gap-1.5">
            <button
              onClick={() => setPaletteOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition hover:text-fg md:hidden"
              aria-label={l("بحث", "Search")}
            >
              <Icon name="search" size={16} />
            </button>
            <Link
              href={notificationsHref}
              className="relative grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition hover:text-fg"
              aria-label={l("الإشعارات", "Notifications")}
            >
              <Icon name="bell" size={16} />
              {unread > 0 && (
                <span className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[9px] font-bold leading-4 text-white">
                  {unread}
                </span>
              )}
            </Link>
            <PrefToggles compact className="hidden sm:flex" />
            <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="text-end">
                <p className="text-[11.5px] font-medium leading-tight text-fg">{user.nameAr}</p>
                <p className="text-[10px] leading-tight text-fg-muted">{l(ROLE_LABEL[user.role].ar, ROLE_LABEL[user.role].en)}</p>
              </div>
              <Avatar name={user.nameAr} hue={user.avatarHue} size={34} />
            </div>
          </div>
        </header>

        <main className="flex-1 pb-16">{children}</main>
      </div>

      {/* command palette — pages + live entity search */}
      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title={l("البحث والتنقل السريع", "Search & quick navigation")} size="md">
        <div className="relative mb-3">
          <Icon name="search" size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, flat.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                const target = flat[cursor];
                if (target) {
                  e.preventDefault();
                  setPaletteOpen(false);
                  router.push(target.href);
                }
              }
            }}
            placeholder={l("ابحث عن طالب، مقرر، اختبار، شكوى، أو صفحة…", "Search students, courses, exams, complaints, or pages…")}
            className="h-10 w-full rounded-lg border border-line-strong bg-bg-elevated ps-9 pe-3 text-[13px] text-fg placeholder:text-fg-muted focus:border-accent-500/60 focus:outline-none"
            aria-label={l("بحث", "Search")}
          />
          {searching && <span className="absolute end-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-accent-500" aria-hidden="true" />}
        </div>

        <div ref={listRef} className="max-h-[min(60vh,26rem)] space-y-3 overflow-y-auto pe-0.5">
          {pageHits.length > 0 && (
            <section>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{l("الصفحات", "Pages")}</p>
              <ul className="space-y-0.5">
                {pageHits.map((i) => (
                  <li key={`page-${i.href}`}>
                    <Link
                      href={i.href}
                      onClick={() => setPaletteOpen(false)}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition",
                        flat[cursor]?.href === i.href ? "bg-surface-2 text-fg" : "text-fg-soft hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      <Icon name={i.icon} size={15} className="text-fg-muted" />
                      <span className="flex-1">{l(i.labelAr, i.labelEn)}</span>
                      <span className="font-mono text-[10px] text-fg-muted">{i.href}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hits.map((group) => (
            <section key={group.key}>
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                {l(GROUP_LABEL[group.key]?.ar ?? group.key, GROUP_LABEL[group.key]?.en ?? group.key)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={`${item.kind}-${item.href}-${item.title}`}>
                    <Link
                      href={item.href}
                      onClick={() => setPaletteOpen(false)}
                      className={cx(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition",
                        flat[cursor]?.href === item.href ? "bg-surface-2 text-fg" : "text-fg-soft hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      <Icon name={KIND_ICON[item.kind] ?? "file-text"} size={15} className="text-fg-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px]">{item.title}</span>
                        <span className="block truncate text-[10.5px] text-fg-muted">{item.subtitle}</span>
                      </span>
                      <Icon name="arrow-up-right" size={12} className="text-fg-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {!searching && pageHits.length === 0 && hits.length === 0 && (
            <div className="py-8 text-center">
              <Icon name="search" size={20} className="mx-auto text-fg-muted" />
              <p className="mt-2 text-xs text-fg-muted">
                {query.trim().length >= 2
                  ? l("لا توجد نتائج مطابقة", "No matching results")
                  : l("اكتب حرفين على الأقل للبحث في بيانات المؤسسة", "Type at least two characters to search the institution")}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-line pt-2 text-[10px] text-fg-muted">
          <span className="flex items-center gap-1"><kbd className="rounded border border-line px-1 font-mono">↑</kbd><kbd className="rounded border border-line px-1 font-mono">↓</kbd> {l("تنقّل", "move")}</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-line px-1 font-mono">↵</kbd> {l("فتح", "open")}</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-line px-1 font-mono">esc</kbd> {l("إغلاق", "close")}</span>
          {hits.length > 0 && <span className="ms-auto">{hits.reduce((n, g) => n + g.items.length, 0)} {l("نتيجة", "results")}</span>}
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------- Page header ------------------------------ */
export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  badge,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {breadcrumb && (
          <nav aria-label="مسار التنقل" className="mb-1.5 flex flex-wrap items-center gap-1 text-[10.5px] text-fg-muted">
            {breadcrumb.map((b, i) => (
              <span key={b.label} className="flex items-center gap-1">
                {i > 0 && <Icon name="chevron-left" size={10} className="rtl:rotate-0 ltr:rotate-180" />}
                {b.href ? (
                  <Link href={b.href} className="transition hover:text-fg">{b.label}</Link>
                ) : (
                  <span className="text-fg-soft">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[19px] font-semibold tracking-tight text-fg md:text-[21px]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  trend,
  spark,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: IconName;
  tone?: "brand" | "success" | "warning" | "danger" | "accent" | "neutral";
  trend?: { value: string; positive?: boolean };
  spark?: React.ReactNode;
  href?: string;
}) {
  const tones = {
    brand: "bg-brand/12 text-accent-400",
    accent: "bg-accent-500/12 text-accent-400",
    success: "bg-success-500/12 text-success-500",
    warning: "bg-warn-500/12 text-warn-500",
    danger: "bg-danger-500/12 text-danger-500",
    neutral: "bg-surface-3 text-fg-muted",
  };
  const inner = (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-fg-muted">{label}</p>
        {icon && <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg", tones[tone])}><Icon name={icon} size={14} /></span>}
      </div>
      <div>
        <div className="flex items-end gap-2">
          <p className="tnum text-[22px] font-semibold leading-none text-fg">{value}</p>
          {trend && (
            <span className={cx("flex items-center gap-0.5 text-[10.5px] font-medium", trend.positive === false ? "text-danger-500" : "text-success-500")}>
              <Icon name="trending-up" size={11} className={trend.positive === false ? "rotate-90" : ""} />
              {trend.value}
            </span>
          )}
        </div>
        {hint && <p className="mt-1 text-[10.5px] text-fg-muted">{hint}</p>}
      </div>
      {spark}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function ToolbarBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2.5">{children}</div>;
}

export function StatusDot({ tone = "success", label }: { tone?: "success" | "warning" | "danger" | "neutral"; label: string }) {
  const tones = { success: "bg-success-500", warning: "bg-warn-500", danger: "bg-danger-500", neutral: "bg-fg-muted" };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
      <span className={cx("size-1.5 rounded-full", tones[tone])} />
      {label}
    </span>
  );
}

export function BadgeCount({ n }: { n: number }) {
  return <Badge tone={n > 0 ? "danger" : "neutral"}>{n}</Badge>;
}
