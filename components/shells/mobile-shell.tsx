"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, Badge, Sheet } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import { cx } from "@/lib/utils";
import { PrefToggles } from "@/components/pref-toggles";

export interface MobileNavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  icon: IconName;
  badge?: number;
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh justify-center bg-bg lg:min-h-dvh lg:bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(40,100,217,.18),transparent_60%)] lg:py-6">
      <div className="pointer-events-none absolute inset-0 hidden app-grid-bg opacity-30 lg:block" aria-hidden="true" />
      <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-bg lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:max-w-[420px] lg:rounded-[42px] lg:border lg:border-line-strong lg:shadow-device">
        {/* device status bar (desktop preview only) */}
        <div className="hidden shrink-0 items-center justify-between px-6 pt-3 pb-1 text-[10px] font-medium text-fg-muted lg:flex">
          <span className="tnum">9:41</span>
          <span className="absolute start-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-full bg-navy-950/90" aria-hidden="true" />
          <span className="flex items-center gap-1.5">
            <Icon name="wifi" size={11} />
            <Icon name="shield-check" size={11} />
            <span className="tnum">84%</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MobileAppBar({
  title,
  subtitle,
  unread,
  avatarName,
  avatarHue,
  avatarHref,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  unread?: number;
  avatarName?: string;
  avatarHue?: number;
  avatarHref?: string;
  back?: { href: string; label?: string };
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {back && (
          <Link href={back.href} className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-fg-muted" aria-label={back.label ?? "رجوع"}>
            <Icon name="arrow-right" size={16} className="ltr:rotate-180" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-fg">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-fg-muted">{subtitle}</p>}
        </div>
        {right}
        {typeof unread === "number" && (
          <Link href="/student/notifications" className="relative grid size-9 place-items-center rounded-lg border border-line text-fg-muted transition hover:text-fg" aria-label="الإشعارات">
            <Icon name="bell" size={16} />
            {unread > 0 && (
              <span className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[9px] font-bold leading-4 text-white">
                {unread}
              </span>
            )}
          </Link>
        )}
        {avatarName && avatarHref && (
          <Link href={avatarHref} aria-label="الملف الشخصي">
            <Avatar name={avatarName} hue={avatarHue} size={34} />
          </Link>
        )}
      </div>
    </header>
  );
}

export function BottomNav({ items, more }: { items: MobileNavItem[]; more?: { title: string; links: MobileNavItem[] } }) {
  const pathname = usePathname();
  const { l } = usePrefs();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/student" ? pathname === href : pathname.startsWith(href));
  const moreActive = more?.links.some((m) => pathname.startsWith(m.href));

  return (
    <>
      <nav className="relative z-30 shrink-0 border-t border-line bg-bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl" aria-label="التنقل الرئيسي">
        <ul className="grid grid-cols-5">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx("tap relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition", active ? "text-accent-400" : "text-fg-muted hover:text-fg-soft")}
                >
                  <span className={cx("relative grid size-8 place-items-center rounded-lg transition", active && "bg-brand/15")}>
                    <Icon name={item.icon} size={17} strokeWidth={active ? 2.1 : 1.7} />
                    {item.badge ? (
                      <span className="absolute -end-1 -top-0.5 grid min-w-3.5 place-items-center rounded-full bg-danger-500 px-0.5 text-[8px] font-bold leading-3.5 text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  {l(item.labelAr, item.labelEn)}
                  {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-accent-500" />}
                </Link>
              </li>
            );
          })}
          {more && (
            <li>
              <button
                onClick={() => setOpen(true)}
                className={cx("tap flex w-full flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition", moreActive ? "text-accent-400" : "text-fg-muted hover:text-fg-soft")}
                aria-haspopup="dialog"
              >
                <span className={cx("grid size-8 place-items-center rounded-lg", moreActive && "bg-brand/15")}>
                  <Icon name="grid" size={17} />
                </span>
                {l("المزيد", "More")}
              </button>
            </li>
          )}
        </ul>
      </nav>

      {more && (
        <Sheet open={open} onClose={() => setOpen(false)} title={more.title}>
          <div className="grid grid-cols-3 gap-2">
            {more.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface px-2 py-3.5 text-center transition hover:border-line-strong hover:bg-surface-2"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-accent-400">
                  <Icon name={link.icon} size={17} />
                </span>
                <span className="text-[10.5px] leading-tight text-fg-soft">{l(link.labelAr, link.labelEn)}</span>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="text-[11px] text-fg-muted">{l("المظهر واللغة", "Theme & language")}</span>
            <PrefToggles compact />
          </div>
        </Sheet>
      )}
    </>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h2 className="text-[13px] font-semibold text-fg">{children}</h2>
      {action}
    </div>
  );
}

export function ListRow({
  href,
  icon,
  title,
  subtitle,
  meta,
  tone = "neutral",
  right,
}: {
  href?: string;
  icon: IconName;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
  right?: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-3 text-fg-soft",
    brand: "bg-brand/15 text-accent-400",
    success: "bg-success-500/12 text-success-500",
    warning: "bg-warn-500/12 text-warn-500",
    danger: "bg-danger-500/12 text-danger-500",
  };
  const body = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", tones[tone])}>
        <Icon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-fg">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[10.5px] text-fg-muted">{subtitle}</span>}
      </span>
      {meta}
      {right ?? <Icon name="chevron-left" size={14} className="shrink-0 text-fg-muted ltr:rotate-180" />}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-lg transition hover:bg-surface-2">{body}</Link>
  ) : (
    <div className="rounded-lg">{body}</div>
  );
}

export function UnreadPill({ count }: { count: number }) {
  if (!count) return null;
  return <Badge tone="danger">{count}</Badge>;
}
