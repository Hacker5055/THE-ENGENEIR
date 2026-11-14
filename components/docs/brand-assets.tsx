"use client";

import { usePrefs } from "@/components/providers";
import { Card, CardHeader } from "@/components/ui";

const ASSETS: { src: string; labelAr: string; labelEn: string; bg: "dark" | "light"; wide?: boolean }[] = [
  { src: "/brand/icon.svg", labelAr: "الأيقونة", labelEn: "App icon", bg: "dark" },
  { src: "/brand/monogram.svg", labelAr: "الرمز", labelEn: "Monogram", bg: "light" },
  { src: "/brand/wordmark-ar-dark.svg", labelAr: "الكلمة — داكن", labelEn: "Wordmark — dark", bg: "dark", wide: true },
  { src: "/brand/wordmark-ar-light.svg", labelAr: "الكلمة — فاتح", labelEn: "Wordmark — light", bg: "light", wide: true },
];

export function BrandAssets() {
  const { l } = usePrefs();

  return (
    <Card className="mb-6">
      <CardHeader
        title={l("ملفات الهوية في المستودع", "Brand files in the repository")}
        subtitle={l("SVG متجهية، بلا ظلال ولا تدرجات — القواعد كاملة في المستند أدناه", "Vector SVG, no shadows or gradients — full rules in the document below")}
        icon="shield-check"
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ASSETS.map((a) => (
          <figure key={a.src} className="overflow-hidden rounded-lg border border-line">
            <div
              className={`grid h-24 place-items-center p-3 ${a.bg === "dark" ? "bg-[#101B2D]" : "bg-[#F3F6FA]"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.src} alt={l(a.labelAr, a.labelEn)} className={a.wide ? "max-h-9 w-full object-contain" : "h-12 w-12 object-contain"} />
            </div>
            <figcaption className="flex items-center justify-between gap-2 bg-surface px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-fg">{l(a.labelAr, a.labelEn)}</span>
              <span className="font-mono text-[8.5px] text-fg-muted">{a.src.replace("/brand/", "")}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {["#101B2D", "#192B45", "#22334D", "#2864D9", "#38A5FF", "#19B88A", "#F2A93B", "#F05252", "#F3F6FA"].map((hex) => (
          <span key={hex} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2/60 px-1.5 py-0.5">
            <span className="h-3 w-3 rounded-sm border border-black/10" style={{ background: hex }} />
            <span className="font-mono text-[8.5px] text-fg-muted">{hex}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}
