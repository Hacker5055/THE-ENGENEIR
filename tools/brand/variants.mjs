import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";

const tile = (inner, bg = `<rect width="64" height="64" rx="16" fill="url(#t)"/>`) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="64" y2="64"><stop stop-color="#2864D9"/><stop offset=".55" stop-color="#1B4AA8"/><stop offset="1" stop-color="#0F2650"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#D8ECFF"/><stop offset=".5" stop-color="#5EB6FF"/><stop offset="1" stop-color="#38A5FF"/></linearGradient>
  </defs>
  ${bg}
  ${inner}
</svg>`;

const A = tile(`
  <path d="M17.5 9 24 4l6.5 5" fill="none" stroke="#38A5FF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="24" cy="24" r="10.5" fill="none" stroke="url(#s)" stroke-width="3.4"/>
  <path d="M31.5 32.5 34 43" fill="none" stroke="#EEF3FA" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="24" cy="24" r="3.2" fill="#38A5FF" opacity=".9"/>
`);

const B = tile(`
  <path d="M17.5 9 24 4l6.5 5" fill="none" stroke="#38A5FF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 38V24a11 11 0 0 1 22 0v14" fill="none" stroke="url(#s)" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M35 24v14" stroke="#EEF3FA" stroke-width="3.4" stroke-linecap="round"/>
`);

const C = tile(`
  <path d="M11 41V27a13 13 0 0 1 26 0v14" fill="none" stroke="#EEF3FA" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M19 41V30a5 5 0 0 1 10 0v11" fill="none" stroke="url(#s)" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M24 7l6 5-6 5-6-5z" fill="#38A5FF"/>
`);

// comparison sheet
const variants = [["A", A], ["B", B], ["C", C]];
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" width="720" height="280">
  <rect width="720" height="280" fill="#0B1424"/>
  ${variants.map(([k, svg], i) => `
    <g transform="translate(${30 + i * 230} 40) scale(2.6)"><g>${svg.replace(/<\/?svg[^>]*>/g, "")}</g></g>
    <text x="${30 + i * 230 + 42}" y="235" font-family="Inter, sans-serif" font-size="18" fill="#93A4BC" text-anchor="middle">${k}</text>
  `).join("")}
</svg>`;
const r = new Resvg(sheet, { fitTo: { mode: "width", value: 1080 }, font: { loadSystemFonts: true } });
writeFileSync("/tmp/variants.png", r.render().asPng());
console.log("ok");
