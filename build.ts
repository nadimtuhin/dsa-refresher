// bun run build.ts  -> runs every test, then writes public/index.html (single file, works offline)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import * as C from "./concepts.ts";
import * as P from "./problems.ts";

// 1. run all tests; refuse to build if any fail
let pass = 0, fail = 0;
for (const [label, tests] of [["concept", C.tests], ["problem", P.tests]] as const) {
  for (const [id, t] of Object.entries(tests)) for (const [got, want] of t()) {
    if (JSON.stringify(got) === JSON.stringify(want)) pass++;
    else { fail++; console.error(`FAIL ${label} ${id}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  }
}
console.log(`tests: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);

// 2. source of each solution sits between "// #region id" and "// #endregion"
const regions = (file: string) => {
  const src = readFileSync(new URL(file, import.meta.url), "utf8");
  return (id: string) => {
    const m = src.match(new RegExp(`// #region ${id}\\n([\\s\\S]*?)// #endregion`));
    if (!m) throw new Error(`no source for ${id} in ${file}`);
    return m[1].replace(/^export /gm, "").trimEnd();
  };
};
const cCode = regions("./concepts.ts"), pCode = regions("./problems.ts");
for (const ch of C.chapters) for (const id of ch.ids) if (!C.meta[id] || !C.tests[id]) throw new Error(`concept missing: ${id}`);
for (const ch of P.chapters) for (const id of ch.ids) if (!P.meta[id] || !P.tests[id]) throw new Error(`problem missing: ${id}`);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// ponytail: tiny regex highlighter (keywords, strings, comments, numbers). Swap for Shiki if it ever matters.
const hl = (s: string) =>
  esc(s).replace(/(\/\/[^\n]*)|("[^"\n]*"|'[^'\n]*'|`[^`\n]*`)|\b(const|let|function|return|if|else|for|while|of|in|new|class|private|continue|break|export|true|false|null|undefined|void|typeof|type|get)\b|\b(\d+)\b/g,
    (_m, c, s2, k, n) => c ? `<span class="c">${c}</span>` : s2 ? `<span class="s">${s2}</span>` : k ? `<span class="k">${k}</span>` : `<span class="n">${n}</span>`);
const codeBlock = (src: string) => `<pre class="code"><button class="copy" type="button">Copy</button><code>${hl(src)}</code></pre>`;
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/ +/g, "-");

// ids are prefixed (c- / p-) because both parts have e.g. "binary-search"
const conceptPage = (id: string) => {
  const m = C.meta[id];
  return `<article id="c-${id}" class="page">
  <h2>${esc(m.title)}</h2>
  <p class="what">${esc(m.what)}</p>
  <h4>How it works</h4><p>${esc(m.how)}</p>
  <table>${m.ops.map(([o, c]) => `<tr><td>${esc(o)}</td><td><code>${esc(c)}</code></td></tr>`).join("")}</table>
  <h4>Reach for it when</h4><ul>${m.when.map(w => `<li>${esc(w)}</li>`).join("")}</ul>
  <details><summary>Implementation (TypeScript, tested)</summary>${codeBlock(cCode(id))}</details>
  <h4>Traps</h4><ul>${m.traps.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
  <div class="real"><b>In real systems:</b> ${esc(m.real)}</div>
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>
</article>`;
};
const problemPage = (id: string) => {
  const m = P.meta[id];
  return `<article id="p-${id}" class="page">
  <div class="crumb">#${m.n} · <span class="d-${m.diff}">${m.diff}</span> · <a href="https://leetcode.com/problems/${slug(m.title)}/" target="_blank" rel="noopener">LeetCode</a></div>
  <h2>${esc(m.title)}</h2>
  <p>${esc(m.prompt)}</p>
  <pre class="ex">${m.examples.map(esc).join("\n")}</pre>
  <h4>Ask before coding</h4><ul>${m.clarify.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
  <details class="hint"><summary>Hint</summary><p>${esc(m.hint)}</p></details>
  <details><summary>Approach</summary><p>${esc(m.idea)}</p><p class="cx"><b>Time</b> ${m.time} &nbsp; <b>Space</b> ${m.space}</p></details>
  <details><summary>Solution (TypeScript, tested)</summary>${codeBlock(pCode(id))}</details>
  <h4>Traps</h4><ul>${m.traps.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
  <div class="say"><b>Say out loud:</b> ${esc(m.say)}</div>
</article>`;
};

const nCon = C.chapters.reduce((a, c) => a + c.ids.length, 0);
const nPro = P.chapters.reduce((a, c) => a + c.ids.length, 0);
const total = nCon + nPro;
const link = (id: string, title: string, extra = "") =>
  `<a href="#${id}" data-id="${id}"><input type="checkbox" class="done" data-id="${id}" aria-label="Mark ${esc(title)} done"><span>${esc(title)}</span>${extra}</a>`;
const plain = (id: string, title: string) => `<a href="#${id}" data-id="${id}"><span>${title}</span></a>`;

const nav = `
  <div class="part">Start</div>
  ${plain("start", "How to use this")}${plain("pick", "Pick a structure")}${plain("bigo", "Complexity classes")}${plain("compare", "Array vs list vs map")}${plain("method", "The 6 step method")}${plain("ts", "TypeScript cheat sheet")}
  <div class="part">Part 1 · Concepts</div>
  ${C.chapters.map(c => `<div class="grp">${esc(c.title)}</div>${c.ids.map(id => link("c-" + id, C.meta[id].title)).join("")}`).join("")}
  <div class="part">Part 2 · Problems</div>
  ${P.chapters.map(c => `<div class="grp">${esc(c.title)}</div>${c.ids.map(id => link("p-" + id, P.meta[id].title, `<em class="d-${P.meta[id].diff}">${P.meta[id].diff[0]}</em>`)).join("")}`).join("")}
  <div class="part">End</div>
  ${plain("plan", "A 5 day plan")}`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>DSA refresher: ${nCon} concepts, ${nPro} problems, tested TypeScript</title>
<meta name="description" content="A compact data structures and algorithms refresher for coding interviews. Every implementation and solution is TypeScript and tested before the page builds.">
<style>
:root{--ink:#0a0a0a;--body:#242424;--meta:#5c5c5c;--rule:#e2e2e2;--soft:#f6f6f4;--side:#fafaf8;--accent:#d71921;--ok:#1a7f37;--med:#9a6700;
--sans:-apple-system,BlinkMacSystemFont,"Inter","Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:16px/1.65 var(--sans);color:var(--body);background:#fff;display:grid;grid-template-columns:300px 1fr;min-height:100vh}
aside{position:sticky;top:0;height:100vh;overflow:auto;background:var(--side);border-right:1px solid var(--rule);padding:20px 0 40px}
aside .brand{padding:0 20px 4px;font-weight:700;color:var(--ink)}
aside .prog{padding:0 20px 12px;font:12px var(--mono);color:var(--meta)}
aside .bar{height:3px;background:var(--rule);margin:0 20px 14px}aside .bar i{display:block;height:100%;background:var(--ink);width:0}
aside input.q{margin:0 20px 6px;width:calc(100% - 40px);padding:7px 10px;border:1px solid var(--rule);border-radius:6px;font:14px var(--sans)}
.part{margin:18px 20px 0;padding-top:12px;border-top:1px solid var(--rule);font-weight:700;color:var(--ink);font-size:13px}
.grp{padding:10px 20px 2px;font:11px var(--mono);text-transform:uppercase;letter-spacing:.07em;color:var(--meta)}
aside a{display:flex;align-items:center;gap:8px;padding:4px 20px;color:var(--body);text-decoration:none;font-size:14.5px;border-left:2px solid transparent}
aside a:hover{background:#f0f0ec}aside a.on{border-left-color:var(--ink);background:#efefea;color:var(--ink);font-weight:600}
aside a span{flex:1}aside a em{font:11px var(--mono);font-style:normal}
aside a.isdone span{color:var(--meta);text-decoration:line-through}
.done{accent-color:var(--ink);margin:0}
.d-Easy{color:var(--ok)}.d-Medium{color:var(--med)}
main{max-width:820px;padding:40px 56px 120px}
.intro h1{font-size:32px;line-height:1.2;color:var(--ink);margin:0 0 8px}
.lead{color:var(--meta)}
.partHead{margin-top:72px;padding:20px 0 0;border-top:3px solid var(--ink)}
.partHead h1{font-size:28px;color:var(--ink);margin:0}
section.ch{border-top:1px solid var(--rule);margin-top:48px;padding-top:28px}
section.ch>h2{font-size:24px;color:var(--ink);margin:0 0 4px}
section.ch>p{color:var(--meta);margin:0 0 8px}
.page{padding:28px 0 8px;border-bottom:1px dashed var(--rule)}
.page h2{font-size:21px;color:var(--ink);margin:4px 0 8px}
.crumb{font:12px var(--mono);color:var(--meta)}.crumb a{color:var(--meta)}
h4{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--meta);margin:18px 0 4px}
ul{margin:0 0 10px;padding-left:20px}li{margin:3px 0}
pre{font:13.5px/1.55 var(--mono);background:var(--soft);border:1px solid var(--rule);border-radius:6px;padding:12px 14px;overflow-x:auto;margin:10px 0}
pre.code{position:relative;background:#fbfbfa;padding-top:34px}
.copy{position:absolute;top:8px;right:8px;font:11px var(--mono);border:1px solid var(--rule);background:#fff;border-radius:4px;padding:2px 8px;cursor:pointer}
.k{color:#8250df}.s{color:#0a3069}.c{color:#6e7781;font-style:italic}.n{color:#0550ae}
details{border:1px solid var(--rule);border-radius:6px;margin:8px 0;padding:0 14px}
details summary{cursor:pointer;padding:9px 0;font-weight:600;color:var(--ink)}
details[open]{padding-bottom:6px}details.hint summary{color:var(--med)}
.cx{font:13px var(--mono);color:var(--meta)}
.what{font-size:17px;color:var(--ink)}
.real{background:var(--soft);border-radius:6px;padding:10px 14px;margin:14px 0 4px}
.say{border-left:2px solid var(--ink);padding:4px 0 4px 14px;margin:16px 0 4px;color:var(--ink)}
table{border-collapse:collapse;width:100%;font-size:14.5px;margin:10px 0}
td,th{border-top:1px solid var(--rule);padding:7px 10px 7px 0;text-align:left;vertical-align:top}
th{font:11px var(--mono);text-transform:uppercase;color:var(--meta);font-weight:400}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}
a{color:var(--ink)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
footer{margin-top:64px;font:12px var(--mono);color:var(--meta)}
@media(max-width:900px){body{grid-template-columns:1fr}aside{position:static;height:auto;max-height:50vh}main{padding:24px}.cols{grid-template-columns:1fr}}
@media print{aside{display:none}body{display:block}details{border:0;padding:0}details>*{display:block}.copy{display:none}}
</style></head><body>
<aside aria-label="Contents">
  <div class="brand">DSA refresher</div>
  <div class="prog"><span id="cnt">0</span> / ${total} done</div>
  <div class="bar"><i id="bar"></i></div>
  <input class="q" id="q" type="search" placeholder="Filter" aria-label="Filter topics and problems">
  ${nav}
</aside>
<main>
<div class="intro" id="start">
  <h1>Data structures and algorithms, refreshed</h1>
  <p class="lead">${nCon} concepts and ${nPro} interview problems. Every implementation and solution is TypeScript, and all ${pass} tests pass before this page is built. Tick items off in the sidebar; progress is saved in your browser.</p>
  <p><b>Part 1, Concepts:</b> how each structure works inside, what it costs, when to reach for it, and where it shows up in production. Read "How it works", then explain it out loud in 60 seconds before opening the code.</p>
  <p><b>Part 2, Problems:</b> easy and easy-medium problems grouped by pattern. Read the prompt, say the clarifying questions, try for 10 minutes, then open the hint, the approach, and the solution in that order. Redo the ones you peeked at the next day, from a blank file.</p>
</div>

<section class="ch" id="pick">
  <h2>Pick a structure from what you need</h2>
  <table>
    <tr><th>I need</th><th>Use</th><th>Cost</th></tr>
    <tr><td>Look up by key, count, dedupe</td><td>Map / Set</td><td>O(1)</td></tr>
    <tr><td>Items in arrival order</td><td>Queue</td><td>O(1)</td></tr>
    <tr><td>Most recent first, undo, matching</td><td>Stack</td><td>O(1)</td></tr>
    <tr><td>Smallest or largest, repeatedly</td><td>Heap</td><td>O(log n)</td></tr>
    <tr><td>Sorted data that changes, ranges</td><td>Balanced BST / B+tree</td><td>O(log n)</td></tr>
    <tr><td>Prefix lookups</td><td>Trie</td><td>O(word length)</td></tr>
    <tr><td>Find in sorted array, minimum that works</td><td>Binary search</td><td>O(log n)</td></tr>
    <tr><td>Fewest hops</td><td>BFS</td><td>O(V + E)</td></tr>
    <tr><td>Cheapest weighted path</td><td>Dijkstra</td><td>O((V + E) log V)</td></tr>
    <tr><td>Order with dependencies</td><td>Topological sort</td><td>O(V + E)</td></tr>
    <tr><td>Merge groups, are they connected</td><td>Union-find</td><td>about O(1)</td></tr>
    <tr><td>All combinations</td><td>Backtracking</td><td>exponential</td></tr>
    <tr><td>Best answer from overlapping subproblems</td><td>DP</td><td>states × work</td></tr>
    <tr><td>O(1) lookup plus O(1) ordering</td><td>Map + doubly linked list (LRU)</td><td>O(1)</td></tr>
  </table>
</section>

<section class="ch" id="bigo">
  <h2>Complexity classes</h2>
  <table>
    <tr><th>Big O</th><th>Name</th><th>Typical source</th><th>n = 1M feels like</th></tr>
    <tr><td>O(1)</td><td>constant</td><td>hash lookup, array index</td><td>instant</td></tr>
    <tr><td>O(log n)</td><td>logarithmic</td><td>binary search, heap op, B+tree</td><td>~20 steps</td></tr>
    <tr><td>O(n)</td><td>linear</td><td>one pass</td><td>milliseconds</td></tr>
    <tr><td>O(n log n)</td><td>linearithmic</td><td>good sorting</td><td>~20M steps, fine</td></tr>
    <tr><td>O(n²)</td><td>quadratic</td><td>nested loops</td><td>10¹² steps, too slow</td></tr>
    <tr><td>O(2ⁿ), O(n!)</td><td>exponential</td><td>subsets, permutations</td><td>only for n under ~20</td></tr>
  </table>
  <p class="lead">Rough guide from input size: n up to 10⁴ allows O(n²). n up to 10⁶ needs O(n log n) or better.</p>
  <h4>Words interviewers use</h4>
  <table>
    <tr><td>Amortized</td><td>Average cost per operation over a long run. A dynamic array push is O(1) amortized even though a resize is O(n).</td></tr>
    <tr><td>Average vs worst</td><td>Hash map O(1) average, O(n) worst. Quick sort n log n average, n² worst. Say both.</td></tr>
    <tr><td>Space</td><td>Extra memory you allocate, plus recursion depth.</td></tr>
    <tr><td>Stable sort</td><td>Equal items keep their original order.</td></tr>
    <tr><td>In place</td><td>O(1) extra memory, apart from recursion.</td></tr>
  </table>
</section>

<section class="ch" id="compare">
  <h2>Array vs linked list vs hash map</h2>
  <table>
    <tr><th>Operation</th><th>Array</th><th>Linked list</th><th>Hash map</th></tr>
    <tr><td>Access by index</td><td>O(1)</td><td>O(n)</td><td>n/a</td></tr>
    <tr><td>Search by value</td><td>O(n), O(log n) if sorted</td><td>O(n)</td><td>O(1) by key</td></tr>
    <tr><td>Insert / delete at end</td><td>O(1) amortized</td><td>O(1) with tail</td><td>O(1)</td></tr>
    <tr><td>Insert / delete at front or middle</td><td>O(n), shifts</td><td>O(1) if you hold the node</td><td>O(1)</td></tr>
    <tr><td>Memory</td><td>contiguous, cache friendly</td><td>scattered, a pointer per node</td><td>extra for buckets</td></tr>
  </table>
  <p class="lead">Arrays win most real benchmarks because the CPU cache loves contiguous memory. Linked lists win when you hold node references and splice often, as in an LRU cache.</p>
</section>

<section class="ch" id="method">
  <h2>The 6 step method (say it out loud)</h2>
  <p>Interviewers grade how you think as much as the code. Narrate everything.</p>
  <table>
    <tr><td>1. Repeat</td><td>"So I get X and return Y." Confirms you understood.</td></tr>
    <tr><td>2. Clarify</td><td>Empty input? Duplicates? Negatives? Sorted? Size of n? Can I modify the input?</td></tr>
    <tr><td>3. Example</td><td>Walk one small example by hand, plus one edge case.</td></tr>
    <tr><td>4. Brute force</td><td>Say it with its Big O. Don't code it unless asked.</td></tr>
    <tr><td>5. Improve, then code</td><td>Name the pattern ("hash map", "two pointers"). Code it clean, with good names.</td></tr>
    <tr><td>6. Test</td><td>Run your example through the code line by line. Then edge cases. Then state time and space.</td></tr>
  </table>
  <h4>Which pattern? Look at the input</h4>
  <table>
    <tr><th>If you see</th><th>Try</th></tr>
    <tr><td>"Have I seen this?", counts, pairs</td><td>Map or Set</td></tr>
    <tr><td>Sorted array, palindrome, in-place rewrite</td><td>Two pointers</td></tr>
    <tr><td>Best substring or subarray</td><td>Sliding window</td></tr>
    <tr><td>Matching pairs, nesting, "most recent"</td><td>Stack</td></tr>
    <tr><td>Sorted plus find, or "minimum X that works"</td><td>Binary search</td></tr>
    <tr><td>Tree depth or path</td><td>Recursion (DFS)</td></tr>
    <tr><td>Level by level, fewest steps</td><td>BFS with a queue</td></tr>
    <tr><td>Grid, connected areas</td><td>DFS or BFS flood fill</td></tr>
    <tr><td>Ranges, meetings, schedules</td><td>Sort by start, then merge</td></tr>
    <tr><td>"How many ways", best value from smaller cases</td><td>DP</td></tr>
  </table>
  <h4>When stuck</h4>
  <ul><li>"Let me try a smaller example." Then do it.</li><li>"I'll start with the brute force so we have something correct, then optimise."</li><li>Ask: "Am I on the right track?" Interviewers usually nudge.</li></ul>
</section>

<section class="ch" id="ts">
  <h2>TypeScript cheat sheet</h2>
  <div class="cols"><div>
  <pre><code>${hl(`// Map: counts, value -> index
const m = new Map<number, number>();
m.set(k, (m.get(k) ?? 0) + 1);
m.has(k); m.get(k)!; m.delete(k);
for (const [k, v] of m) {}
[...m.values()]

// Set
const s = new Set<string>();
s.add(x); s.has(x); s.size;`)}</code></pre>
  </div><div>
  <pre><code>${hl(`// Arrays
const a = Array.from({ length: n }, () => []);
a.sort((x, y) => x - y);   // ALWAYS pass this
a.slice(i, j); a.at(-1);
const stack = []; stack.push(x); stack.pop();

// Strings
for (const c of str) {}
[...str].sort().join("");
str.toLowerCase(); /[a-z0-9]/i.test(c)
Math.floor((lo + hi) / 2); lo + hi >> 1`)}</code></pre>
  </div></div>
  <ul><li><code>[10, 9, 1].sort()</code> gives <code>[1, 10, 9]</code> because it sorts as strings. Always pass a compare function.</li>
  <li><code>queue.shift()</code> is O(n). For BFS use a head index or level arrays.</li>
  <li><code>??</code> treats only null and undefined as missing. <code>||</code> also treats 0 as missing, which breaks counts.</li></ul>
</section>

<div class="partHead" id="part1"><h1>Part 1 · Concepts</h1><p class="lead">How things work, what they cost, where you've already met them.</p></div>
${C.chapters.map(c => `<section class="ch" id="cc-${c.id}"><h2>${esc(c.title)}</h2><p>${esc(c.blurb)}</p>${c.ids.map(conceptPage).join("")}</section>`).join("")}

<div class="partHead" id="part2"><h1>Part 2 · Problems</h1><p class="lead">Grouped by pattern. Try first, then hint, approach, solution.</p></div>
${P.chapters.map(c => `<section class="ch" id="pc-${c.id}"><h2>${esc(c.title)}</h2><p>${esc(c.blurb)}</p>${c.ids.map(problemPage).join("")}</section>`).join("")}

<section class="ch" id="plan">
  <h2>A 5 day plan</h2>
  <table>
    <tr><td>Day 1</td><td>Start pages, then hash map, queue, heap. Problems: hashing chapter.</td></tr>
    <tr><td>Day 2</td><td>Traversals, BST, trie. Problems: two pointers, sliding window, stack.</td></tr>
    <tr><td>Day 3</td><td>Graphs, topological sort, binary search templates. Problems: binary search, linked list, trees.</td></tr>
    <tr><td>Day 4</td><td>Sorting, backtracking, DP. Problems: grid, intervals, DP. Write LRU cache and the rate limiter from a blank file.</td></tr>
    <tr><td>Day 5</td><td>Redo everything you peeked at. Skim the "Say out loud" lines.</td></tr>
  </table>
  <p class="lead">The night before an interview: one warm-up problem, then stop.</p>
</section>
<footer>Built by <a href="https://github.com/nadimtuhin">Nadim Tuhin</a> · source and tests: <a href="https://github.com/nadimtuhin/dsa-refresher">github.com/nadimtuhin/dsa-refresher</a></footer>
</main>
<script>
  const KEY = "dsa-refresher-done";
  const done = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  const total = ${total};
  function render() {
    document.querySelectorAll(".done").forEach(b => { b.checked = done.has(b.dataset.id); b.closest("a").classList.toggle("isdone", b.checked); });
    document.getElementById("cnt").textContent = done.size;
    document.getElementById("bar").style.width = (done.size / total * 100) + "%";
  }
  document.querySelectorAll(".done").forEach(b => {
    b.addEventListener("click", e => e.stopPropagation());
    b.addEventListener("change", () => { b.checked ? done.add(b.dataset.id) : done.delete(b.dataset.id); localStorage.setItem(KEY, JSON.stringify([...done])); render(); });
  });
  render();
  document.getElementById("q").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll("aside a[data-id]").forEach(a => { a.style.display = a.textContent.toLowerCase().includes(q) ? "" : "none"; });
  });
  document.querySelectorAll(".copy").forEach(btn => btn.addEventListener("click", () => {
    navigator.clipboard.writeText(btn.nextElementSibling.textContent).then(() => { btn.textContent = "Copied"; setTimeout(() => btn.textContent = "Copy", 1200); });
  }));
  const links = new Map([...document.querySelectorAll("aside a[data-id]")].map(a => [a.dataset.id, a]));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { links.forEach(a => a.classList.remove("on")); const a = links.get(e.target.id); if (a) { a.classList.add("on"); a.scrollIntoView({ block: "nearest" }); } }
  }), { rootMargin: "-10% 0px -80% 0px" });
  document.querySelectorAll("article.page, #start, #pick, #bigo, #compare, #method, #ts, #plan").forEach(el => io.observe(el));
</script>
</body></html>`;

mkdirSync(new URL("./public/", import.meta.url), { recursive: true });
writeFileSync(new URL("./public/index.html", import.meta.url), html);
console.log(`wrote public/index.html: ${nCon} concepts + ${nPro} problems`);
