// player.js: draws recorded frames in the page. Inlined into index.html by build.js.
// Views: array, list, kv, vars, bars, grid, buckets, tree (heap layout), ntree (nested), graph.
(() => {
  const FR = window.FRAMES;
  const e = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cells = (items, hi, ptr, cls = "cell") =>
    `<div class="row">${items.map((v, i) => `<div class="slot"><div class="${cls} ${hi[i] || ""}">${e(v)}</div><div class="ix">${i}</div><div class="ptr">${e(ptr[i] || "")}</div></div>`).join("") || `<div class="empty">empty</div>`}</div>`;

  function tree(v) { // heap layout, slot i at depth floor(log2(i+1))
    const n = v.nodes.length;
    if (!n || v.nodes.every(x => x == null)) return `<div class="empty">empty</div>`;
    const depth = Math.floor(Math.log2(n)) + 1, W = 520, H = depth * 58 + 10, R = 16;
    const xy = i => { const d = Math.floor(Math.log2(i + 1)), k = i - (2 ** d - 1); return [W * (k + 0.5) / 2 ** d, 24 + d * 58]; };
    let s = "";
    v.nodes.forEach((val, i) => { if (val == null || !i) return; const [x, y] = xy(i), [px, py] = xy((i - 1) >> 1); s += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}"/>`; });
    v.nodes.forEach((val, i) => {
      if (val == null) return;
      const [x, y] = xy(i);
      s += `<g class="nd ${v.hi[i] || ""}"><circle cx="${x}" cy="${y}" r="${R}"/><text x="${x}" y="${y + 4}">${e(val)}</text>${v.sub[i] != null ? `<text class="sub" x="${x}" y="${y + R + 12}">${e(v.sub[i])}</text>` : ""}</g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H + 8}" class="svg">${s}</svg>`;
  }

  function ntree(v) { // general tree: leaves spread evenly, parents centred over children
    let leaf = 0, maxD = 0;
    const lay = (n, d) => {
      maxD = Math.max(maxD, d);
      const kids = n.c.map(c => lay(c, d + 1));
      const x = kids.length ? (kids[0].x + kids.at(-1).x) / 2 : leaf++;
      return { ...n, x, d, kids };
    };
    const root = lay(v.root, 0), W = 520, gap = W / Math.max(leaf, 1), H = (maxD + 1) * 52;
    const X = n => (n.x + 0.5) * gap, Y = n => 22 + n.d * 52;
    let lines = "", nodes = "";
    const walk = n => {
      for (const k of n.kids) { lines += `<line x1="${X(n)}" y1="${Y(n)}" x2="${X(k)}" y2="${Y(k)}"/>`; walk(k); }
      const w = Math.max(24, n.l.length * 8 + 12);
      nodes += `<g class="nd ${n.cls || ""}"><rect x="${X(n) - w / 2}" y="${Y(n) - 13}" width="${w}" height="26" rx="13"/><text x="${X(n)}" y="${Y(n) + 4}">${e(n.l)}</text></g>`;
    };
    walk(root);
    return `<svg viewBox="0 0 ${W} ${H}" class="svg">${lines}${nodes}</svg>`;
  }

  function graph(v) {
    const R = 17, W = 510, H = Math.max(...v.nodes.map(n => n.y)) + 46;
    const at = id => v.nodes.find(n => n.id === id);
    let s = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z"/></marker></defs>`;
    for (const [a, b, w] of v.edges) {
      const p = at(a), q = at(b), dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
      const x1 = p.x + dx / L * R, y1 = p.y + dy / L * R, x2 = q.x - dx / L * (R + 2), y2 = q.y - dy / L * (R + 2);
      s += `<line class="${v.ehi[`${a}-${b}`] || ""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${v.directed ? 'marker-end="url(#ah)"' : ""}/>`;
      // weight sits beside the edge's midpoint, pushed out along the edge's normal so it never sits on the line
      if (w != null) s += `<text class="w" x="${(p.x + q.x) / 2 - dy / L * 12}" y="${(p.y + q.y) / 2 + dx / L * 12 + 4}">${w}</text>`;
    }
    for (const n of v.nodes) s += `<g class="nd ${v.hi[n.id] || ""}"><circle cx="${n.x}" cy="${n.y}" r="${R}"/><text x="${n.x}" y="${n.y + 4}">${n.id}</text>${v.sub[n.id] != null ? `<text class="sub" x="${n.x}" y="${n.y + R + 13}">${e(v.sub[n.id])}</text>` : ""}</g>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="svg">${s}</svg>`;
  }

  function bars(v) {
    const W = 500, scale = W / v.max;
    if (!v.items.length) return `<div class="empty">empty</div>`;
    const ticks = Array.from({ length: v.max / 5 + 1 }, (_, i) => `<text class="tick" x="${i * 5 * scale}" y="${v.items.length * 26 + 14}">${i * 5}</text>`).join("");
    return `<svg viewBox="-6 0 ${W + 16} ${v.items.length * 26 + 20}" class="svg">${v.items.map(([a, b], i) =>
      `<g class="nd ${v.hi[i] || ""}"><rect x="${a * scale}" y="${i * 26 + 2}" width="${Math.max((b - a) * scale, 3)}" height="20" rx="4"/><text class="bl" x="${a * scale + 6}" y="${i * 26 + 16}">[${a},${b}]</text></g>`).join("")}${ticks}</svg>`;
  }

  const view = v => {
    const body = {
      array: () => cells(v.items, v.hi, v.ptr),
      list: () => `<div class="row">${v.items.length ? v.items.map((x, i) => `<div class="slot"><div class="cell node ${v.hi[i] || ""}">${e(x)}</div><div class="ix">${i === v.items.length - 1 ? (v.back != null ? `↺ to ${v.back}` : "→ null") : "→"}</div><div class="ptr">${e(v.ptr[i] || "")}</div></div>`).join("") : `<div class="empty">null</div>`}</div>`,
      kv: () => v.entries.length ? `<div class="kv">${v.entries.map(([k, x]) => `<div class="pair ${k === v.hi ? "cur" : ""}"><b>${e(k)}</b><span>${e(x)}</span></div>`).join("")}</div>` : `<div class="empty">empty</div>`,
      vars: () => `<div class="vars">${v.vars.map(([k, x]) => `<span><i>${e(k)}</i> ${e(x)}</span>`).join("")}</div>`,
      bars: () => bars(v),
      grid: () => `<div class="grid" style="grid-template-columns:repeat(${v.cells[0].length},34px)">${v.cells.flatMap((r, y) => r.map((x, c) => `<div class="cell ${v.hi[`${y},${c}`] || ""}">${e(x)}</div>`)).join("")}</div>`,
      buckets: () => `<div class="buckets">${v.buckets.map((b, i) => `<div class="bk ${i === v.hi.b ? "on" : ""}"><span class="ix">${i}</span>${b.length ? "" : `<span class="nil">empty</span>`}${b.map(x => `<div class="cell chip ${i === v.hi.b && x === v.hi.k ? "cur" : ""}">${e(x)}</div>`).join("")}</div>`).join("")}</div>`,
      tree: () => tree(v),
      ntree: () => ntree(v),
      graph: () => graph(v)
    }[v.t]();
    return `<div class="view">${v.label ? `<div class="vl">${e(v.label)}</div>` : ""}${body}</div>`;
  };

  function mount(el) {
    const fr = FR[el.dataset.anim];
    if (!fr) return;
    let i = 0, timer = null;
    el.innerHTML = `<div class="stage" aria-hidden="true"></div><p class="note" aria-live="polite"></p>
      <div class="ctl"><button type="button" data-a="first" aria-label="First step">⏮</button><button type="button" data-a="prev" aria-label="Previous step">◀</button>
      <button type="button" data-a="play" class="play">Play</button><button type="button" data-a="next" aria-label="Next step">▶</button>
      <input type="range" min="0" max="${fr.length - 1}" value="0" aria-label="Step"><span class="cnt"></span>
      <select aria-label="Speed"><option value="1400">slow</option><option value="800" selected>normal</option><option value="350">fast</option></select></div>`;
    const stage = el.querySelector(".stage"), note = el.querySelector(".note"), range = el.querySelector("input"), cnt = el.querySelector(".cnt"), play = el.querySelector(".play"), speed = el.querySelector("select");
    const draw = () => { const f = fr[i]; stage.innerHTML = f.views.map(view).join(""); note.textContent = f.note; range.value = i; cnt.textContent = `${i + 1} / ${fr.length}`; };
    const stop = () => { clearInterval(timer); timer = null; play.textContent = "Play"; };
    const go = k => { i = Math.max(0, Math.min(fr.length - 1, k)); draw(); };
    const start = () => {
      if (i >= fr.length - 1) go(0);
      play.textContent = "Pause";
      timer = setInterval(() => { if (i >= fr.length - 1) stop(); else go(i + 1); }, +speed.value);
    };
    el.addEventListener("click", ev => {
      const a = ev.target.closest("button")?.dataset.a;
      if (!a) return;
      if (a === "play") return timer ? stop() : start();
      stop();
      go({ first: 0, prev: i - 1, next: i + 1 }[a]);
    });
    range.addEventListener("input", () => { stop(); go(+range.value); });
    speed.addEventListener("change", () => { if (timer) { stop(); start(); } });
    el.tabIndex = 0;
    el.addEventListener("keydown", ev => {
      if (ev.key === "ArrowRight") { stop(); go(i + 1); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { stop(); go(i - 1); ev.preventDefault(); }
    });
    draw();
    // autoplay once when scrolled into view (skipped for reduced motion)
    if (!reduced) {
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting && i === 0 && !timer) { start(); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(el);
    }
  }
  document.querySelectorAll(".anim").forEach(mount);
})();
