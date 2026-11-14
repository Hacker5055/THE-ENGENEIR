import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const icon = readFileSync("public/brand/icon.svg", "utf8");
const tile = (svg) => svg;

for (const size of [192, 512]) {
  const r = new Resvg(icon, { fitTo: { mode: "width", value: size } });
  writeFileSync(`public/brand/icon-${size}.png`, r.render().asPng());
}

// Splash (dark) — 1290x2796-ish scaled down to 960x2080 for repo size
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 2080" width="960" height="2080">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="60%">
      <stop offset="0" stop-color="#1B3A5E"/><stop offset="1" stop-color="#101B2D"/>
    </radialGradient>
    <linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2864D9"/><stop offset="1" stop-color="#0F2650"/></linearGradient>
  </defs>
  <rect width="960" height="2080" fill="url(#g)"/>
  <g opacity="0.12">
    ${Array.from({ length: 22 }).map((_, i) => `<path d="M0 ${i * 96} H960" stroke="#FFFFFF" stroke-width="1"/>`).join("")}
    ${Array.from({ length: 10 }).map((_, i) => `<path d="M${i * 96} 0 V2080" stroke="#FFFFFF" stroke-width="1"/>`).join("")}
  </g>
  <g transform="translate(360 820)">
    <rect width="240" height="240" rx="58" fill="url(#l)"/>
    ${readFileSync("public/brand/icon.svg", "utf8").match(/<g transform="translate\(8 6\) scale\(1\)">([\s\S]*?)<\/g>/)[1].replace(/stroke-width="/g, 'stroke-width="').replace(/([\d.]+)"/g, (m, n) => (parseFloat(n) * 3).toString() + '"')}
  </g>
  <text x="480" y="1180" text-anchor="middle" font-family="IBM Plex Sans Arabic, sans-serif" font-size="76" font-weight="600" fill="#EEF3FA">المهندس</text>
  <text x="480" y="1240" text-anchor="middle" font-family="Inter, sans-serif" font-size="30" letter-spacing="14" fill="#38A5FF">AL MOHANDES</text>
  <text x="480" y="1960" text-anchor="middle" font-family="IBM Plex Sans Arabic, sans-serif" font-size="24" fill="#93A4BC">إدارة تعليمية ذكية · اختبارات آمنة</text>
</svg>`;
writeFileSync("public/brand/splash.svg", splash);
const rSplash = new Resvg(splash, { fitTo: { mode: "width", value: 720 } });
writeFileSync("public/brand/splash.png", rSplash.render().asPng());

console.log("brand assets rendered");
