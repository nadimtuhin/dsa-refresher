// anims.js: the step-by-step traces behind each animation on the page.
// Every tracer replays its algorithm on a small input and records frames, then returns
// [its own answer, the tested solution's answer]. build.js refuses to build if they differ.
import * as C from "./concepts.js";
import * as P from "./problems.js";

const cell = v => (v === Infinity ? "∞" : v == null ? "" : v === " " ? "·" : Array.isArray(v) ? v.join(",") : String(v));
const show = v => (v === Infinity ? "∞" : v === undefined ? "undefined" : Array.isArray(v) ? "[" + v.map(show).join(", ") + "]" : typeof v === "string" ? `"${v}"` : String(v));
// finger labels under array cells, in plain words (code names like lo/hi stay in the code, not on screen)
const WORDS = { i: "here", j: "here", w: "write", r: "read", l: "left", lo: "low", hi: "high", mid: "middle", start: "start", head: "front" };
const ptrs = o => {
  const r = {};
  for (const [k, i] of Object.entries(o)) {
    if (i == null || i < 0) continue;
    const w = "↑" + (WORDS[k] ?? k);
    r[i] = r[i] ? r[i] + " " + w : w;
  }
  return r;
};
const range = (lo, hi, cls) => Object.fromEntries(Array.from({ length: Math.max(0, hi - lo + 1) }, (_, k) => [lo + k, cls]));
const A = (label, items, hi = {}, ptr = {}) => ({ t: "array", label, items: items.map(cell), hi, ptr });
const KV = (label, entries, hi) => ({ t: "kv", label, entries: [...entries].map(([k, v]) => [cell(k), cell(v)]), hi: hi == null ? null : cell(hi) });
const V = vars => ({ t: "vars", vars: Object.entries(vars).map(([k, v]) => [k, show(v)]) });
const L = (label, items, hi = {}, ptr = {}, back = null) => ({ t: "list", label, items: items.map(cell), hi, ptr, back });
const B = (label, items, hi = {}) => ({ t: "bars", label, items: items.map(x => [...x]), hi, max: 20 });
const HEAP = (label, a, hi = {}) => ({ t: "tree", label, nodes: [...a], hi, sub: {} });
// binary tree drawn in heap layout: children of slot i are 2i+1 and 2i+2
function TREE(label, root, hi = new Map(), sub = new Map()) {
  const nodes = [], h = {}, s = {};
  const go = (n, i) => {
    if (!n) return;
    nodes[i] = n.val;
    if (hi.has(n)) h[i] = hi.get(n);
    if (sub.has(n)) s[i] = String(sub.get(n));
    go(n.left, 2 * i + 1);
    go(n.right, 2 * i + 2);
  };
  go(root, 0);
  return { t: "tree", label, nodes: Array.from(nodes, v => v ?? null), hi: h, sub: s };
}
const GRAPH = (label, pos, edges, { directed = false, hi = {}, sub = {}, ehi = {} } = {}) =>
  ({ t: "graph", label, nodes: pos.map(([x, y], id) => ({ id, x, y })), edges, directed, hi, sub, ehi });

