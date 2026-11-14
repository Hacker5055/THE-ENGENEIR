"use client";

import { useMemo } from "react";
import { Badge, Icon } from "@/components/ui";
import { usePrefs } from "@/components/providers";
import type { DocBlock } from "@/lib/docs";
import { cx } from "@/lib/utils";

const slugify = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48);

export function DocBody({ blocks }: { blocks: DocBlock[] }) {
  const { l } = usePrefs();

  const headings = useMemo(
    () => blocks.filter((b): b is Extract<DocBlock, { t: "h2" }> => b.t === "h2").map((b) => ({ id: slugify(b.ar), ar: b.ar, en: b.en })),
    [blocks],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
      <article className="min-w-0 space-y-4">
        {blocks.map((b, i) => {
          switch (b.t) {
            case "h2":
              return (
                <h2 key={i} id={slugify(b.ar)} className="mt-7 scroll-mt-20 border-t border-line pt-5 text-[18px] font-semibold text-fg first:mt-0 first:border-0 first:pt-0">
                  {l(b.ar, b.en)}
                </h2>
              );
            case "h3":
              return <h3 key={i} className="mt-4 text-[13.5px] font-semibold text-fg">{l(b.ar, b.en)}</h3>;
            case "p":
              return <p key={i} className="text-[12.5px] leading-[1.9] text-fg-soft">{l(b.ar, b.en)}</p>;
            case "ul":
              return (
                <ul key={i} className="space-y-1.5">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-2 text-[12px] leading-[1.85] text-fg-soft">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-400" />
                      <span>{l(it.ar, it.en)}</span>
                    </li>
                  ))}
                </ul>
              );
            case "ol":
              return (
                <ol key={i} className="space-y-1.5">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-2.5 text-[12px] leading-[1.85] text-fg-soft">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-500/15 font-mono text-[9px] font-semibold text-brand-400">{j + 1}</span>
                      <span>{l(it.ar, it.en)}</span>
                    </li>
                  ))}
                </ol>
              );
            case "table":
              return (
                <div key={i} className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[520px] border-collapse text-[11.5px]">
                    <thead>
                      <tr className="bg-surface-2/70">
                        {b.headers.map((h, j) => (
                          <th key={j} className="border-b border-line px-3 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-fg-muted">
                            {l(h.ar, h.en)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.rows.map((row, j) => (
                        <tr key={j} className="even:bg-surface-2/30">
                          {row.map((cell, k) => (
                            <td key={k} className={cx("border-b border-line/60 px-3 py-2 align-top leading-relaxed", k === 0 ? "font-medium text-fg" : "text-fg-soft")}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case "note":
              return (
                <div
                  key={i}
                  className={cx(
                    "flex gap-2.5 rounded-xl border p-3.5",
                    b.tone === "warn" ? "border-warn-500/30 bg-warn-500/[0.07]" : b.tone === "success" ? "border-success-500/30 bg-success-500/[0.07]" : "border-brand-500/25 bg-brand-500/[0.06]",
                  )}
                >
                  <Icon name={b.tone === "warn" ? "alert" : b.tone === "success" ? "check-circle" : "info"} size={15} className={cx("mt-0.5 shrink-0", b.tone === "warn" ? "text-warn-500" : b.tone === "success" ? "text-success-500" : "text-brand-400")} />
                  <p className="text-[11.5px] leading-[1.85] text-fg-soft">{l(b.ar, b.en)}</p>
                </div>
              );
            case "code":
              return (
                <pre key={i} dir="ltr" className="overflow-x-auto rounded-xl border border-line bg-[#0B1424] p-3.5 text-[10.5px] leading-[1.8] text-[#C9D7E8]">
                  <code>{b.body}</code>
                </pre>
              );
            case "kv":
              return (
                <div key={i} className="divide-y divide-line rounded-xl border border-line">
                  {b.rows.map((r, j) => (
                    <div key={j} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 text-[11.5px] text-fg-soft">{l(r.kAr, r.kEn)}</span>
                      <span className="font-mono text-[10.5px] text-fg-muted">{r.v}</span>
                    </div>
                  ))}
                </div>
              );
            default:
              return null;
          }
        })}
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-muted">{l("في هذه الصفحة", "On this page")}</p>
          <nav className="space-y-0.5 border-s border-line ps-2.5">
            {headings.map((h) => (
              <a key={h.id} href={`#${h.id}`} className="block truncate py-0.5 text-[11px] text-fg-muted transition hover:text-brand-400">
                {l(h.ar, h.en)}
              </a>
            ))}
          </nav>
          <div className="rounded-lg border border-line bg-surface-2/60 p-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold text-fg-soft">
              <Badge tone="success">{l("حيّ", "Live")}</Badge>
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-fg-muted">
              {l("هذه المستندات جزء من المنتج نفسه — تُقرأ من نفس الكود الذي يعمل.", "These documents ship with the product — read from the same code that runs.")}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
