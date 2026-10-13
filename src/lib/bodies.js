// Page bodies as HTML strings. Pure: data in, markup out.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { startPages } from "../../start.js";
import { stories } from "../../stories.js";

export const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// ponytail: tiny regex highlighter (keywords, strings, comments, numbers). Swap for Shiki if it ever matters.
export const hl = s =>
  esc(s).replace(/(\/\/[^\n]*)|(&quot;.*?&quot;|'[^'\n]*'|`[^`\n]*`)|\b(const|let|function|return|if|else|for|while|do|of|in|new|class|continue|break|export|import|from|true|false|null|undefined|typeof|get|try|catch|finally|throw|await|async)\b|\b(\d+)\b/g,
    (_m, c, s2, k, n) => (c ? `<span class="c">${c}</span>` : s2 ? `<span class="s">${s2}</span>` : k ? `<span class="k">${k}</span>` : `<span class="n">${n}</span>`));

// source shown on each page is the tested source between "// #region id" and "// #endregion"
const sources = {};
export const sourceOf = (partKey, id) => {
  const file = { c: "concepts.js", p: "problems.js", d: "design.js", l: "logn.js" }[partKey];
  sources[file] ??= readFileSync(join(process.cwd(), file), "utf8");
  const m = sources[file].match(new RegExp(`// #region ${id}\\n([\\s\\S]*?)// #endregion`));
  if (!m) throw new Error(`no source for ${id} in ${file}`);
  return m[1].replace(/^export /gm, "").trimEnd();
};

const codeBlock = src => `<pre class="code"><button class="copy" type="button">Copy</button><code>${hl(src)}</code></pre>`;
const lcSlug = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/ +/g, "-");
export const list = xs => `<ul>${xs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
const rows = xs => `<table>${xs.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>`;
const anim = slug => `<div class="anim" data-anim="${slug}"></div>`;
const sub = text => `<h2 class="sub">${text}</h2>`;
// plain-word story + everyday examples, shown before the technical text
const storyBlock = slug => {
  const s = stories[slug];
  return `<div class="story">${sub("In plain words")}${s.story.map(x => `<p>${esc(x)}</p>`).join("")}${sub("Examples")}${list(s.examples)}</div>`;
};

const conceptBody = (pg, m) => `
  <p class="what">${esc(m.what)}</p>
  ${storyBlock(pg.slug)}
  ${sub("How it works")}<p>${esc(m.how)}</p>
  ${anim(pg.slug)}
  <table>${m.ops.map(([o, c]) => `<tr><td>${esc(o)}</td><td><code>${esc(c)}</code></td></tr>`).join("")}</table>
  ${sub("Reach for it when")}${list(m.when)}
  <details><summary>Implementation (JavaScript, tested)</summary>${codeBlock(sourceOf(pg.part.key, pg.id))}</details>
  ${sub("Traps")}${list(m.traps)}
  <div class="real"><b>In real systems:</b> ${esc(m.real)}</div>
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

const problemBody = (pg, m) => `
  <div class="crumb">#${m.n} · <span class="d-${m.diff}">${m.diff}</span> · <a href="https://leetcode.com/problems/${lcSlug(m.title)}/" target="_blank" rel="noopener">LeetCode</a></div>
  <p>${esc(m.prompt)}</p>
  ${storyBlock(pg.slug)}
  <pre class="ex">${m.examples.map(esc).join("\n")}</pre>
  ${sub("Ask before coding")}${list(m.clarify)}
  <details class="hint"><summary>Hint</summary><p>${esc(m.hint)}</p></details>
  <details><summary>Approach</summary><p>${esc(m.idea)}</p><p class="cx"><b>Time</b> ${m.time} &nbsp; <b>Space</b> ${m.space}</p></details>
  <details class="watch"><summary>Watch it run</summary>${anim(pg.slug)}</details>
  <details><summary>Solution (JavaScript, tested)</summary>${codeBlock(sourceOf("p", pg.id))}</details>
  ${sub("Traps")}${list(m.traps)}
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

// design problems: prompt first, the worked answer hidden step by step so you can try it yourself
const designProblemBody = (pg, m) => `
  <p class="what">${esc(m.prompt)}</p>
  ${storyBlock(pg.slug)}
  <div class="ask">${sub("Ask first")}${list(m.clarify)}</div>
  <details><summary>Numbers</summary>${rows(m.numbers)}</details>
  <details><summary>API</summary><pre class="plain">${esc(m.api)}</pre></details>
  <details><summary>Data</summary><pre class="plain">${esc(m.data)}</pre></details>
  ${m.deep.map(([q, a], i) => `<details><summary>${i === 0 ? "Deep dive: " : ""}${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
  ${sub("See the core idea run")}
  ${anim(pg.slug)}
  <details><summary>Core logic (JavaScript, tested)</summary>${codeBlock(sourceOf("d", pg.id))}</details>
  <details><summary>Failures</summary>${rows(m.failures)}</details>
  <details><summary>Trade-offs</summary>${list(m.tradeoffs)}</details>
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

// start pages come from start.js as HTML; their first h2 (or the h1 on the index) is the page title,
// and the h4 sub headings become h2 so headings stay in order
const asTitle = html => html.replace(/<h2>(.*?)<\/h2>/, '<h1 class="title">$1</h1>');
const asSub = html => html.replace(/<h4>(.*?)<\/h4>/g, (_m, t) => sub(t));

export const buildBodies = (pages, ctx) => {
  const starts = startPages({ ...ctx, hl });
  const bodyOf = pg =>
    pg.part.key === "start" ? asSub(pg.slug === "index" ? starts[pg.id] : asTitle(starts[pg.id]))
    : pg.part.key === "c" ? conceptBody(pg, pg.meta)
    : pg.part.key === "p" ? problemBody(pg, pg.meta)
    : pg.meta.how ? conceptBody(pg, pg.meta) : designProblemBody(pg, pg.meta);
  for (const pg of pages) pg.body = bodyOf(pg).replace("<!--code:halvings-->", () => codeBlock(sourceOf("l", "halvings")));
};
