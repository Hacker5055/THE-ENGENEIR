import Link from "next/link";
import { Icon } from "@/components/ui";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { PrefToggles } from "@/components/pref-toggles";
import { getPrefs } from "@/lib/prefs";
import { makeL } from "@/lib/utils";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getPrefs();
  const l = makeL(locale);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="container-app flex h-14 items-center gap-3">
          <Link href="/" className="flex items-center gap-2" aria-label="المهندس">
            <LogoMark size={28} />
            <Wordmark locale={locale} size="sm" />
          </Link>
          <span className="hidden text-[11px] text-fg-muted sm:inline">/ {l("المستندات", "Documentation")}</span>
          <nav className="ms-auto flex items-center gap-1.5">
            <Link href="/docs" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium text-fg-soft transition hover:bg-surface-2 hover:text-fg">
              <Icon name="book" size={13} /> {l("كل المستندات", "All docs")}
            </Link>
            <Link href="/login" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-[11.5px] font-semibold text-white transition hover:bg-brand-600">
              {l("دخول المنصة", "Open platform")}
            </Link>
            <PrefToggles compact />
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-line py-6">
        <div className="container-app flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-fg-muted">
          <span>© 2026 {l("المهندس — نظام إدارة التعليم الهندسي", "Al Mohandes — engineering education management")}</span>
          <span className="font-mono">v1.0 · 2026-11</span>
        </div>
      </footer>
    </div>
  );
}
