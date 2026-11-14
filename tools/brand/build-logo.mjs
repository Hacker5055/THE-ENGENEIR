import * as fk from "fontkit";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const fontkit = fk.default ?? fk;
const font = fontkit.openSync("node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2");
const glyph = font.layout("م").glyphs[0];
const d = glyph.path.toSVG();
const bb = glyph.bbox;
const scale = 0.0588;
const tx = +((64 - (bb.maxX - bb.minX) * scale) / 2 - bb.minX * scale).toFixed(3);
const ty = +(10 + bb.maxY * scale).toFixed(3);
const transform = `translate(${tx} ${ty}) scale(${scale} ${-scale})`;

const DEFS = `<defs>
    <linearGradient id="tile" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2E6FE6"/><stop offset="0.55" stop-color="#1B4AA8"/><stop offset="1" stop-color="#0F2650"/>
    </linearGradient>
    <linearGradient id="glyphFill" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/><stop offset="0.62" stop-color="#EAF4FF"/><stop offset="1" stop-color="#A9D4FF"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.18" cy="-0.1" r="1.05">
      <stop stop-color="#FFFFFF" stop-opacity="0.30"/><stop offset="0.7" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const mark = (glyphFill = "url(#glyphFill)", datum = "#38A5FF") => `
  <g transform="${transform}"><path d="${d}" fill="${glyphFill}"/></g>
  <path d="M12 55.6H52" stroke="${datum}" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>
  <path d="M12 53.2v4.8M52 53.2v4.8" stroke="${datum}" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="المهندس — AL MOHANDES">
  ${DEFS}
  <rect width="64" height="64" rx="16" fill="url(#tile)"/>
  <rect width="64" height="64" rx="16" fill="url(#sheen)"/>
  ${mark()}
</svg>`;

const iconDark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${DEFS}
  <rect width="64" height="64" rx="16" fill="#101B2D"/>
  ${mark()}
</svg>`;

const iconLight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${DEFS}
  <rect width="64" height="64" rx="16" fill="#F3F6FA"/>
  ${mark("#16233A", "#2864D9")}
</svg>`;

const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${DEFS}
  ${mark("currentColor", "currentColor")}
</svg>`;

const bare = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${DEFS}
  ${mark()}
</svg>`;

writeFileSync("public/brand/icon.svg", icon);
writeFileSync("public/brand/icon-dark.svg", iconDark);
writeFileSync("public/brand/icon-light.svg", iconLight);
writeFileSync("public/brand/icon-mono.svg", mono);
writeFileSync("public/brand/monogram.svg", bare);

const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 2080" width="960" height="2080">
  ${DEFS}
  <defs><radialGradient id="bgS" cx="50%" cy="34%" r="62%"><stop offset="0" stop-color="#1B3A5E"/><stop offset="1" stop-color="#101B2D"/></radialGradient></defs>
  <rect width="960" height="2080" fill="url(#bgS)"/>
  <g opacity="0.10">${Array.from({ length: 22 }).map((_, i) => `<path d="M0 ${i * 96}H960" stroke="#FFF"/>`).join("")}${Array.from({ length: 11 }).map((_, i) => `<path d="M${i * 96} 0V2080" stroke="#FFF"/>`).join("")}</g>
  <g transform="translate(352 760) scale(4)"><rect width="64" height="64" rx="16" fill="url(#tile)"/><rect width="64" height="64" rx="16" fill="url(#sheen)"/>${mark()}</g>
  <text x="480" y="1160" text-anchor="middle" font-family="IBM Plex Sans Arabic" font-size="84" font-weight="600" fill="#EEF3FA">المهندس</text>
  <text x="480" y="1230" text-anchor="middle" font-family="Inter" font-size="30" letter-spacing="16" fill="#38A5FF">AL MOHANDES</text>
  <text x="480" y="1940" text-anchor="middle" font-family="IBM Plex Sans Arabic" font-size="26" fill="#93A4BC">إدارة تعليمية ذكية · اختبارات آمنة</text>
</svg>`;
writeFileSync("public/brand/splash.svg", splash);

for (const size of [192, 512]) {
  writeFileSync(`public/brand/icon-${size}.png`, new Resvg(icon, { fitTo: { mode: "width", value: size } }).render().asPng());
}
writeFileSync("public/brand/splash.png", new Resvg(splash, { fitTo: { mode: "width", value: 720 } }).render().asPng());

// Preview sheet at real UI sizes
const preview = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 300" width="760" height="300">${DEFS}
<rect width="760" height="300" fill="#0B1424"/>
<g transform="translate(40 40) scale(3.2)">${icon.replace(/<\/?svg[^>]*>/g, "").replace(/<defs>[\s\S]*?<\/defs>/, "")}</g>
<g transform="translate(280 70) scale(1.4)">${icon.replace(/<\/?svg[^>]*>/g, "").replace(/<defs>[\s\S]*?<\/defs>/, "")}</g>
<g transform="translate(400 90) scale(0.75)">${iconDark.replace(/<\/?svg[^>]*>/g, "").replace(/<defs>[\s\S]*?<\/defs>/, "")}</g>
<g transform="translate(480 92) scale(0.5)">${icon.replace(/<\/?svg[^>]*>/g, "").replace(/<defs>[\s\S]*?<\/defs>/, "")}</g>
<g transform="translate(560 40) scale(1.7)">${iconLight.replace(/<\/?svg[^>]*>/g, "").replace(/<defs>[\s\S]*?<\/defs>/, "")}</g>
<text x="40" y="270" fill="#93A4BC" font-family="Inter" font-size="13">app icon · 48 · 24 · dark tile · light tile</text>
</svg>`;
writeFileSync("public/brand/logo-sheet.png", new Resvg(preview, { fitTo: { mode: "width", value: 1520 } }).render().asPng());

writeFileSync("scripts/glyph-data.json", JSON.stringify({ d, transform, tx, ty, scale }, null, 2));
console.log("logo built", { tx, ty, dLength: d.length });
