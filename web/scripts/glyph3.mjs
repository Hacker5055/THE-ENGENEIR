import * as fk from "fontkit";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const fontkit = fk.default ?? fk;
const font = fontkit.openSync("node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2");
const g = font.layout("م").glyphs[0];
const d = g.path.toSVG();
const bb = g.bbox;
const scale = 0.0588;
const tx = (64 - (bb.maxX - bb.minX) * scale) / 2 - bb.minX * scale;
const ty = 10 + bb.maxY * scale;
const glyph = (fill) => `<g transform="translate(${tx} ${ty}) scale(${scale} ${-scale})"><path d="${d}" fill="${fill}"/></g>`;
const defs = `<defs>
  <linearGradient id="t" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#2864D9"/><stop offset=".55" stop-color="#1B4AA8"/><stop offset="1" stop-color="#0F2650"/></linearGradient>
  <linearGradient id="s" x1="14" y1="10" x2="50" y2="54"><stop stop-color="#FFFFFF"/><stop offset="1" stop-color="#BFE3FF"/></linearGradient>
  <linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#86C9FF"/><stop offset="1" stop-color="#38A5FF"/></linearGradient>
</defs>`;
const variants = {
  A: `<rect width="64" height="64" rx="16" fill="url(#t)"/>${glyph("url(#s)")}`,
  B: `<rect width="64" height="64" rx="16" fill="url(#t)"/>${glyph("url(#s)")}<path d="M14 55.5h36" stroke="#38A5FF" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>`,
  C: `<rect width="64" height="64" rx="16" fill="url(#t)"/>${glyph("url(#s)")}<path d="M40 7.5l5 5-5 5-5-5z" fill="#38A5FF"/><path d="M14 55.5h36" stroke="#38A5FF" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
  D: `<rect width="64" height="64" rx="16" fill="none" stroke="#FFFFFF22"/>${glyph("url(#c)")}`,
};
const keys = Object.keys(variants);
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 290" width="900" height="290">${defs}<rect width="900" height="290" fill="#0B1424"/>
${keys.map((k, i) => `<g transform="translate(${40 + i * 220} 40) scale(2.6)">${variants[k]}</g>
<text x="${40 + i * 220 + 83}" y="245" font-family="Inter" font-size="18" fill="#93A4BC" text-anchor="middle">${k}</text>`).join("")}
</svg>`;
const r = new Resvg(sheet, { fitTo: { mode: "width", value: 1200 } });
writeFileSync("/tmp/glyph3.png", r.render().asPng());
console.log(tx, ty);
