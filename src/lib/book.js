// Everything the Astro pages need, computed once per build. Refuses to build if a test or animation fails.
import { runChecks, summary } from "../../check.js";
import { parts, pages } from "./pages.js";
import { buildBodies } from "./bodies.js";
import { seoTitle, metaDescription } from "./seo.js";

const checks = await runChecks();
if (checks.errors.length) {
  checks.errors.forEach(e => console.error(e));
  throw new Error("tests or animations failed; not building");
}
console.log(summary(checks));

export const BUILD_DATE = new Date().toISOString().slice(0, 10);
export { parts, pages };
export const frames = checks.frames;
export const nTracked = pages.filter(p => p.tracked).length;
export const firstOfPart = Object.fromEntries(parts.map(p => [p.key, pages.find(pg => pg.part === p)]));

const count = key => parts.find(p => p.key === key).chapters.reduce((a, c) => a + c.ids.length, 0);
buildBodies(pages, { nCon: count("c"), nPro: count("p"), nDes: count("d"), pass: checks.pass });

pages.forEach((pg, i) => {
  pg.seoTitle = seoTitle(pg);
  pg.description = metaDescription(pg);
  pg.prev = pages[i - 1];
  pg.next = pages[i + 1];
});

// clean URLs (vercel cleanUrls)
export const hrefOf = pg => (pg.slug === "index" ? "./" : pg.slug);
