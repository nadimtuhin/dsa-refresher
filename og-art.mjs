// Generate the share-card art: one picture per page via 9Router image generation.
// Run once: `node og-art.mjs` (skips pages that already have art; pass --force to redo).
// Output: og-art/<slug>.jpg (committed). og.js then puts the title and site name next to it.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { pages } from "./src/lib/pages.js";
import { scenes } from "./og-scenes.js";

const URL = process.env.NINEROUTER_URL ?? "http://localhost:20128";
const KEY = process.env.NINEROUTER_KEY ?? "sk_9router";
const MODEL = process.env.OG_MODEL ?? "cx/gpt-image-2";
const STYLE = "Flat minimal vector illustration, white background, limited palette: black #0a0a0a, red #d71921 as the single accent, light grey. Clean geometric shapes, generous whitespace, no gradients. Keep every element inside the central square of the image, with wide empty white margins on the left and right, nothing touching the edges. Absolutely no text, letters, numbers or logos anywhere.";
const force = process.argv.includes("--force");
const only = process.argv.find(a => a.startsWith("--only="))?.slice(7).split(",");

mkdirSync("og-art", { recursive: true });
const todo = pages.filter(pg => (only ? only.includes(pg.slug) : force || !existsSync(`og-art/${pg.slug}.jpg`)));
if (todo.some(pg => !scenes[pg.slug])) throw new Error("no scene for: " + todo.filter(pg => !scenes[pg.slug]).map(p => p.slug));

// fit the whole picture into a 630 square on white, 35 px margin: no cropping (art is on white anyway)
export const fitSquare = async input => {
  const inner = await sharp(input).flatten({ background: "#ffffff" }).trim({ background: "#ffffff", threshold: 20 }).resize(560, 560, { fit: "contain", background: "#ffffff" }).toBuffer();
  return sharp(inner).extend({ top: 35, bottom: 35, left: 35, right: 35, background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
};

const one = async pg => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(`${URL}/v1/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt: `${STYLE} Scene: ${scenes[pg.slug]}.`, size: "1024x1024", response_format: "b64_json" }),
        signal: AbortSignal.timeout(300_000)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      const b64 = (await r.json()).data?.[0]?.b64_json;
      if (!b64) throw new Error("no image in response");
      const jpg = await fitSquare(Buffer.from(b64, "base64"));
      writeFileSync(`og-art/${pg.slug}.jpg`, jpg);
      console.log("ok", pg.slug);
      return;
    } catch (e) {
      console.log(`retry ${attempt} ${pg.slug}: ${e.message}`);
    }
  }
  console.log("FAILED", pg.slug);
};

// small pool: the gateway takes about 30 s per image
const queue = [...todo];
await Promise.all(Array.from({ length: 4 }, async () => { while (queue.length) await one(queue.shift()); }));
console.log(`done: ${todo.length} requested`);
