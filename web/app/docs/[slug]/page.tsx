import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Icon } from "@/components/ui";
import { DocBody } from "@/components/docs/doc-body";
import { BrandAssets } from "@/components/docs/brand-assets";
import { DOCS, getDoc } from "@/lib/docs";
import { getPrefs } from "@/lib/prefs";
import { makeL } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  return { title: doc ? doc.titleAr : "المستندات" };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  const { locale } = await getPrefs();
  const l = makeL(locale);

  const index = DOCS.findIndex((d) => d.slug === doc.slug);
  const prev = DOCS[index - 1];
  const next = DOCS[index + 1];

  return (
    <main className="container-app py-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-fg-muted">
        <Link href="/docs" className="hover:text-fg">{l("المستندات", "Documentation")}</Link>
        <Icon name="chevron-right" size={10} className="rtl:rotate-180" />
        <span className="text-fg-soft">{l(doc.titleAr, doc.titleEn)}</span>
      </nav>

      <header className="mt-4 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tnum rounded-md bg-brand-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-brand-400">{doc.num}</span>
          <Badge tone="neutral">{doc.blocks.length} {l("قسم", "sections")}</Badge>
          <span className="font-mono text-[9.5px] text-fg-muted">{l("آخر تحديث", "updated")} {doc.updated}</span>
        </div>
        <h1 className="mt-2.5 text-[26px] font-semibold leading-tight text-fg">{l(doc.titleAr, doc.titleEn)}</h1>
        <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-fg-muted">{l(doc.descAr, doc.descEn)}</p>
      </header>

      <div className="mt-6">
        {doc.slug === "brand-identity" && <BrandAssets />}
        <DocBody blocks={doc.blocks} />
      </div>

      <nav className="mt-10 flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="group inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[11.5px] text-fg-soft transition hover:border-brand-500/40">
            <Icon name="chevron-right" size={12} className="rtl:rotate-180" />
            <span>
              <span className="block text-[9px] text-fg-muted">{l("السابق", "Previous")}</span>
              {l(prev.titleAr, prev.titleEn)}
            </span>
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/docs/${next.slug}`} className="group inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-end text-[11.5px] text-fg-soft transition hover:border-brand-500/40 sm:ms-auto">
            <span>
              <span className="block text-[9px] text-fg-muted">{l("التالي", "Next")}</span>
              {l(next.titleAr, next.titleEn)}
            </span>
            <Icon name="chevron-left" size={12} className="rtl:rotate-180" />
          </Link>
        ) : <span />}
      </nav>
    </main>
  );
}
