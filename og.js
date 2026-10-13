// Share images: one 1200x630 PNG per page in public/og/. Run `npm run og` after changing a title.
// ponytail: rendered locally and committed, because Vercel's build box has no fonts for SVG text.
// sharp comes with astro; if astro ever drops it, add sharp as a devDependency.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { pages } from "./src/lib/pages.js";
import { ogSubtitle } from "./src/lib/seo.js";

const W = 1200, H = 630, PAD = 72;
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// monospace, so wrapping by character count is exact enough
const wrap = (text, perLine, maxLines) => {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > perLine) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    // prefer cutting at the last comma or full stop in the kept text, else at a word
    const kept = lines.join(" ");
    const cut = Math.max(kept.lastIndexOf(", "), kept.lastIndexOf(". "));
    if (cut > kept.length * 0.5) return wrap(kept.slice(0, cut) + ".", perLine, maxLines);
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "...";
  }
  return lines;
};

const svg = pg => {
  const kicker = pg.part.key === "start" ? "DSA REFRESHER" : `DSA REFRESHER · ${pg.part.title.toUpperCase()}`;
  const titleSize = pg.title.length > 28 ? 64 : 80;
  const title = wrap(pg.title, Math.floor((W - 2 * PAD) / (titleSize * 0.6)), 2);
  const sub = wrap(pg.ogSub, 46, 3);
  const tY = 230, sY = tY + title.length * titleSize * 1.1 + 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect width="100%" height="14" fill="#d71921"/>
  <g font-family="Menlo, DejaVu Sans Mono, monospace" fill="#0a0a0a">
    <text x="${PAD}" y="120" font-size="26" letter-spacing="3" fill="#d71921" font-weight="700">${esc(kicker)}</text>
    ${title.map((l, i) => `<text x="${PAD}" y="${tY + i * titleSize * 1.1}" font-size="${titleSize}" font-weight="700">${esc(l)}</text>`).join("")}
    ${sub.map((l, i) => `<text x="${PAD}" y="${sY + i * 44}" font-size="32" fill="#333">${esc(l)}</text>`).join("")}
    <line x1="${PAD}" y1="${H - 100}" x2="${W - PAD}" y2="${H - 100}" stroke="#e5e5e0" stroke-width="2"/>
    <text x="${PAD}" y="${H - 52}" font-size="26" fill="#0a0a0a" font-weight="700">prep.nadimtuhin.com</text>
    <text x="${W - PAD - 8}" y="${H - 52}" font-size="24" fill="#444" text-anchor="end">tested JavaScript · animated</text>
  </g>
</svg>`;
};

mkdirSync("public/og", { recursive: true });
for (const pg of pages) {
  pg.ogSub = ogSubtitle(pg);
  await sharp(Buffer.from(svg(pg))).png({ compressionLevel: 9, palette: true }).toFile(`public/og/${pg.slug}.png`);
}
console.log(`og: ${pages.length} images in public/og/`);
