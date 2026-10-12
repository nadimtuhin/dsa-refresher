// node build.js -> runs every test, checks every animation, writes one static page per topic into public/
// Each page carries only its own animation frames; site.css, player.js and app.js are shared and cached once.
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import * as C from "./concepts.js";
import * as P from "./problems.js";
import * as D from "./design.js";
import { anims } from "./anims.js";
import { designAnims } from "./design-anims.js";
import { startPages } from "./start.js";

const SITE = "https://dsa-refresher-pi.vercel.app";
const here = f => new URL(f, import.meta.url);

// 1. run all tests; refuse to build if any fail
let pass = 0, fail = 0;
for (const [label, tests] of [["concept", C.tests], ["problem", P.tests], ["design", D.tests]])
  for (const [id, t] of Object.entries(tests))
    for (const [got, want] of await t()) {
      if (JSON.stringify(got) === JSON.stringify(want)) pass++;
      else { fail++; console.error(`FAIL ${label} ${id}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
    }

// 2. record every animation; it must end on the tested solution's answer
const frames = {};
const allAnims = { ...anims, ...Object.fromEntries(Object.entries(designAnims).map(([k, v]) => ["d-" + k, v])) };
for (const [id, trace] of Object.entries(allAnims)) {
  const fr = [];
  const [mine, real] = trace((note, ...views) => fr.push({ note, views: JSON.parse(JSON.stringify(views)) }));
  if (JSON.stringify(mine) !== JSON.stringify(real)) { fail++; console.error(`ANIM ${id}: animation ended at ${JSON.stringify(mine)}, solution gives ${JSON.stringify(real)}`); }
  if (fr.length < 2) { fail++; console.error(`ANIM ${id}: only ${fr.length} frame(s)`); }
  frames[id] = fr;
}

// 3. the book: Start pages, then Part 1 (c-), Part 2 (p-), Part 3 (d-). Ids are prefixed: parts share names.
const parts = [
  { key: "start", title: "Start", chapters: [{ title: "", ids: ["start", "pick", "bigo", "compare", "method", "sdmethod", "js"] }] },
  { key: "c", title: "Part 1 · Concepts", src: C, chapters: C.chapters },
  { key: "p", title: "Part 2 · Problems", src: P, chapters: P.chapters },
  { key: "d", title: "Part 3 · System design", src: D, chapters: D.chapters }
];
const startTitles = { start: "How to use this", pick: "Pick a structure", bigo: "Complexity classes", compare: "Array vs list vs map", method: "Coding: the 6 step method", sdmethod: "System design: the 8 steps", js: "JavaScript cheat sheet" };
const pages = []; // in reading order
for (const part of parts)
  for (const ch of part.chapters)
    for (const id of ch.ids) {
      if (part.key === "start") { pages.push({ part, ch, id, slug: id === "start" ? "index" : id, title: startTitles[id], tracked: false }); continue; }
      const m = part.src.meta[id];
      if (!m || !part.src.tests[id]) throw new Error(`missing meta or tests: ${part.key}-${id}`);
      pages.push({ part, ch, id, slug: `${part.key}-${id}`, title: m.title, meta: m, tracked: true });
    }
for (const pg of pages) if (pg.tracked && !frames[pg.slug]) { fail++; console.error(`ANIM ${pg.slug}: missing`); }
const nFrames = Object.values(frames).reduce((s, f) => s + f.length, 0);
console.log(`tests: ${pass} passed, ${fail} failed · animations: ${Object.keys(frames).length} checked, ${nFrames} frames`);
if (fail) process.exit(1);

// 4. source shown on each page is the tested source between "// #region id" and "// #endregion"
const regions = file => {
  const src = readFileSync(here(file), "utf8");
  return id => {
    const m = src.match(new RegExp(`// #region ${id}\\n([\\s\\S]*?)// #endregion`));
    if (!m) throw new Error(`no source for ${id} in ${file}`);
    return m[1].replace(/^export /gm, "").trimEnd();
  };
};
const code = { c: regions("./concepts.js"), p: regions("./problems.js"), d: regions("./design.js") };

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// ponytail: tiny regex highlighter (keywords, strings, comments, numbers). Swap for Shiki if it ever matters.
const hl = s =>
  esc(s).replace(/(\/\/[^\n]*)|(&quot;.*?&quot;|'[^'\n]*'|`[^`\n]*`)|\b(const|let|function|return|if|else|for|while|do|of|in|new|class|continue|break|export|import|from|true|false|null|undefined|typeof|get|try|catch|finally|throw|await|async)\b|\b(\d+)\b/g,
    (_m, c, s2, k, n) => (c ? `<span class="c">${c}</span>` : s2 ? `<span class="s">${s2}</span>` : k ? `<span class="k">${k}</span>` : `<span class="n">${n}</span>`));
const codeBlock = src => `<pre class="code"><button class="copy" type="button">Copy</button><code>${hl(src)}</code></pre>`;
const lcSlug = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/ +/g, "-");
const list = xs => `<ul>${xs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
const rows = xs => `<table>${xs.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>`;
const anim = slug => `<div class="anim" data-anim="${slug}"></div>`;

// ---- page bodies ----
const conceptBody = (pg, m) => `
  <p class="what">${esc(m.what)}</p>
  <h4>How it works</h4><p>${esc(m.how)}</p>
  ${anim(pg.slug)}
  <table>${m.ops.map(([o, c]) => `<tr><td>${esc(o)}</td><td><code>${esc(c)}</code></td></tr>`).join("")}</table>
  <h4>Reach for it when</h4>${list(m.when)}
  <details><summary>Implementation (JavaScript, tested)</summary>${codeBlock(code[pg.part.key](pg.id))}</details>
  <h4>Traps</h4>${list(m.traps)}
  <div class="real"><b>In real systems:</b> ${esc(m.real)}</div>
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

const problemBody = (pg, m) => `
  <div class="crumb">#${m.n} · <span class="d-${m.diff}">${m.diff}</span> · <a href="https://leetcode.com/problems/${lcSlug(m.title)}/" target="_blank" rel="noopener">LeetCode</a></div>
  <p>${esc(m.prompt)}</p>
  <pre class="ex">${m.examples.map(esc).join("\n")}</pre>
  <h4>Ask before coding</h4>${list(m.clarify)}
  <details class="hint"><summary>Hint</summary><p>${esc(m.hint)}</p></details>
  <details><summary>Approach</summary><p>${esc(m.idea)}</p><p class="cx"><b>Time</b> ${m.time} &nbsp; <b>Space</b> ${m.space}</p></details>
  <details class="watch"><summary>Watch it run</summary>${anim(pg.slug)}</details>
  <details><summary>Solution (JavaScript, tested)</summary>${codeBlock(code.p(pg.id))}</details>
  <h4>Traps</h4>${list(m.traps)}
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

// design problems: prompt first, the worked answer hidden step by step so you can try it yourself
const designProblemBody = (pg, m) => `
  <p class="what">${esc(m.prompt)}</p>
  <div class="ask"><h4>1. Ask first</h4>${list(m.clarify)}</div>
  <details><summary>2. Numbers</summary>${rows(m.numbers)}</details>
  <details><summary>3. API</summary><pre class="plain">${esc(m.api)}</pre></details>
  <details><summary>4. Data</summary><pre class="plain">${esc(m.data)}</pre></details>
  ${m.deep.map(([q, a], i) => `<details><summary>${i === 0 ? "6. Deep dive: " : ""}${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  <h4>See the core idea run</h4>
  ${anim(pg.slug)}
  <details><summary>Core logic (JavaScript, tested)</summary>${codeBlock(code.d(pg.id))}</details>
  <details><summary>7. Failures</summary>${rows(m.failures)}</details>
  <details><summary>8. Trade-offs</summary>${list(m.tradeoffs)}</details>
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

const ctx = { nCon: C.chapters.reduce((a, c) => a + c.ids.length, 0), nPro: P.chapters.reduce((a, c) => a + c.ids.length, 0), nDes: D.chapters.reduce((a, c) => a + c.ids.length, 0), pass, hl };
const starts = startPages(ctx);
const bodyOf = pg =>
  pg.part.key === "start" ? starts[pg.id]
  : pg.part.key === "c" ? conceptBody(pg, pg.meta)
  : pg.part.key === "p" ? problemBody(pg, pg.meta)
  : pg.meta.how ? conceptBody(pg, pg.meta) : designProblemBody(pg, pg.meta);

// ---- shared chrome ----
const href = pg => (pg.slug === "index" ? "./" : pg.slug); // clean URLs (vercel cleanUrls); preview with: npx serve public
const nTracked = pages.filter(p => p.tracked).length;
const navHtml = cur => parts.map(part => `<div class="part">${esc(part.title)}</div>` +
  part.chapters.map(ch => (ch.title ? `<div class="grp">${esc(ch.title)}</div>` : "") +
    ch.ids.map(id => {
      const pg = pages.find(p => p.part === part && p.id === id), on = pg === cur ? ' class="on" aria-current="page"' : "";
      const box = pg.tracked ? `<input type="checkbox" class="done" data-id="${pg.slug}" aria-label="Mark ${esc(pg.title)} done">` : "";
      const diff = part.key === "p" ? `<em class="d-${pg.meta.diff}">${pg.meta.diff[0]}</em>` : "";
      return `<a href="${href(pg)}" data-id="${pg.slug}"${on}>${box}<span>${esc(pg.title)}</span>${diff}</a>`;
    }).join("")).join("")).join("");

const page = (pg, i) => {
  const prev = pages[i - 1], next = pages[i + 1];
  const where = [pg.part.key === "start" ? "" : pg.part.title, pg.ch.title].filter(Boolean).join(" · ");
  const desc = pg.meta?.what ?? pg.meta?.prompt ?? "Data structures, algorithms and system design refresher. Tested JavaScript, animated step by step.";
  const fr = frames[pg.slug];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#ffffff">
<title>${esc(pg.slug === "index" ? "DSA and system design refresher: tested JavaScript, animated" : `${pg.title} · DSA refresher`)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/${pg.slug === "index" ? "" : pg.slug}">
${prev ? `<link rel="prev" href="${href(prev)}">` : ""}${next ? `<link rel="next" href="${href(next)}">` : ""}
<link rel="stylesheet" href="site.css">
</head><body>
<header class="topbar"><button type="button" id="menu" aria-controls="nav" aria-expanded="false">Menu</button><span class="tt">${esc(pg.title)}</span><span class="tp" title="topics done"><span id="cnt2">0</span>/${nTracked} done</span></header>
<div class="scrim" id="scrim"></div>
<aside aria-label="Contents" id="nav">
  <button type="button" class="close" id="navclose" aria-label="Close menu">✕</button>
  <div class="brand"><a href="./" style="text-decoration:none">DSA refresher</a></div>
  <div class="prog"><span id="cnt">0</span> / ${nTracked} done</div>
  <div class="bar"><i id="bar"></i></div>
  <input class="q" id="q" type="search" placeholder="Filter" aria-label="Filter topics">
  ${navHtml(pg)}
</aside>
<main>
<article class="page" id="${pg.slug}">
  ${where ? `<div class="crumb">${esc(where)}</div>` : ""}
  ${pg.part.key === "start" ? "" : `<h2>${esc(pg.title)}</h2>`}
  ${bodyOf(pg)}
  ${pg.tracked ? `<label class="donebox"><input type="checkbox" class="done" data-id="${pg.slug}"> I can explain this without looking</label>` : ""}
  <nav class="pager" aria-label="Previous and next">
    ${prev ? `<a class="pv" href="${href(prev)}" rel="prev"><small>← Previous</small><span>${esc(prev.title)}</span></a>` : ""}
    ${next ? `<a class="nx" href="${href(next)}" rel="next"><small>Next →</small><span>${esc(next.title)}</span></a>` : ""}
  </nav>
</article>
${i === 0 ? `<footer>Built by <a href="https://github.com/nadimtuhin">Nadim Tuhin</a> · source and tests: <a href="https://github.com/nadimtuhin/dsa-refresher">github.com/nadimtuhin/dsa-refresher</a></footer>` : ""}
</main>
${fr ? `<script>window.FRAMES = ${JSON.stringify({ [pg.slug]: fr }).replace(/</g, "\\u003c")};</script>\n<script src="player.js" defer></script>` : ""}
<script src="app.js" defer></script>
</body></html>`;
};

// 5. write: one file per page, plus shared assets (cached by the browser across pages)
const out = here("./public/");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let biggest = 0, bytes = 0;
pages.forEach((pg, i) => {
  const html = page(pg, i);
  writeFileSync(new URL(`${pg.slug}.html`, out), html);
  bytes += html.length;
  biggest = Math.max(biggest, html.length);
});
copyFileSync(here("./site.css"), new URL("site.css", out));
for (const f of ["player.js", "app.js"]) copyFileSync(here(`./${f}`), new URL(f, out));
writeFileSync(new URL("sitemap.xml", out), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p => `<url><loc>${SITE}/${p.slug === "index" ? "" : p.slug}</loc></url>`).join("")}</urlset>\n`);
console.log(`wrote ${pages.length} pages (${ctx.nCon} concepts, ${ctx.nPro} problems, ${ctx.nDes} system design, ${pages.length - nTracked} start) · biggest ${Math.round(biggest / 1024)} KB · total ${Math.round(bytes / 1024)} KB`);
