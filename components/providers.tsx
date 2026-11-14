"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, Theme } from "@/lib/types";
import { cx } from "@/lib/utils";

/* ------------------------------ preferences ----------------------------- */
interface PrefCtx {
  locale: Locale;
  theme: Theme;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleLocale: () => void;
  /** translate helper: l("عربي", "English") */
  l: (ar: string, en: string) => string;
}

const PreferencesContext = createContext<PrefCtx | null>(null);

export function PreferencesProvider({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: Theme;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `am_lang=${next};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      router.refresh();
    },
    [router],
  );

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.cookie = `am_theme=${next};path=/;max-age=31536000;samesite=lax`;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
  }, []);

  const value = useMemo<PrefCtx>(
    () => ({
      locale,
      theme,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar"),
      l: (ar, en) => (locale === "ar" ? ar : en),
    }),
    [locale, theme, setLocale, setTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    // Safe fallback for isolated previews.
    return {
      locale: "ar" as Locale,
      theme: "dark" as Theme,
      dir: "rtl" as const,
      setLocale: () => {},
      setTheme: () => {},
      toggleTheme: () => {},
      toggleLocale: () => {},
      l: (ar: string) => ar,
    };
  }
  return ctx;
}

/* --------------------------------- toasts -------------------------------- */
type Tone = "success" | "error" | "info" | "warning";
interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}
interface ToastCtx {
  toast: (t: { title: string; description?: string; tone?: Tone }) => void;
}
const ToastContext = createContext<ToastCtx>({ toast: () => {} });

const TONE_STYLES: Record<Tone, string> = {
  success: "border-success-500/40 bg-success-500/10 text-success-500",
  error: "border-danger-500/40 bg-danger-500/10 text-danger-500",
  warning: "border-warn-500/40 bg-warn-500/10 text-warn-500",
  info: "border-accent-500/40 bg-accent-500/10 text-accent-500",
};

const TONE_ICON: Record<Tone, string> = { success: "✓", error: "!", warning: "▲", info: "i" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((t: { title: string; description?: string; tone?: Tone }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, title: t.title, description: t.description, tone: t.tone ?? "success" }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4 no-print"
        role="region"
        aria-live="polite"
        aria-label="الإشعارات الفورية"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line-strong bg-bg-elevated/95 p-3.5 shadow-lg backdrop-blur animate-fade-up"
          >
            <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-bold", TONE_STYLES[t.tone])}>
              {TONE_ICON[t.tone]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{t.description}</p>}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="rounded-md p-1 text-fg-muted transition hover:bg-surface hover:text-fg"
              aria-label="إغلاق التنبيه"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* --------------------------- online/offline state ------------------------ */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
