import * as fk from "fontkit";
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const fontkit = fk.default ?? fk;
const AR = "node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2";
const EN = "node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2";

function textPath(fontFile, text, size, tracking = 0) {
  const font = fontkit.openSync(fontFile);
  const run = font.layout(text);
  const s = size / font.unitsPerEm;
  let x = 0;
  const parts = [];
  for (let i = 0; i < run.glyphs.length; i++) {
    const g = run.glyphs[i];
    const p = run.positions[i];
    parts.push(`<path d="${g.path.toSVG()}" transform="translate(${(x + p.xOffset).toFixed(2)} ${p.yOffset})"/>`);
    x += p.xAdvance + tracking;
  }
  return {
    body: `<g transform="translate(0 ${(font.ascent * s).toFixed(2)}) scale(${s} ${-s})">${parts.join("")}</g>`,
    width: x * s,
  };
}

const ar = textPath(AR, "المهندس", 44);
const en = textPath(EN, "AL MOHANDES", 10.5, 4.2);
const mark = readFileSync("public/brand/icon.svg", "utf8")
  .replace(/<\/?svg[^>]*>/g, "")
  .replace(/<defs>[\s\S]*?<\/defs>/, "");

const W = 360, H = 108;
const lockup = (fg, sub) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#2E6FE6"/><stop offset=".55" stop-color="#1B4AA8"/><stop offset="1" stop-color="#0F2650"/></linearGradient>
    <linearGradient id="glyphFill" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#FFF"/><stop offset=".62" stop-color="#EAF4FF"/><stop offset="1" stop-color="#A9D4FF"/></linearGradient>
    <radialGradient id="sheen" cx="0.18" cy="-0.1" r="1.05"><stop stop-color="#FFF" stop-opacity=".3"/><stop offset=".7" stop-color="#FFF" stop-opacity="0"/></radialGradient>
  </defs>
  <g transform="translate(${W - 70} 26) scale(0.72)">${mark}</g>
  <g fill="${fg}" transform="translate(${W - 88 - ar.width} 16)">${ar.body}</g>
  <g fill="${sub}" transform="translate(${W - 88 - en.width} 74)">${en.body}</g>
</svg>`;

const dark = lockup("#EEF3FA", "#38A5FF");
const light = lockup("#17243A", "#2864D9");
writeFileSync("public/brand/wordmark-ar-dark.svg", dark);
writeFileSync("public/brand/wordmark-ar-light.svg", light);

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 230" width="380" height="230">
  <rect width="380" height="230" fill="#101B2D"/>
  ${dark.replace(/<\/?svg[^>]*>/g, "")}
  <rect y="118" width="380" height="112" fill="#F3F6FA"/>
  <g transform="translate(0 122)">${light.replace(/<\/?svg[^>]*>/g, "")}</g>
</svg>`;
writeFileSync("/tmp/wordmarks.png", new Resvg(sheet, { fitTo: { mode: "width", value: 920 } }).render().asPng());
console.log("wordmark widths", ar.width, en.width);
