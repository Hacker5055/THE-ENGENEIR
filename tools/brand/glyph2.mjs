import * as fk from "fontkit";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
const fontkit = fk.default ?? fk;
const font = fontkit.openSync("node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2");
const g = font.layout("م").glyphs[0];
const d = g.path.toSVG();
const bb = g.bbox;
// map font units into a 64x64 box, padding 10, baseline around y=44
const scale = 0.052;
const w = (bb.maxX - bb.minX) * scale, h = (bb.maxY - bb.minY) * scale;
const tx = (64 - w) / 2 - bb.minX * scale;
const ty = 46 + bb.maxY * scale;
const inner = `<g transform="translate(${tx} ${ty}) scale(${scale} ${-scale})"><path d="${d}" fill="#EEF3FA"/></g>`;
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
<defs><linearGradient id="t" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#2864D9"/><stop offset=".55" stop-color="#1B4AA8"/><stop offset="1" stop-color="#0F2650"/></linearGradient></defs>
<rect width="64" height="64" rx="16" fill="url(#t)"/>
${inner}
<path d="M14 52h36" stroke="#38A5FF" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
</svg>`;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 300" width="520" height="300"><rect width="520" height="300" fill="#0B1424"/>
<g transform="translate(20 40) scale(2.4)">${tile.replace(/<\/?svg[^>]*>/g,"")}</g>
<g transform="translate(220 40)"><g transform="translate(0 0)">${`<g transform="translate(${tx} ${ty}) scale(${scale} ${-scale})"><path d="${d}" fill="#fff"/></g>`}</g></g>
</svg>`;
const r = new Resvg(sheet, { fitTo: { mode: "width", value: 1040 } });
writeFileSync("/tmp/glyph.png", r.render().asPng());
console.log({tx,ty,scale,w,h});
