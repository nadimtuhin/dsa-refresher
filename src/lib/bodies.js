// Page bodies as HTML strings. Pure: data in, markup out.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { startPages } from "../../start.js";
import { stories } from "../../stories.js";
import { hld } from "../../design-hld.js";

export const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// ponytail: tiny regex highlighter (keywords, strings, comments, numbers). Swap for Shiki if it ever matters.
export const hl = s =>
  esc(s).replace(/(\/\/[^\n]*)|(&quot;.*?&quot;|'[^'\n]*'|`[^`\n]*`)|\b(const|let|function|return|if|else|for|while|do|of|in|new|class|continue|break|export|import|from|true|false|null|undefined|typeof|get|try|catch|finally|throw|await|async)\b|\b(\d+)\b/g,
    (_m, c, s2, k, n) => (c ? `<span class="c">${c}</span>` : s2 ? `<span class="s">${s2}</span>` : k ? `<span class="k">${k}</span>` : `<span class="n">${n}</span>`));

// source shown on each page is the tested source between "// #region id" and "// #endregion"
const sources = {};
export const sourceOf = (partKey, id) => {
  const files = { c: ["concepts.js"], p: ["problems.js"], d: ["design.js", "design2.js"], l: ["logn.js"] }[partKey];
  let m;
  for (const file of files) {
    sources[file] ??= readFileSync(join(process.cwd(), file), "utf8");
    m ??= sources[file].match(new RegExp(`// #region ${id}\\n([\\s\\S]*?)// #endregion`));
  }
  if (!m) throw new Error(`no source for ${id} in ${files}`);
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
  ${sub("How does it work?")}<p>${esc(m.how)}</p>
  ${anim(pg.slug)}
  <table>${m.ops.map(([o, c]) => `<tr><td>${esc(o)}</td><td><code>${esc(c)}</code></td></tr>`).join("")}</table>
  ${sub("When should you use it?")}${list(m.when)}
  ${sub("Implementation (JavaScript, tested)")}${codeBlock(sourceOf(pg.part.key, pg.id))}
  ${sub("What are the common traps?")}${list(m.traps)}
  <div class="real"><b>In real systems:</b> ${esc(m.real)}</div>
  ${sub("Summary")}<div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

const problemBody = (pg, m) => `
  <div class="crumb">#${m.n} · <span class="d-${m.diff}">${m.diff}</span> · <a href="https://leetcode.com/problems/${lcSlug(m.title)}/" target="_blank" rel="noopener">LeetCode</a></div>
  <p>${esc(m.prompt)}</p>
  ${storyBlock(pg.slug)}
  <pre class="ex">${m.examples.map(esc).join("\n")}</pre>
  ${sub("What should you ask before coding?")}${list(m.clarify)}
  <p class="hint"><b>Hint:</b> ${esc(m.hint)}</p>
  ${sub("How do you solve it?")}<p>${esc(m.idea)}</p>${rows([["Time", m.time], ["Space", m.space]])}
  ${sub("Watch it run")}${anim(pg.slug)}
  ${sub("Solution (JavaScript, tested)")}${codeBlock(sourceOf("p", pg.id))}
  ${sub("What are the common traps?")}${list(m.traps)}
  ${sub("Summary")}<div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;

// design problems: the standard interview order, every section visible, with an on-page contents list
const flow = steps => `<ol class="flow">${steps.map(([box, note]) => `<li><b>${esc(box)}</b><span>${esc(note)}</span></li>`).join("")}</ol>`;
const SD_STEPS = [["req", "Requirements"], ["est", "Estimates"], ["api", "API"], ["data", "Data model"], ["hld", "High level design"], ["deep", "Deep dives"], ["fail", "Failures"], ["trade", "Trade-offs"], ["wrap", "Wrap up"]];
// numbered to match the 8 steps page; "Wrap up" is the closing line, not a step
const step = id => { const i = SD_STEPS.findIndex(s => s[0] === id); return `<h2 class="sub" id="${id}">${id === "wrap" ? "" : `${i + 1}. `}${SD_STEPS[i][1]}</h2>`; };
const designProblemBody = (pg, m) => {
  const h = hld[pg.id];
  return `
  <p class="what">${esc(m.prompt)}</p>
  ${storyBlock(pg.slug)}
  <nav class="toc" aria-label="On this page"><b>On this page</b><ol>${SD_STEPS.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join("")}</ol></nav>
  ${step("req")}
  <h3>Functional</h3>${list(h.fr)}
  <h3>Non functional</h3>${list(h.nfr)}
  <h3>Questions to ask</h3>${list(m.clarify)}
  ${step("est")}${rows(m.numbers)}
  ${step("api")}<pre class="plain">${esc(m.api)}</pre>
  ${step("data")}<pre class="plain">${esc(m.data)}</pre>
  ${step("hld")}<p>Follow one request at a time, top to bottom.</p>
  ${Object.entries(h.paths).map(([name, s]) => `<h3>${esc(name)}</h3>${flow(s)}`).join("")}
  ${step("deep")}
  ${m.deep.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}
  <h3>See the core idea run</h3>
  ${anim(pg.slug)}
  <h3>Core logic (JavaScript, tested)</h3>${codeBlock(sourceOf("d", pg.id))}
  ${step("fail")}${rows(m.failures)}
  ${step("trade")}${list(m.tradeoffs)}
  ${step("wrap")}
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>`;
};

// start pages come from start.js as HTML; their first h2 (or the h1 on the index) is the page title,
// and the h4 sub headings become h2 so headings stay in order
const asTitle = html => html.replace(/<h2>(.*?)<\/h2>/, '<h1 class="title">$1</h1>');
const asSub = html => html.replace(/<h4>(.*?)<\/h4>/g, (_m, t) => sub(t));

export const buildBodies = (pages, ctx) => {
  const first = k => pages.find(p => p.part.key === k).slug;
  const starts = startPages({ ...ctx, hl, hrefs: { c: first("c"), p: first("p"), d: first("d") } });
  const bodyOf = pg =>
    pg.part.key === "start" ? asSub(pg.slug === "index" ? starts[pg.id] : asTitle(starts[pg.id]))
    : pg.part.key === "c" ? conceptBody(pg, pg.meta)
    : pg.part.key === "p" ? problemBody(pg, pg.meta)
    : pg.meta.how ? conceptBody(pg, pg.meta) : designProblemBody(pg, pg.meta);
  for (const pg of pages) pg.body = bodyOf(pg).replace("<!--code:halvings-->", () => codeBlock(sourceOf("l", "halvings")));
};
