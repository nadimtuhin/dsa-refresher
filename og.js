// Share images: one 1200x630 PNG per page in public/og/. Run `npm run og` after changing a title.
// ponytail: rendered locally and committed, because Vercel's build box has no fonts for SVG text.
// sharp comes with astro; if astro ever drops it, add sharp as a devDependency.
import sharp from "sharp";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
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

// left: text column; right: the AI picture (og-art/<slug>.jpg) when present
const ART = 630, TEXT_W = W - ART;
const svg = (pg, hasArt) => {
  const right = hasArt ? TEXT_W : W;
  const kicker = pg.part.key === "start" ? "DSA REFRESHER" : pg.part.title.replace(/^Part \d · /, "").toUpperCase();
  const titleSize = pg.title.length > 22 ? 50 : 62;
  const title = wrap(pg.title, Math.floor((right - PAD - 40) / (titleSize * 0.6)), 3);
  const sub = wrap(pg.ogSub, Math.floor((right - PAD - 40) / (26 * 0.6)), 4);
  const tY = 190, sY = tY + (title.length - 1) * titleSize * 1.12 + 62;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect width="14" height="100%" fill="#d71921"/>
  ${hasArt ? `<line x1="${TEXT_W}" y1="0" x2="${TEXT_W}" y2="${H}" stroke="#e5e5e0" stroke-width="2"/>` : ""}
  <g font-family="Menlo, DejaVu Sans Mono, monospace" fill="#0a0a0a">
    <text x="${PAD}" y="110" font-size="22" letter-spacing="3" fill="#d71921" font-weight="700">${esc(kicker)}</text>
    ${title.map((l, i) => `<text x="${PAD}" y="${tY + i * titleSize * 1.12}" font-size="${titleSize}" font-weight="700">${esc(l)}</text>`).join("")}
    ${sub.map((l, i) => `<text x="${PAD}" y="${sY + i * 36}" font-size="26" fill="#333">${esc(l)}</text>`).join("")}
    <text x="${PAD}" y="${H - 56}" font-size="24" font-weight="700">prep.nadimtuhin.com</text>
  </g>
</svg>`;
};

// favicons from public/favicon.svg
const icon = readFileSync("public/favicon.svg");
for (const [name, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512], ["favicon-32.png", 32]])
  await sharp(icon, { density: 600 }).resize(size, size).png().toFile(`public/${name}`);
// favicon.ico: 16 and 32 px PNGs inside an ICO wrapper
// 16px gets a simpler mark: three bold dots, lines vanish at that size
const small = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#d71921"/><path d="M8 4 4.5 11M8 4l3.5 7" stroke="#fff" stroke-width="2"/><circle cx="8" cy="4" r="2.4" fill="#fff"/><circle cx="4.3" cy="11.6" r="2.4" fill="#fff"/><circle cx="11.7" cy="11.6" r="2.4" fill="#fff"/></svg>');
const imgs = [await sharp(small, { density: 1200 }).resize(16, 16).png().toBuffer(), await sharp(icon, { density: 600 }).resize(32, 32).png().toBuffer()];
const dir = Buffer.alloc(6 + 16 * imgs.length);
dir.writeUInt16LE(1, 2); dir.writeUInt16LE(imgs.length, 4);
let off = dir.length;
imgs.forEach((png, i) => {
  const s = [16, 32][i], o = 6 + 16 * i;
  dir.writeUInt8(s, o); dir.writeUInt8(s, o + 1); dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
  dir.writeUInt32LE(png.length, o + 8); dir.writeUInt32LE(off, o + 12); off += png.length;
});
writeFileSync("public/favicon.ico", Buffer.concat([dir, ...imgs]));

mkdirSync("public/og", { recursive: true });
for (const pg of pages) {
  pg.ogSub = ogSubtitle(pg);
  const art = `og-art/${pg.slug}.jpg`, hasArt = existsSync(art);
  const card = sharp(Buffer.from(svg(pg, hasArt)));
  if (hasArt) card.composite([{ input: art, left: TEXT_W, top: 0 }]);
  await card.flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true }).toFile(`public/og/${pg.slug}.jpg`);
}
console.log(`og: ${pages.length} images in public/og/`);