export const anims = {
  // ---------------- Part 1: concepts ----------------
  "c-hash-map": f => {
    const keys = ["cat", "dog", "emu", "fox", "gnu", "hen", "owl"], m = new C.HashMap(4);
    const snap = (note, b = -1, k = null) => f(note,
      { t: "buckets", label: `buckets (capacity ${m.capacity})`, buckets: m.buckets.map(x => x.map(([kk, v]) => `${kk}: ${v}`)), hi: { b, k } },
      V({ size: m.size, load: Math.round((m.size / m.capacity) * 100) / 100 }));
    snap("4 empty buckets. Each bucket holds a short list of entries.");
    keys.forEach((key, v) => {
      const b = m.index(key), cap = m.capacity;
      m.set(key, v);
      if (m.capacity !== cap) snap(`set("${key}", ${v}) lands in bucket ${b}. Now size / capacity is over 0.75, so the table doubles to ${m.capacity} and every key is rehashed.`, m.index(key), `${key}: ${v}`);
      else snap(`set("${key}", ${v}): hash("${key}") % ${cap} = ${b}. ${m.buckets[b].length > 1 ? "Collision: the bucket already had an entry, so it chains." : "Empty bucket, store it."}`, b, `${key}: ${v}`);
    });
    snap(`get("fox"): hash to bucket ${m.index("fox")}, then scan its short list. O(1) on average.`, m.index("fox"), "fox: 3");
    const real = new C.HashMap(4);
    keys.forEach((k, v) => real.set(k, v));
    return [m.get("fox"), real.get("fox")];
  },

  "c-queue": f => {
    const q = new C.Queue(), out = [];
    const snap = (note, cur = -1) => {
      const hi = range(0, q.head - 1, "dim");
      if (cur >= 0) hi[cur] = "cur";
      f(note, A("items (array) with a head index", q.items, hi, ptrs({ head: q.head })), V({ size: q.size }));
    };
    snap("Empty queue. head marks the front.");
    for (const x of [10, 20, 30, 40]) { q.enqueue(x); snap(`enqueue(${x}): push onto the end. O(1).`, q.items.length - 1); }
    for (let k = 0; k < 2; k++) {
      const h = q.head;
      out.push(q.dequeue());
      snap(`dequeue() returns ${out.at(-1)}. head moves forward instead of shifting every element. O(1).`, h);
    }
    q.enqueue(50);
    snap("enqueue(50). Used slots before head get cleaned up in bulk later.", q.items.length - 1);
    f("A stack is simpler: push and pop at the same end of an array.", A("stack (array)", [10, 20, 30], { 2: "cur" }, { 2: "top" }));
    return [[out, q.size], [[10, 20], 3]];
  },

  "c-min-heap": f => {
    const a = [], popped = [];
    const snap = (note, hi = {}) => f(note, HEAP("heap as a tree (parent ≤ children)", a, hi), A("the same heap stored in an array", a, hi));
    for (const x of [5, 3, 8, 1, 9, 2]) {
      a.push(x);
      let i = a.length - 1;
      snap(`push(${x}): add at the end.`, { [i]: "cur" });
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[i] >= a[p]) { snap(`${a[i]} ≥ parent ${a[p]}, stop.`, { [i]: "ok", [p]: "ok" }); break; }
        [a[i], a[p]] = [a[p], a[i]];
        snap(`${a[p]} < parent ${a[i]}, swap up.`, { [p]: "cur", [i]: "cmp" });
        i = p;
      }
    }
    for (let k = 0; k < 2; k++) {
      popped.push(a[0]);
      const last = a.pop();
      a[0] = last;
      snap(`pop() returns ${popped.at(-1)}. Move the last item (${last}) to the root.`, { 0: "cur" });
      let i = 0;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) { snap(`${a[i]} is ≤ its children, stop.`, { [i]: "ok" }); break; }
        [a[i], a[m]] = [a[m], a[i]];
        snap("Swap down with the smaller child.", { [m]: "cur", [i]: "cmp" });
        i = m;
      }
    }
    const h = new C.MinHeap((x, y) => x - y);
    [5, 3, 8, 1, 9, 2].forEach(x => h.push(x));
    return [[popped, a], [[h.pop(), h.pop()], h.a]];
  },

  "c-traversals": f => {
    const root = P.tree([4, 2, 6, 1, 3, 5, 7]), out = [], stack = [], done = new Set();
    let cur = root;
    const snap = (note, at) => {
      const hi = new Map();
      done.forEach(n => hi.set(n, "ok"));
      stack.forEach(n => hi.set(n, "cmp"));
      if (at) hi.set(at, "cur");
      f(note, TREE("tree", root, hi), A("stack", stack.map(n => n.val)), A("output (inorder)", out));
    };
    snap("Inorder without recursion: go left as far as possible, pushing each node on a stack.");
    while (cur || stack.length) {
      while (cur) { stack.push(cur); snap(`Push ${cur.val}, go left.`, cur); cur = cur.left; }
      cur = stack.pop();
      out.push(cur.val);
      done.add(cur);
      snap(`Nothing more on the left. Pop ${cur.val}, output it, then go right.`, cur);
      cur = cur.right;
    }
    snap("Done. Inorder on a binary search tree comes out sorted.");
    return [out, C.inorderIterative(P.tree([4, 2, 6, 1, 3, 5, 7]))];
  },

  "c-bst": f => {
    const vals = [50, 30, 70, 20, 40, 60, 80], t = new C.BST();
    const snap = (note, hi = new Map()) => f(note, TREE("binary search tree", t.root, hi), A("inorder", C.inorder(t.root)));
    for (const v of vals) {
      const hi = new Map();
      for (let n = t.root; n; n = v < n.val ? n.left : n.right) hi.set(n, "cmp");
      t.insert(v);
      let x = t.root;
      while (x.val !== v) x = v < x.val ? x.left : x.right;
      hi.set(x, "cur");
      snap(`insert ${v}: smaller goes left, larger goes right, until an empty spot.`, hi);
    }
    const hi = new Map();
    let n = t.root;
    while (n.val !== 30) { hi.set(n, "cmp"); n = 30 < n.val ? n.left : n.right; }
    hi.set(n, "bad");
    let s = n.right;
    while (s.left) s = s.left;
    hi.set(s, "cur");
    snap("delete 30: it has two children. Find the smallest value in its right subtree (40).", hi);
    t.delete(30);
    snap("Copy 40 into 30's place, then delete the old 40. The tree is still ordered.");
    const r = new C.BST();
    vals.forEach(v => r.insert(v));
    r.delete(30);
    return [C.inorder(t.root), C.inorder(r.root)];
  },

  "c-trie": f => {
    const words = ["car", "cat", "card", "dog"], t = new C.Trie();
    const toN = (n, label, hi) => ({ l: label, cls: hi.get(n) ?? (n.end ? "ok" : ""), c: [...n.kids.entries()].sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([ch, k]) => toN(k, ch, hi)) });
    const path = s => {
      const hi = new Map();
      let n = t.root;
      hi.set(n, "cmp");
      for (const c of s) { n = n.kids.get(c); if (!n) return hi; hi.set(n, "cmp"); }
      hi.set(n, "cur");
      return hi;
    };
    const snap = (note, hi = new Map()) => f(note, { t: "ntree", label: "trie (green = word ends here, blue = path walked, yellow = current)", root: toN(t.root, "root", hi) });
    snap("Empty trie: just a root.");
    for (const w of words) { t.insert(w); snap(`insert "${w}": reuse letters that already exist, add new ones, mark the last letter as a word end.`, path(w)); }
    snap(`search("ca"): the path exists but "a" is not a word end, so false. startsWith("ca") is true.`, path("ca"));
    const ac = t.autocomplete("car");
    snap(`autocomplete("car"): walk to "r", then collect every word below it: ${ac.join(", ")}.`, path("car"));
    const r = new C.Trie();
    words.forEach(w => r.insert(w));
    return [ac, r.autocomplete("car")];
  },

  "c-graph": f => {
    const pos = [[40, 100], [150, 40], [150, 160], [260, 100], [370, 100], [470, 170]], edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
    const adj = C.buildGraph(6, edges), dist = Array(6).fill(-1), q = [0];
    let h = 0;
    dist[0] = 0;
    const snap = (note, u = -1) => {
      const hi = {};
      dist.forEach((d, i) => { if (d >= 0) hi[i] = "ok"; });
      q.slice(h).forEach(i => (hi[i] = "cmp"));
      if (u >= 0) hi[u] = "cur";
      f(note, GRAPH("graph (number under a node = hops from 0)", pos, edges, { hi, sub: Object.fromEntries(dist.map((d, i) => [i, d < 0 ? "?" : d])) }), A("queue", q.slice(h)));
    };
    snap("BFS from 0. Its distance is 0. Put it in the queue.");
    while (h < q.length) {
      const u = q[h++], found = [];
      for (const v of adj[u]) if (dist[v] === -1) { dist[v] = dist[u] + 1; q.push(v); found.push(v); }
      snap(found.length ? `Take ${u} off the queue. Unvisited neighbours ${found.join(", ")} get distance ${dist[u] + 1}.` : `Take ${u} off the queue. No unvisited neighbours.`, u);
    }
    snap("Queue empty. Node 5 was never reached, so it stays -1.");
    return [dist, C.bfsDistances(adj, 0)];
  },

  "c-topo-sort": f => {
    const n = 6, pos = [[40, 50], [40, 160], [170, 50], [170, 160], [300, 105], [430, 105]];
    const edges = [[0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5]];
    const adj = C.buildGraph(n, edges, true), indeg = Array(n).fill(0), ready = [], order = [];
    for (const [, b] of edges) indeg[b]++;
    for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);
    let h = 0;
    const snap = (note, u = -1) => {
      const hi = {};
      order.forEach(i => (hi[i] = "ok"));
      ready.slice(h).forEach(i => (hi[i] = "cmp"));
      if (u >= 0) hi[u] = "cur";
      f(note, GRAPH("dependencies (number under a node = edges still blocking it)", pos, edges, { directed: true, hi, sub: Object.fromEntries(indeg.map((d, i) => [i, d])) }), A("ready", ready.slice(h)), A("order", order));
    };
    snap("Count incoming edges. 0 and 1 have none, so they're ready.");
    while (h < ready.length) {
      const u = ready[h++], freed = [];
      order.push(u);
      for (const v of adj[u]) if (--indeg[v] === 0) { ready.push(v); freed.push(v); }
      snap(`Take ${u}. Lower the count of everything it points to.${freed.length ? ` ${freed.join(", ")} reached 0 and ${freed.length > 1 ? "are" : "is"} ready.` : ""}`, u);
    }
    snap("All 6 placed, so there's no cycle.");
    return [order, C.topoSort(n, edges)];
  },

  "c-dijkstra": f => {
    const n = 5, pos = [[40, 105], [230, 40], [150, 180], [380, 105], [480, 180]];
    const edges = [[0, 1, 4], [0, 2, 1], [2, 1, 2], [1, 3, 1], [2, 3, 5]];
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v, w] of edges) adj[u].push([v, w]);
    const dist = Array(n).fill(Infinity), done = new Set(), pq = new C.MinHeap((a, b) => a[0] - b[0]);
    dist[0] = 0;
    pq.push([0, 0]);
    const snap = (note, u = -1, ehi = {}) => {
      const hi = {};
      done.forEach(i => (hi[i] = "ok"));
      if (u >= 0) hi[u] = "cur";
      f(note, GRAPH("weighted graph (under a node = best distance so far)", pos, edges, { directed: true, hi, ehi, sub: Object.fromEntries(dist.map((d, i) => [i, d === Infinity ? "∞" : d])) }),
        A("min heap of [distance, node]", pq.a.map(([d, v]) => `[${d},${v}]`)));
    };
    snap("Distance 0 to node 0, ∞ to everything else.");
    while (pq.size) {
      const [d, u] = pq.pop();
      if (d > dist[u]) { snap(`Pop [${d}, ${u}], but ${u} already has ${dist[u]}. Stale entry, skip.`, u); continue; }
      done.add(u);
      const better = [], ehi = {};
      for (const [v, w] of adj[u]) {
        ehi[`${u}-${v}`] = "cmp";
        if (d + w < dist[v]) { dist[v] = d + w; pq.push([dist[v], v]); better.push(`${v} = ${dist[v]}`); ehi[`${u}-${v}`] = "cur"; }
      }
      snap(`Settle ${u} at ${d}.${better.length ? ` Shorter paths found: ${better.join(", ")}.` : " No improvements."}`, u, ehi);
    }
    snap("Heap empty. Node 4 has no incoming edge, so it stays ∞.");
    return [dist, C.dijkstra(n, edges, 0)];
  },

  "c-union-find": f => {
    const u = new C.UnionFind(6), pos = [[200, 40], [80, 130], [320, 130], [320, 220], [450, 40], [450, 140]];
    const snap = (note, hi = {}) => f(note,
      GRAPH("arrows point to a parent; a node with no arrow is its group's root", pos, u.parent.map((p, i) => [i, p]).filter(([i, p]) => i !== p), { directed: true, hi }),
      A("parent", u.parent, hi), V({ groups: u.count }));
    snap("6 items, each in its own group: everyone is their own parent.");
    for (const [a, b] of [[0, 1], [2, 3], [1, 3], [4, 5], [0, 2]]) {
      const ra = u.find(a), rb = u.find(b), merged = u.union(a, b);
      snap(merged ? `union(${a}, ${b}): roots ${ra} and ${rb} were different, so one root now hangs under the other.` : `union(${a}, ${b}): both already have root ${ra}. Same group, nothing to do. In a graph, this edge would close a cycle.`, { [a]: "cur", [b]: "cur" });
    }
    return [[u.count, u.find(3) === u.find(0), u.find(5) === u.find(0)], [2, true, false]];
  },

  "c-merge-sort": f => {
    const input = [5, 2, 9, 1, 5, 6, -3], a = [...input];
    const go = (lo, hi) => {
      if (hi - lo <= 1) return;
      const mid = (lo + hi) >> 1;
      f(`Split [${a.slice(lo, hi).join(", ")}] into two halves.`, A("array", a, { ...range(lo, mid - 1, "cmp"), ...range(mid, hi - 1, "cur") }));
      go(lo, mid);
      go(mid, hi);
      const l = a.slice(lo, mid), r = a.slice(mid, hi);
      let i = 0, j = 0, k = lo;
      while (i < l.length && j < r.length) a[k++] = l[i] <= r[j] ? l[i++] : r[j++];
      while (i < l.length) a[k++] = l[i++];
      while (j < r.length) a[k++] = r[j++];
      f(`Merge [${l.join(", ")}] and [${r.join(", ")}] by repeatedly taking the smaller front item.`, A("array", a, range(lo, hi - 1, "ok")));
    };
    f("Unsorted input.", A("array", a));
    go(0, a.length);
    f("Sorted. log n levels of splitting, n work per level.", A("array", a, range(0, a.length - 1, "ok")));
    return [a, C.mergeSort(input)];
  },

  "c-quick-sort": f => {
    const input = [5, 2, 9, 1, 5, 6, -3], a = [...input], fixed = new Set();
    const base = () => Object.fromEntries([...fixed].map(i => [i, "ok"]));
    const qs = (lo, hi) => {
      if (lo >= hi) { if (lo === hi) fixed.add(lo); return; }
      const mid = lo + ((hi - lo) >> 1);
      [a[mid], a[hi]] = [a[hi], a[mid]];
      const pivot = a[hi];
      f(`Range ${lo} to ${hi}: take the middle item (${pivot}) as the pivot and move it to the end.`, A("array", a, { ...base(), ...range(lo, hi - 1, "cmp"), [hi]: "cur" }, ptrs({ pivot: hi })));
      let i = lo;
      for (let j = lo; j < hi; j++) if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
      [a[i], a[hi]] = [a[hi], a[i]];
      fixed.add(i);
      f(`Partition: everything < ${pivot} moves left. The pivot lands at index ${i}, its final spot.`, A("array", a, { ...base(), [i]: "cur" }, ptrs({ pivot: i })));
      qs(lo, i - 1);
      qs(i + 1, hi);
    };
    f("Unsorted input.", A("array", a));
    qs(0, a.length - 1);
    f("Sorted, in place.", A("array", a, range(0, a.length - 1, "ok")));
    return [a, C.quickSort([...input])];
  },

  "c-binary-search": f => {
    const a = [1, 2, 2, 2, 5, 8, 9, 12], x = 2;
    let lo = 0, hi = a.length;
    const snap = (note, mid = -1) => f(note,
      A("sorted array", a, { ...range(0, lo - 1, "dim"), ...range(hi, a.length - 1, "dim"), ...(mid >= 0 ? { [mid]: "cur" } : {}) }, ptrs({ lo, mid: mid >= 0 ? mid : null, hi: hi < a.length ? hi : null })),
      V({ low: lo, high: hi, "looking for": x }));
    snap(`lowerBound(${x}): find the first spot holding ${x} or more. Two fingers, low and high, mark the part still possible.`);
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (a[m] < x) { snap(`a[${m}] = ${a[m]} < ${x}, so the answer is right of mid: lo = ${m + 1}.`, m); lo = m + 1; }
      else { snap(`a[${m}] = ${a[m]} >= ${x}, so mid could be the answer: hi = ${m}.`, m); hi = m; }
    }
    snap(`low and high met at index ${lo}: the first ${x} is there. Each step threw away half.`);
    return [lo, C.lowerBound(a, x)];
  },

  "c-backtracking": f => {
    const nums = [1, 2, 3], out = [], path = [], root = { l: "[]", c: [] };
    let cur = root;
    const snap = note => {
      const mark = n => ({ l: n.l, cls: n === cur ? "cur" : n.leaf ? "ok" : "", c: n.c.map(mark) });
      f(note, { t: "ntree", label: "decision tree: left child = skip, right child = take", root: mark(root) }, A("path", path), A("results", out.map(r => `[${r.join(",")}]`)));
    };
    const go = (i, n, note) => {
      cur = n;
      if (i === nums.length) { out.push([...path]); n.leaf = true; snap(`${note} Every item decided: save a copy of [${path.join(", ")}].`); return; }
      snap(note);
      const skip = { l: `[${path.join(",")}]`, c: [] };
      n.c.push(skip);
      go(i + 1, skip, `Skip ${nums[i]}.`);
      path.push(nums[i]);
      const take = { l: `[${path.join(",")}]`, c: [] };
      n.c.push(take);
      go(i + 1, take, `Take ${nums[i]}.`);
      path.pop();
    };
    go(0, root, "Start with an empty path. Each item is either skipped or taken.");
    cur = null;
    snap("Done: 2 choices for each of 3 items gives 2^3 = 8 subsets, one per leaf.");
    const key = xs => xs.map(x => x.join(",")).sort();
    return [key(out), key(C.subsets(nums))];
  },

  "c-dp": f => {
    const coins = [1, 2, 5], amount = 11, best = Array(amount + 1).fill(Infinity);
    best[0] = 0;
    f("best[a] = fewest coins that make amount a. best[0] = 0, the rest unknown (∞).", A("best[a]", best, { 0: "ok" }), V({ coins }));
    for (let a = 1; a <= amount; a++) {
      const hi = {}, tried = [];
      for (const c of coins) if (c <= a) { hi[a - c] = "cmp"; tried.push(`best[${a - c}] + 1 = ${best[a - c] + 1}`); best[a] = Math.min(best[a], best[a - c] + 1); }
      hi[a] = "cur";
      f(`best[${a}] = smallest of: ${tried.join(", ")}. So ${best[a]}.`, A("best[a]", best, hi), V({ coins }));
    }
    f(`Answer: ${best[amount]} coins (5 + 5 + 1). Every amount reused answers that were already computed.`, A("best[a]", best, { [amount]: "ok" }), V({ coins }));
    return [best[amount], C.coinChange(coins, amount)];
  },

  "c-bits": f => {
    let n = 11, c = 0;
    const bits = x => x.toString(2).padStart(4, "0").split("");
    f(`popcount(11): count the 1 bits. 11 in binary is ${bits(11).join("")}.`, A("n in binary", bits(n)), V({ n, count: c }));
    while (n) {
      const before = bits(n);
      n &= n - 1;
      c++;
      const after = bits(n);
      f(`n & (n - 1) clears the lowest 1 bit: ${before.join("")} becomes ${after.join("")}. count = ${c}.`,
        A("n in binary", after, Object.fromEntries(before.map((b, i) => [i, b !== after[i] ? "cur" : ""]).filter(([, v]) => v))), V({ n, count: c }));
    }
    f("n is 0. The loop ran once per 1 bit, not once per bit.", A("n in binary", bits(0)), V({ n, count: c }));
    return [c, C.popcount(11)];
  },

  "c-lru-cache": f => {
    const ops = [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2], ["put", 4, 4], ["get", 1], ["get", 3], ["get", 4]];
    const c = new C.LRUCache(2), got = [];
    const order = () => { const o = []; for (let n = c.head.next; n !== c.tail; n = n.next) o.push(`${n.key}:${n.val}`); return o; };
    const snap = (note, hi = {}) => f(note, L("linked list, most recent first", order(), hi), KV("map: key → node", [...c.map.keys()].map(k => [k, "node"])));
    snap("Capacity 2. Empty.");
    for (const [op, k, v] of ops) {
      if (op === "put") {
        const evict = !c.map.has(k) && c.map.size === 2 ? order().at(-1) : null;
        c.put(k, v);
        snap(`put(${k}, ${v}): add at the front.${evict ? ` Over capacity, so evict the least recent (${evict}).` : ""}`, { 0: "cur" });
      } else {
        const r = c.get(k);
        got.push(r);
        snap(r === -1 ? `get(${k}): not in the map, return -1.` : `get(${k}) = ${r}. Move it to the front: it's now the most recent.`, r === -1 ? {} : { 0: "cur" });
      }
    }
    const r = new C.LRUCache(2), rg = [];
    for (const [op, k, v] of ops) op === "put" ? r.put(k, v) : rg.push(r.get(k));
    return [got, rg];
  },

  "c-token-bucket": f => {
    const at = [0, 0, 0, 0, 1000, 1000, 2500, 10000], log = [];
    let t = 0;
    const tb = new C.TokenBucket(3, 1, () => t);
    const snap = note => f(note, V({ clock: `${t / 1000}s`, tokens: Math.round(tb.tokens * 100) / 100 }),
      A("requests", log.map(([tt, ok]) => `${tt / 1000}s ${ok ? "ok" : "429"}`), Object.fromEntries(log.map(([, ok], i) => [i, ok ? "ok" : "bad"]))));
    snap("Holds up to 3 tokens, refills 1 per second. Starts full.");
    for (const x of at) {
      t = x;
      const ok = tb.tryTake();
      log.push([x, ok]);
      snap(`Request at ${x / 1000}s: refill for the time that passed (capped at 3), then ${ok ? "take a token" : "the bucket is empty, so reject with 429"}.`);
    }
    let t2 = 0;
    const r = new C.TokenBucket(3, 1, () => t2);
    return [log.map(x => x[1]), at.map(x => { t2 = x; return r.tryTake(); })];
  },

  // ---------------- Part 2: problems ----------------
  "p-two-sum": f => {
    const nums = [2, 11, 7, 15], target = 9, seen = new Map();
    let res = [];
    for (let i = 0; i < nums.length; i++) {
      const need = target - nums[i];
      if (seen.has(need)) {
        res = [seen.get(need), i];
        f(`Need ${target} - ${nums[i]} = ${need}. It's in the map at index ${seen.get(need)}. Answer [${res}].`, A("nums", nums, { [seen.get(need)]: "ok", [i]: "ok" }, ptrs({ i })), KV("seen: value → index", seen, need), V({ target, need }));
        break;
      }
      seen.set(nums[i], i);
      f(`Need ${target} - ${nums[i]} = ${need}. Not seen yet. Store ${nums[i]} → ${i}.`, A("nums", nums, { [i]: "cur" }, ptrs({ i })), KV("seen: value → index", seen, nums[i]), V({ target, need }));
    }
    return [res, P.twoSum(nums, target)];
  },

  "p-contains-duplicate": f => {
    const nums = [1, 2, 3, 1], seen = new Set();
    let res = false;
    for (let i = 0; i < nums.length; i++) {
      if (seen.has(nums[i])) {
        res = true;
        f(`${nums[i]} is already in the set. Duplicate: return true.`, A("nums", nums, { [i]: "cur" }, ptrs({ i })), A("seen (Set)", [...seen], { [[...seen].indexOf(nums[i])]: "ok" }));
        break;
      }
      seen.add(nums[i]);
      f(`${nums[i]} not seen before. Add it.`, A("nums", nums, { [i]: "cur" }, ptrs({ i })), A("seen (Set)", [...seen], { [seen.size - 1]: "cur" }));
    }
    return [res, P.containsDuplicate(nums)];
  },

  "p-valid-anagram": f => {
    const s = "anagram", t = "nagaram", count = new Map();
    let res = true;
    f("Same length (7). Count the letters of s.", A("s", [...s]), A("t", [...t]), KV("count", count));
    [...s].forEach((c, i) => { count.set(c, (count.get(c) ?? 0) + 1); f(`s[${i}] = "${c}": count up.`, A("s", [...s], { [i]: "cur" }), A("t", [...t]), KV("count", count, c)); });
    for (const [i, c] of [...t].entries()) {
      const left = (count.get(c) ?? 0) - 1;
      if (left < 0) { res = false; f(`"${c}" goes below 0: not an anagram.`, A("s", [...s]), A("t", [...t], { [i]: "bad" }), KV("count", count, c)); break; }
      count.set(c, left);
      f(`t[${i}] = "${c}": count down.`, A("s", [...s]), A("t", [...t], { ...range(0, i - 1, "ok"), [i]: "cur" }), KV("count", count, c));
    }
    if (res) f("Every count is back to 0, so it's an anagram.", A("s", [...s]), A("t", [...t], range(0, t.length - 1, "ok")), KV("count", count));
    return [res, P.isAnagram(s, t)];
  },

  "p-group-anagrams": f => {
    const strs = ["eat", "tea", "tan", "ate", "nat", "bat"], g = new Map();
    strs.forEach((w, i) => {
      const key = [...w].sort().join("");
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(w);
      f(`"${w}" sorted is "${key}". Add it to that group.`, A("words", strs, { [i]: "cur" }), KV("groups: sorted key → words", [...g].map(([k, v]) => [k, v.join(", ")]), key));
    });
    f("Each map value is one group.", A("words", strs, range(0, strs.length - 1, "ok")), KV("groups: sorted key → words", [...g].map(([k, v]) => [k, v.join(", ")])));
    const norm = x => x.map(a => [...a].sort().join(",")).sort();
    return [norm([...g.values()]), norm(P.groupAnagrams(strs))];
  },

  "p-majority-element": f => {
    const nums = [2, 2, 1, 1, 1, 2, 2];
    let cand = nums[0], votes = 0;
    nums.forEach((n, i) => {
      const was = votes;
      if (votes === 0) cand = n;
      votes += n === cand ? 1 : -1;
      f(`${was === 0 ? `Votes were 0, so ${n} becomes the candidate. ` : ""}${n} ${n === cand ? "matches: +1" : "differs: -1"}.`, A("nums", nums, { [i]: "cur" }, ptrs({ i })), V({ candidate: cand, votes }));
    });
    f(`The majority can't be cancelled out. Answer: ${cand}.`, A("nums", nums), V({ candidate: cand, votes }));
    return [cand, P.majorityElement(nums)];
  },

  "p-top-k-frequent": f => {
    const nums = [1, 1, 1, 2, 2, 3], k = 2, count = new Map(), out = [];
    nums.forEach((n, i) => { count.set(n, (count.get(n) ?? 0) + 1); f(`Count ${n}.`, A("nums", nums, { [i]: "cur" }), KV("count", count, n)); });
    const bucket = Array.from({ length: nums.length + 1 }, () => []);
    for (const [n, c] of count) bucket[c].push(n);
    f("Bucket by count: bucket[c] holds the numbers seen exactly c times.", A("bucket[count]", bucket), KV("count", count));
    for (let c = bucket.length - 1; c > 0 && out.length < k; c--) {
      if (!bucket[c].length) continue;
      out.push(...bucket[c]);
      f(`Walk from the highest count down. bucket[${c}] gives ${bucket[c].join(", ")}.`, A("bucket[count]", bucket, { [c]: "cur" }), A("output", out));
    }
    return [out.slice(0, k).sort(), P.topKFrequent(nums, k).sort()];
  },

  "p-valid-palindrome": f => {
    const s = "No 'x' in Nixon", ch = [...s], ok = c => /[a-z0-9]/i.test(c);
    let l = 0, r = s.length - 1, res = true;
    const snap = (note, cls) => f(note, A("s", ch, {
      ...Object.fromEntries(ch.map((c, i) => [i, ok(c) ? "" : "dim"]).filter(([, v]) => v)),
      ...range(0, l - 1, "ok"), ...range(r + 1, ch.length - 1, "ok"), [l]: cls, [r]: cls
    }, ptrs({ l, r })));
    while (l < r) {
      if (!ok(ch[l])) { snap(`"${ch[l]}" is not a letter or digit. Skip it.`, "cmp"); l++; continue; }
      if (!ok(ch[r])) { snap(`"${ch[r]}" is not a letter or digit. Skip it.`, "cmp"); r--; continue; }
      if (ch[l].toLowerCase() !== ch[r].toLowerCase()) { res = false; snap(`"${ch[l]}" and "${ch[r]}" differ. Not a palindrome.`, "bad"); break; }
      snap(`"${ch[l]}" and "${ch[r]}" match, ignoring case. Move both inward.`, "cur");
      l++;
      r--;
    }
    if (res) snap("The pointers met. It's a palindrome.", "ok");
    return [res, P.isPalindrome(s)];
  },

  "p-merge-sorted-array": f => {
    const a = [1, 2, 3, 0, 0, 0], b = [2, 5, 6];
    let i = 2, j = 2, w = 5;
    const snap = (note, cur = -1) => f(note,
      A("nums1", a, { ...range(w + 1, a.length - 1, "ok"), ...(cur >= 0 ? { [cur]: "cur" } : {}) }, ptrs({ last: i, w })),
      A("nums2", b, range(j + 1, b.length - 1, "dim"), ptrs({ last: j })));
    snap("Fill nums1 from the back, so nothing we still need gets overwritten. last marks the biggest unused number in each list; write marks the slot to fill.");
    while (j >= 0) {
      const fromA = i >= 0 && a[i] > b[j], val = fromA ? a[i] : b[j];
      if (fromA) a[w--] = a[i--];
      else a[w--] = b[j--];
      snap(`The larger of the two back values is ${val} (from ${fromA ? "nums1" : "nums2"}). Write it at index ${w + 1}.`, w + 1);
    }
    snap("nums2 is used up. What's left of nums1 is already in place.");
    const x = [1, 2, 3, 0, 0, 0];
    P.merge(x, 3, [2, 5, 6], 3);
    return [a, x];
  },

  "p-move-zeroes": f => {
    const a = [0, 1, 0, 3, 12];
    let w = 0;
    f("Two fingers. read walks every slot. write marks where the next non-zero number goes.", A("nums", a, {}, ptrs({ w, r: 0 })));
    for (let r = 0; r < a.length; r++) {
      if (a[r] !== 0) {
        [a[w], a[r]] = [a[r], a[w]];
        w++;
        f(`read found ${a[w - 1]} (not zero): swap it into slot ${w - 1}, then write moves to slot ${w}.`, A("nums", a, { ...range(0, w - 1, "ok"), [r]: "cur" }, ptrs({ w, r })));
      } else f(`read is on slot ${r}, which holds 0. Skip it; write stays on slot ${w}.`, A("nums", a, { ...range(0, w - 1, "ok"), [r]: "dim" }, ptrs({ w, r })));
    }
    const x = [0, 1, 0, 3, 12];
    P.moveZeroes(x);
    return [a, x];
  },

  "p-remove-duplicates": f => {
    const a = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4];
    let w = 1;
    f("Sorted, so duplicates sit next to each other. Keep the first value. write marks the next slot to fill; read walks the list.", A("nums", a, { 0: "ok" }, ptrs({ w })));
    for (let r = 1; r < a.length; r++) {
      if (a[r] !== a[w - 1]) { a[w++] = a[r]; f(`read found ${a[r]}, different from the last kept value. Copy it to slot ${w - 1}; write moves on.`, A("nums", a, { ...range(0, w - 1, "ok"), [r]: "cur" }, ptrs({ w, r }))); }
      else f(`read found ${a[r]}, same as the last kept value. Skip it.`, A("nums", a, { ...range(0, w - 1, "ok"), [r]: "dim" }, ptrs({ w, r })));
    }
    f(`k = ${w}. The first ${w} slots hold the answer.`, A("nums", a, range(0, w - 1, "ok")));
    const x = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4], k = P.removeDuplicates(x);
    return [[w, a.slice(0, w)], [k, x.slice(0, k)]];
  },

  "p-best-time-stock": f => {
    const p = [7, 1, 5, 3, 6, 4];
    let min = Infinity, best = 0, mi = -1, bs = -1, bi = -1;
    p.forEach((x, i) => {
      if (x < min) { min = x; mi = i; }
      if (x - min > best) { best = x - min; bs = mi; bi = i; }
      f(`Day ${i}, price ${x}. Cheapest so far is ${min}. Selling today earns ${x - min}.`, A("prices", p, { [mi]: "ok", [i]: "cur" }, ptrs({ buy: mi, today: i })), V({ min, best }));
    });
    f(`Best: buy at ${p[bs]}, sell at ${p[bi]}, profit ${best}.`, A("prices", p, { [bs]: "ok", [bi]: "ok" }, ptrs({ buy: bs, sell: bi })), V({ min, best }));
    return [best, P.maxProfit(p)];
  },

  "p-longest-substring": f => {
    const s = "abcabcbb", ch = [...s], last = new Map();
    let start = 0, best = 0;
    for (let i = 0; i < s.length; i++) {
      const prev = last.get(s[i]);
      let note = `"${s[i]}" is new to the window.`;
      if (prev !== undefined && prev >= start) { start = prev + 1; note = `"${s[i]}" was last seen at ${prev}, inside the window. Move start to ${start}.`; }
      last.set(s[i], i);
      best = Math.max(best, i - start + 1);
      f(`${note} Window length ${i - start + 1}, best ${best}.`, A("s", ch, { ...range(start, i, "cmp"), [i]: "cur" }, ptrs({ start, i })), KV("last seen index", last, s[i]));
    }
    return [best, P.lengthOfLongestSubstring(s)];
  },

  "p-valid-parentheses": f => {
    const s = "{[()]}(", pairs = { ")": "(", "]": "[", "}": "{" }, st = [];
    let res = true;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c in pairs) {
        const top = st.pop();
        if (top !== pairs[c]) { res = false; f(`"${c}" doesn't match "${top}". Not valid.`, A("s", [...s], { [i]: "bad" }), A("stack", st)); break; }
        f(`"${c}" closes "${top}". Pop it.`, A("s", [...s], { ...range(0, i - 1, "ok"), [i]: "cur" }), A("stack", st));
      } else {
        st.push(c);
        f(`"${c}" opens. Push it.`, A("s", [...s], { ...range(0, i - 1, "ok"), [i]: "cur" }), A("stack", st, { [st.length - 1]: "cur" }));
      }
    }
    if (res && st.length) { res = false; f(`End of the string, but "${st.at(-1)}" is still open. Not valid.`, A("s", [...s]), A("stack", st, { [st.length - 1]: "bad" })); }
    return [res, P.isValid(s)];
  },

  "p-min-stack": f => {
    const s = new P.MinStack(), out = [];
    const snap = (note, hi = {}) => f(note, A("items", s.items, hi), A("mins (smallest up to here)", s.mins, hi));
    snap("Two stacks. mins[i] is the smallest of items[0..i].");
    for (const [op, x] of [["push", -2], ["push", 0], ["push", -3], ["getMin"], ["pop"], ["top"], ["getMin"]]) {
      if (op === "push") { s.push(x); snap(`push(${x}). mins gets the smaller of ${x} and the previous min: ${s.getMin()}.`, { [s.items.length - 1]: "cur" }); }
      else if (op === "pop") { s.pop(); snap("pop() removes the top of both stacks. The old min is back for free."); }
      else { const v = op === "top" ? s.top() : s.getMin(); out.push(v); snap(`${op}() = ${v}: read the top. O(1).`, { [s.items.length - 1]: "ok" }); }
    }
    return [out, [-3, 0, -2]];
  },

  "p-binary-search": f => {
    const a = [-1, 0, 3, 5, 9, 12], x = 9;
    let lo = 0, hi = a.length - 1, res = -1;
    const snap = (note, m = -1, cls = "cur") => f(note,
      A("nums", a, { ...range(0, lo - 1, "dim"), ...range(hi + 1, a.length - 1, "dim"), ...(m >= 0 ? { [m]: cls } : {}) }, ptrs({ lo, mid: m >= 0 ? m : null, hi })), V({ low: lo, high: hi, target: x }));
    snap(`Find ${x}. The window is the whole array.`);
    while (lo <= hi) {
      const m = lo + Math.floor((hi - lo) / 2);
      if (a[m] === x) { res = m; snap(`a[${m}] = ${x}. Found.`, m, "ok"); break; }
      if (a[m] < x) { snap(`a[${m}] = ${a[m]} < ${x}. Drop the left half: lo = ${m + 1}.`, m); lo = m + 1; }
      else { snap(`a[${m}] = ${a[m]} > ${x}. Drop the right half: hi = ${m - 1}.`, m); hi = m - 1; }
    }
    return [res, P.search(a, x)];
  },

  "p-search-insert": f => {
    const a = [1, 3, 5, 6], x = 2;
    let lo = 0, hi = a.length;
    const snap = (note, m = -1) => f(note, A("nums", a, { ...range(0, lo - 1, "dim"), ...range(hi, a.length - 1, "dim"), ...(m >= 0 ? { [m]: "cur" } : {}) }, ptrs({ lo, mid: m >= 0 ? m : null, hi: hi < a.length ? hi : null })), V({ low: lo, high: hi, target: x }));
    snap(`Find the first spot holding ${x} or more. Two fingers, low and high, mark the part still possible.`);
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (a[m] < x) { snap(`nums[${m}] = ${a[m]} < ${x}: the answer is right of mid. lo = ${m + 1}.`, m); lo = m + 1; }
      else { snap(`nums[${m}] = ${a[m]} >= ${x}: mid could be the answer. hi = ${m}.`, m); hi = m; }
    }
    snap(`low and high met at index ${lo}. Insert ${x} there.`);
    return [lo, P.searchInsert(a, x)];
  },

  "p-reverse-list": f => {
    const vals = [1, 2, 3, 4, 5];
    let head = P.list(vals), prev = null;
    const snap = note => f(note, L("reversed so far (prev)", P.arr(prev), { 0: "cur" }), L("still to do (head)", P.arr(head)));
    snap("prev = null, head = 1.");
    while (head) {
      const next = head.next;
      head.next = prev;
      prev = head;
      head = next;
      snap(`Save next, point ${prev.val} back at the reversed part, move both forward.`);
    }
    snap("head is null. prev is the new head.");
    return [P.arr(prev), P.arr(P.reverseList(P.list(vals)))];
  },

  "p-merge-two-lists": f => {
    let a = P.list([1, 2, 4]), b = P.list([1, 3, 4]);
    const dummy = new P.ListNode(0);
    let tail = dummy;
    const upto = () => { const o = []; for (let n = dummy.next; n; n = n.next) { o.push(n.val); if (n === tail) break; } return o; };
    const snap = note => { const m = upto(); f(note, L("a", P.arr(a), { 0: "cmp" }), L("b", P.arr(b), { 0: "cmp" }), L("merged (after the dummy head)", m, { [m.length - 1]: "cur" })); };
    snap("A dummy head means the first node is not a special case.");
    while (a && b) {
      const fromA = a.val <= b.val;
      if (fromA) { tail.next = a; a = a.next; } else { tail.next = b; b = b.next; }
      tail = tail.next;
      snap(`Compare the fronts. ${tail.val} from ${fromA ? "a" : "b"} is smaller${fromA && b && tail.val === b.val ? " (ties take a)" : ""}. Attach it.`);
    }
    tail.next = a ?? b;
    const m = P.arr(dummy.next);
    f("One list is empty. Attach the rest of the other in one step.", L("a", P.arr(a)), L("b", P.arr(b)), L("merged", m, range(0, m.length - 1, "ok")));
    return [m, P.arr(P.mergeTwoLists(P.list([1, 2, 4]), P.list([1, 3, 4])))];
  },

  "p-linked-list-cycle": f => {
    const make = () => { const h = P.list([3, 2, 0, -4]); let t = h; while (t.next) t = t.next; t.next = h.next; return h; };
    const h = make(), nodes = [];
    for (let n = h; n && !nodes.includes(n); n = n.next) nodes.push(n);
    let slow = h, fast = h, res = false;
    const snap = (note, cls = "cur") => {
      const si = nodes.indexOf(slow), fi = nodes.indexOf(fast);
      f(note, L("list (the last node points back to index 1)", nodes.map(n => n.val), { [si]: cls, [fi]: cls }, ptrs({ slow: si, fast: fi }), 1));
    };
    snap("slow and fast both start at the head.");
    while (fast && fast.next) {
      slow = slow.next;
      fast = fast.next.next;
      if (slow === fast) { res = true; snap("They meet. There is a cycle.", "ok"); break; }
      snap("slow moves 1 step, fast moves 2.");
    }
    return [res, P.hasCycle(make())];
  },

  "p-max-depth": f => {
    const root = P.tree([3, 9, 20, null, null, 15, 7]), hi = new Map(), sub = new Map();
    const label = "tree (number under a node = its depth)";
    const go = n => {
      if (!n) return 0;
      hi.set(n, "cur");
      f(`Visit ${n.val}: ask both children for their depth.`, TREE(label, root, new Map(hi), new Map(sub)));
      hi.set(n, "cmp");
      const d = 1 + Math.max(go(n.left), go(n.right));
      sub.set(n, d);
      hi.set(n, "ok");
      f(`${n.val} returns 1 + the larger child depth = ${d}.`, TREE(label, root, new Map(hi), new Map(sub)));
      return d;
    };
    const d = go(root);
    return [d, P.maxDepth(P.tree([3, 9, 20, null, null, 15, 7]))];
  },

  "p-invert-tree": f => {
    const root = P.tree([4, 2, 7, 1, 3, 6, 9]);
    f("Mirror the tree by swapping every node's left and right child.", TREE("tree", root));
    const go = n => {
      if (!n) return null;
      const r = go(n.right), l = go(n.left);
      [n.left, n.right] = [r, l];
      if (l || r) f(`Both subtrees of ${n.val} are done. Swap its children.`, TREE("tree", root, new Map([[n, "cur"]])));
      return n;
    };
    go(root);
    return [P.levelOrder(root), P.levelOrder(P.invertTree(P.tree([4, 2, 7, 1, 3, 6, 9])))];
  },

  "p-level-order": f => {
    const root = P.tree([3, 9, 20, null, null, 15, 7]), out = [], done = new Map();
    let level = [root];
    while (level.length) {
      out.push(level.map(n => n.val));
      const hi = new Map(done);
      level.forEach(n => hi.set(n, "cur"));
      f(`Level ${out.length}: ${level.map(n => n.val).join(", ")}. Collect their children for the next level.`, TREE("tree", root, hi), A("output", out.map(l => `[${l}]`)));
      level.forEach(n => done.set(n, "ok"));
      const next = [];
      for (const n of level) { if (n.left) next.push(n.left); if (n.right) next.push(n.right); }
      level = next;
    }
    return [out, P.levelOrder(P.tree([3, 9, 20, null, null, 15, 7]))];
  },

  "p-number-of-islands": f => {
    const src = [["1", "1", "0", "0", "0"], ["1", "1", "0", "0", "0"], ["0", "0", "1", "0", "0"], ["0", "0", "0", "1", "1"]];
    const g = src.map(r => [...r]), shown = src.map(r => [...r]), names = "ABCDEFG";
    let islands = 0;
    const snap = (note, at) => {
      const hi = {};
      shown.forEach((row, r) => row.forEach((v, c) => (hi[`${r},${c}`] = v === "0" ? "dim" : v === "1" ? "" : "ok")));
      if (at) hi[`${at[0]},${at[1]}`] = "cur";
      f(note, { t: "grid", label: "grid (letters = land already counted)", cells: shown.map(r => [...r]), hi }, V({ islands }));
    };
    snap("Scan every cell. 1 is land, 0 is water.");
    for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) {
      if (g[r][c] !== "1") continue;
      const name = names[islands++], stack = [[r, c]];
      g[r][c] = "0";
      shown[r][c] = name;
      snap(`Unvisited land at (${r},${c}). New island ${name}. Flood fill from here.`, [r, c]);
      while (stack.length) {
        const [y, x] = stack.pop();
        for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < g.length && nx >= 0 && nx < g[0].length && g[ny][nx] === "1") {
            g[ny][nx] = "0";
            shown[ny][nx] = name;
            stack.push([ny, nx]);
            snap(`(${ny},${nx}) touches island ${name}. Mark it so it's never counted again.`, [ny, nx]);
          }
        }
      }
    }
    snap(`Scan finished: ${islands} islands.`);
    return [islands, P.numIslands(src.map(r => [...r]))];
  },

  "p-merge-intervals": f => {
    const iv = [[1, 3], [2, 6], [8, 10], [15, 18]], sorted = [...iv].sort((a, b) => a[0] - b[0]), out = [];
    f("Sort by start.", B("input, sorted by start", sorted), B("merged", out));
    sorted.forEach(([s, e], i) => {
      const last = out.at(-1);
      if (last && s <= last[1]) {
        const end = last[1];
        last[1] = Math.max(last[1], e);
        f(`[${s},${e}] starts before the last merged interval ends (${end}). Extend it to [${last}].`, B("input, sorted by start", sorted, { [i]: "cur" }), B("merged", out, { [out.length - 1]: "ok" }));
      } else {
        out.push([s, e]);
        f(`[${s},${e}] doesn't overlap. Start a new interval.`, B("input, sorted by start", sorted, { [i]: "cur" }), B("merged", out, { [out.length - 1]: "ok" }));
      }
    });
    return [out, P.mergeIntervals(iv)];
  },

  "p-climbing-stairs": f => {
    const n = 5, ways = [1, 1];
    const pad = () => ways.concat(Array(n + 1 - ways.length).fill(""));
    f("ways[0] = 1 and ways[1] = 1.", A("ways[step]", pad(), { 0: "ok", 1: "ok" }));
    for (let i = 2; i <= n; i++) {
      ways[i] = ways[i - 1] + ways[i - 2];
      f(`The last move was 1 or 2 steps, so ways[${i}] = ways[${i - 1}] + ways[${i - 2}] = ${ways[i - 1]} + ${ways[i - 2]} = ${ways[i]}.`, A("ways[step]", pad(), { [i - 2]: "cmp", [i - 1]: "cmp", [i]: "cur" }));
    }
    f("Only the last two values are ever used, so the real code keeps just two variables.", A("ways[step]", pad(), { [n]: "ok" }));
    return [ways[n], P.climbStairs(n)];
  },

  "p-max-subarray": f => {
    const a = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
    let cur = a[0], best = a[0], cs = 0, bs = 0, be = 0;
    f(`Start: cur = best = ${a[0]}.`, A("nums", a, { 0: "cur" }), V({ cur, best }));
    for (let i = 1; i < a.length; i++) {
      let note;
      if (a[i] > cur + a[i]) { cur = a[i]; cs = i; note = `The running sum was negative, so drop it and start fresh at ${a[i]}.`; }
      else { cur += a[i]; note = `Extend the run: cur = ${cur}.`; }
      if (cur > best) { best = cur; bs = cs; be = i; note += ` New best: ${best}.`; }
      f(note, A("nums", a, { ...range(cs, i, "cmp"), [i]: "cur" }), V({ cur, best }));
    }
    f(`The best run is [${a.slice(bs, be + 1).join(", ")}] with sum ${best}.`, A("nums", a, range(bs, be, "ok")), V({ cur, best }));
    return [best, P.maxSubArray(a)];
  },

  "p-longest-common-prefix": f => {
    const strs = ["flower", "flow", "flight"], W = Math.max(...strs.map(s => s.length)), cells = strs.map(s => [...s.padEnd(W, " ")]);
    let res = strs[0];
    const hiCol = (c, cls) => {
      const h = {};
      strs.forEach((_, r) => { for (let k = 0; k < c; k++) h[`${r},${k}`] = "ok"; h[`${r},${c}`] = cls; });
      return h;
    };
    outer: for (let i = 0; i < strs[0].length; i++) {
      for (const s of strs) if (i >= s.length || s[i] !== strs[0][i]) {
        res = strs[0].slice(0, i);
        f(`Column ${i}: mismatch. The prefix is "${res}".`, { t: "grid", label: "one row per string", cells, hi: hiCol(i, "bad") });
        break outer;
      }
      f(`Column ${i}: every string has "${strs[0][i]}".`, { t: "grid", label: "one row per string", cells, hi: hiCol(i, "cur") });
    }
    return [res, P.longestCommonPrefix(strs)];
  }
};
