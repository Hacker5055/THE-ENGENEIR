"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { usePrefs } from "@/components/providers";
import { cx } from "@/lib/utils";

type Hit = { kind: string; title: string; subtitle: string; href: string };
type Group = { key: string; items: Hit[] };

const KIND_ICON: Record<string, IconName> = {
  course: "book",
  exam: "clipboard",
  question: "file-text",
  student: "graduation",
};

const GROUP_LABEL: Record<string, { ar: string; en: string }> = {
  courses: { ar: "المقررات", en: "Courses" },
  exams: { ar: "الاختبارات", en: "Exams" },
};

const SUGGESTIONS = [
  { ar: "خوارزميات", en: "Algorithms" },
  { ar: "شبكات", en: "Networks" },
  { ar: "CS301", en: "CS301" },
  { ar: "اختبار", en: "exam" },
];

export function StudentSearch() {
  const { l } = usePrefs();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await res.json()) as { groups?: Group[] };
        setGroups(data.groups ?? []);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-4 px-4 pt-4">
      <div className="relative">
        <Icon name="search" size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={l("ابحث عن مقرر أو اختبار…", "Search courses or exams…")}
          className="h-11 w-full rounded-xl border border-line-strong bg-surface ps-10 pe-3 text-[13px] text-fg placeholder:text-fg-muted focus:border-accent-500/60 focus:outline-none"
          aria-label={l("بحث", "Search")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute end-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-surface-3 text-fg-muted"
            aria-label={l("مسح", "Clear")}
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      {query.trim().length < 2 && (
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-fg-muted">{l("اقتراحات", "Suggestions")}</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.en}
                onClick={() => setQuery(l(s.ar, s.en))}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-fg-soft transition hover:border-line-strong hover:text-fg"
              >
                {l(s.ar, s.en)}
              </button>
            ))}
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-[10.5px] leading-relaxed text-fg-muted">
            <Icon name="info" size={12} className="mt-0.5 shrink-0" />
            {l(
              "البحث يعمل داخل مقرراتك واختباراتك فقط — لا يمكن الوصول إلى بيانات طلاب آخرين.",
              "Search is limited to your own courses and exams — other students’ records are never reachable.",
            )}
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      )}

      {!loading &&
        groups.map((group) => (
          <section key={group.key}>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-fg-muted">
              {l(GROUP_LABEL[group.key]?.ar ?? group.key, GROUP_LABEL[group.key]?.en ?? group.key)}
            </p>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={`${item.kind}-${item.href}-${item.title}`}>
                  <Link
                    href={item.href}
                    className={cx(
                      "flex items-center gap-2.5 rounded-xl border border-line bg-surface p-3 transition hover:border-line-strong",
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-fg-muted">
                      <Icon name={KIND_ICON[item.kind] ?? "file-text"} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-fg">{item.title}</span>
                      <span className="block truncate text-[10.5px] text-fg-muted">{item.subtitle}</span>
                    </span>
                    <Icon name="chevron-left" size={13} className="text-fg-muted ltr:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {!loading && query.trim().length >= 2 && total === 0 && (
        <div className="rounded-xl border border-dashed border-line-strong py-10 text-center">
          <Icon name="search" size={20} className="mx-auto text-fg-muted" />
          <p className="mt-2 text-[12px] text-fg-muted">{l("لا توجد نتائج مطابقة لبحثك", "No matches for your search")}</p>
        </div>
      )}
    </div>
  );
}
