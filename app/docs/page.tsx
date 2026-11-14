import Link from "next/link";
import { Badge, Card, Icon } from "@/components/ui";
import { DOCS } from "@/lib/docs";
import { getPrefs } from "@/lib/prefs";
import { makeL } from "@/lib/utils";

export const metadata = { title: "المستندات" };

export default async function DocsIndexPage() {
  const { locale } = await getPrefs();
  const l = makeL(locale);

  return (
    <main className="container-app py-10">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-500">{l("حزمة التسليم", "Delivery pack")}</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight text-fg">{l("مستندات منصة المهندس", "Al Mohandes platform documentation")}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
          {l(
            "أحد عشر مستنداً يغطي المنتج، هندسة المعلومات، الرحلات، الهوية، نظام التصميم، قاعدة البيانات، المعمارية، الـAPI، الأمان، الخطة، والاختبار. كلها تُقرأ داخل المنصة، وتُطابق ما هو مبني فعلياً.",
            "Eleven documents covering product, IA, journeys, brand, design system, database, architecture, API, security, roadmap and testing. All readable in-app and matched to what is actually built.",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="success" dot>{l("مطابقة للتنفيذ", "Matched to implementation")}</Badge>
          <Badge tone="neutral">v1.0</Badge>
          <Badge tone="neutral">2026-11</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DOCS.map((d) => (
          <Link key={d.slug} href={`/docs/${d.slug}`} className="group flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:-translate-y-px hover:border-brand-500/40 hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className="tnum text-[11px] font-semibold text-fg-muted">{d.num}</span>
              <Icon name="arrow-up-right" size={14} className="text-fg-muted transition group-hover:text-brand-400" />
            </div>
            <p className="mt-2 text-[13px] font-semibold text-fg">{l(d.titleAr, d.titleEn)}</p>
            <p className="mt-1 flex-1 text-[11px] leading-relaxed text-fg-muted">{l(d.descAr, d.descEn)}</p>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
              <span className="text-[9.5px] text-fg-muted">{d.blocks.length} {l("قسم", "sections")}</span>
              <span className="font-mono text-[9px] text-fg-muted">{d.updated}</span>
            </div>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400"><Icon name="server" size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-fg">{l("ملفات المصدر في المستودع", "Repository source files")}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
              {l(
                "بجانب هذه الصفحات، يحتوي المستودع على db/schema.sql (PostgreSQL DDL كامل) وopenapi.yaml (OpenAPI 3.1)، إضافة إلى نفس المحتوى بصيغة Markdown تحت docs/.",
                "Alongside these pages the repository ships db/schema.sql (complete PostgreSQL DDL) and openapi.yaml (OpenAPI 3.1), plus the same material as Markdown under docs/.",
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["db/schema.sql", "openapi.yaml", "docs/PRD.md", "src/lib/permissions.ts"].map((f) => (
                <span key={f} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[9.5px] text-fg-muted">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}
