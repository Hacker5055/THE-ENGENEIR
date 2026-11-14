"use client";

import { usePrefs } from "@/components/providers";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/utils";

export function PrefToggles({ compact, className }: { compact?: boolean; className?: string }) {
  const { theme, toggleTheme, locale, toggleLocale } = usePrefs();
  return (
    <div className={cx("flex items-center gap-1", className)}>
      <button
        onClick={toggleTheme}
        className={cx(
          "tap grid place-items-center rounded-lg border border-line text-fg-muted transition hover:border-line-strong hover:text-fg",
          compact ? "size-8" : "size-9",
        )}
        aria-label={theme === "dark" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
        title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
      </button>
      <button
        onClick={toggleLocale}
        className={cx(
          "tap flex items-center gap-1.5 rounded-lg border border-line px-2 text-fg-muted transition hover:border-line-strong hover:text-fg",
          compact ? "h-8" : "h-9",
        )}
        aria-label="تغيير اللغة"
        title="تغيير اللغة"
      >
        <Icon name="languages" size={14} />
        <span className="text-[11px] font-medium">{locale === "ar" ? "AR" : "EN"}</span>
      </button>
    </div>
  );
}
