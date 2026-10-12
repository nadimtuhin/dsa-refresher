// Part 1: data structures and algorithms. Tested implementations + content.
// #region hash-map
class HashMap {
  buckets;
  size = 0;
  constructor(capacity = 8) {
    this.buckets = Array.from({ length: capacity }, () => []);
  }
  index(key, cap = this.buckets.length) {
    let h = 2166136261; // FNV-1a: mix every char into the hash
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % cap;
  }
  set(key, value) {
    const bucket = this.buckets[this.index(key)];
    const hit = bucket.find(e => e[0] === key);
    if (hit) {
      hit[1] = value;
      return;
    }
    bucket.push([key, value]);
    if (++this.size / this.buckets.length > 0.75) this.resize(); // keep chains short
  }
  get(key) {
    return this.buckets[this.index(key)].find(e => e[0] === key)?.[1];
  }
  delete(key) {
    const bucket = this.buckets[this.index(key)];
    const i = bucket.findIndex(e => e[0] === key);
    if (i < 0) return false;
    bucket.splice(i, 1);
    this.size--;
    return true;
  }
  resize() {
    const old = this.buckets.flat();
    this.buckets = Array.from({ length: this.buckets.length * 2 }, () => []);
    for (const [k, v] of old) this.buckets[this.index(k)].push([k, v]); // rehash everything
  }
  get capacity() {
    return this.buckets.length;
  }
}
// #endregion
// #region queue
class Queue {
  items = [];
  head = 0; // index of the front; avoids O(n) shift()
  enqueue(x) {
    this.items.push(x);
  }
  dequeue() {
    if (this.head === this.items.length) return undefined;
    const x = this.items[this.head++];
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      // reclaim memory now and then
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return x;
  }
  peek() {
    return this.items[this.head];
  }
  get size() {
    return this.items.length - this.head;
  }
}
// Stack needs no class: push() and pop() on an array are both O(1).
// #endregion
// #region min-heap
class MinHeap {
  cmp;
  a = [];
  constructor(cmp) {
    this.cmp = cmp;
  }
  get size() {
    return this.a.length;
  }
  peek() {
    return this.a[0];
  }
  push(x) {
    this.a.push(x);
    let i = this.a.length - 1;
    while (i > 0) {
      // sift up: swap with parent while smaller
      const p = (i - 1) >> 1;
      if (this.cmp(this.a[i], this.a[p]) >= 0) break;
      [this.a[i], this.a[p]] = [this.a[p], this.a[i]];
      i = p;
    }
  }
  pop() {
    if (this.a.length === 0) return undefined;
    const top = this.a[0],
      last = this.a.pop();
    if (this.a.length) {
      this.a[0] = last;
      let i = 0;
      const n = this.a.length;
      while (true) {
        // sift down: swap with the smaller child
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < n && this.cmp(this.a[l], this.a[m]) < 0) m = l;
        if (r < n && this.cmp(this.a[r], this.a[m]) < 0) m = r;
        if (m === i) break;
        [this.a[i], this.a[m]] = [this.a[m], this.a[i]];
        i = m;
      }
    }
    return top;
  }
}
// Max heap: new MinHeap((a, b) => b - a)
// #endregion
// #region traversals
const node = (val, left = null, right = null) => ({ val, left, right });
function preorder(n, out = []) {
  if (n) {
    out.push(n.val);
    preorder(n.left, out);
    preorder(n.right, out);
  }
  return out;
}
function inorder(n, out = []) {
  if (n) {
    inorder(n.left, out);
    out.push(n.val);
    inorder(n.right, out);
  }
  return out;
}
function postorder(n, out = []) {
  if (n) {
    postorder(n.left, out);
    postorder(n.right, out);
    out.push(n.val);
  }
  return out;
}
function inorderIterative(root) {
  const out = [],
    stack = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) {
      stack.push(cur);
      cur = cur.left;
    } // go all the way left
    cur = stack.pop();
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}
// #endregion
// #region bst
class BST {
  root = null;
  insert(v) {
    if (!this.root) {
      this.root = node(v);
      return;
    }
    let n = this.root;
    while (true) {
      if (v === n.val) return; // no duplicates
      const side = v < n.val ? "left" : "right";
      if (!n[side]) {
        n[side] = node(v);
        return;
      }
      n = n[side];
    }
  }
  has(v) {
    let n = this.root;
    while (n) {
      if (v === n.val) return true;
      n = v < n.val ? n.left : n.right;
    }
    return false;
  }
  delete(v) {
    this.root = del(this.root, v);
  }
}
function del(n, v) {
  if (!n) return null;
  if (v < n.val) n.left = del(n.left, v);
  else if (v > n.val) n.right = del(n.right, v);
  else {
    if (!n.left) return n.right; // 0 or 1 child: lift the child
    if (!n.right) return n.left;
    let s = n.right;
    while (s.left) s = s.left; // 2 children: copy in-order successor
    n.val = s.val;
    n.right = del(n.right, s.val);
  }
  return n;
}
function isValidBST(n, lo = -Infinity, hi = Infinity) {
  if (!n) return true;
  if (n.val <= lo || n.val >= hi) return false; // every node must fit its ancestors' range
  return isValidBST(n.left, lo, n.val) && isValidBST(n.right, n.val, hi);
}
// #endregion
// #region trie
class Trie {
  root = { kids: new Map(), end: false };
  insert(word) {
    let n = this.root;
    for (const c of word) {
      if (!n.kids.has(c)) n.kids.set(c, { kids: new Map(), end: false });
      n = n.kids.get(c);
    }
    n.end = true;
  }
  walk(s) {
    let n = this.root;
    for (const c of s) {
      n = n.kids.get(c);
      if (!n) return null;
    }
    return n;
  }
  search(word) {
    return this.walk(word)?.end === true;
  }
  startsWith(prefix) {
    return this.walk(prefix) !== null;
  }
  autocomplete(prefix, limit = 5) {
    const start = this.walk(prefix),
      out = [];
    const dfs = (n, path) => {
      if (out.length >= limit) return;
      if (n.end) out.push(path);
      for (const c of [...n.kids.keys()].sort()) dfs(n.kids.get(c), path + c);
    };
    if (start) dfs(start, prefix);
    return out;
  }
}
// #endregion
// #region graph
function buildGraph(n, edges, directed = false) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    if (!directed) adj[b].push(a);
  }
  return adj;
}
function bfsDistances(adj, src) {
  const dist = new Array(adj.length).fill(-1);
  dist[src] = 0;
  const q = [src];
  for (let h = 0; h < q.length; h++) {
    // head index = O(1) dequeue
    const u = q[h];
    for (const v of adj[u])
      if (dist[v] === -1) {
        dist[v] = dist[u] + 1;
        q.push(v);
      }
  }
  return dist; // -1 = unreachable
}
function dfsOrder(adj, src) {
  const seen = new Set(),
    out = [];
  const go = u => {
    seen.add(u);
    out.push(u);
    for (const v of adj[u]) if (!seen.has(v)) go(v);
  };
  go(src);
  return out;
}
function countComponents(n, edges) {
  const adj = buildGraph(n, edges),
    seen = new Array(n).fill(false);
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    count++;
    const stack = [s];
    seen[s] = true;
    while (stack.length)
      for (const v of adj[stack.pop()])
        if (!seen[v]) {
          seen[v] = true;
          stack.push(v);
        }
  }
  return count;
}
// #endregion
// #region topo-sort
// edges [a, b] mean "a must happen before b". Returns an order, or null if there's a cycle.
function topoSort(n, edges) {
  const adj = buildGraph(n, edges, true),
    indegree = new Array(n).fill(0);
  for (const [, b] of edges) indegree[b]++;
  const ready = []; // nothing left blocking these
  for (let i = 0; i < n; i++) if (indegree[i] === 0) ready.push(i);
  const order = [];
  for (let h = 0; h < ready.length; h++) {
    const u = ready[h];
    order.push(u);
    for (const v of adj[u]) if (--indegree[v] === 0) ready.push(v);
  }
  return order.length === n ? order : null; // leftovers = stuck in a cycle
}
// #endregion
// #region dijkstra
// edges [u, v, w]: directed, non-negative weights. Returns shortest distance to every node.
function dijkstra(n, edges, src) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]);
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  const pq = new MinHeap((a, b) => a[0] - b[0]); // [distance, node]
  pq.push([0, src]);
  while (pq.size) {
    const [d, u] = pq.pop();
    if (d > dist[u]) continue; // stale entry, already found shorter
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        pq.push([dist[v], v]);
      }
    }
  }
  return dist;
}
// #endregion
// #region union-find
class UnionFind {
  parent;
  rank;
  count; // number of separate groups
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
    this.count = n;
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // path halving: flatten as we climb
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a),
      rb = this.find(b);
    if (ra === rb) return false; // already together (in a graph: a cycle)
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra; // hang the shorter tree under the taller
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    this.count--;
    return true;
  }
}
// #endregion
// #region merge-sort
function mergeSort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const l = mergeSort(a.slice(0, mid)),
    r = mergeSort(a.slice(mid));
  const out = [];
  let i = 0,
    j = 0;
  while (i < l.length && j < r.length) out.push(l[i] <= r[j] ? l[i++] : r[j++]); // <= keeps it stable
  return out.concat(l.slice(i), r.slice(j));
}
// #endregion
// #region quick-sort
function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const mid = lo + ((hi - lo) >> 1);
  [a[mid], a[hi]] = [a[hi], a[mid]]; // middle pivot dodges sorted-input worst case
  const pivot = a[hi];
  let i = lo; // everything left of i is < pivot
  for (let j = lo; j < hi; j++)
    if (a[j] < pivot) {
      [a[i], a[j]] = [a[j], a[i]];
      i++;
    }
  [a[i], a[hi]] = [a[hi], a[i]]; // pivot lands in its final spot
  quickSort(a, lo, i - 1);
  quickSort(a, i + 1, hi);
  return a;
}
// #endregion
// #region binary-search
// first index with a[i] >= x (where x would be inserted)
function lowerBound(a, x) {
  let lo = 0,
    hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
// first index with a[i] > x
function upperBound(a, x) {
  let lo = 0,
    hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] <= x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
// "Search on the answer": smallest truck capacity that ships all packages, in order, within `days`
function shipWithinDays(weights, days) {
  const fits = cap => {
    let used = 1,
      load = 0;
    for (const w of weights) {
      if (load + w > cap) {
        used++;
        load = 0;
      }
      load += w;
    }
    return used <= days;
  };
  let lo = Math.max(...weights),
    hi = weights.reduce((s, w) => s + w, 0);
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (fits(m)) hi = m;
    else lo = m + 1;
  }
  return lo;
}
// #endregion
// #region backtracking
function subsets(nums) {
  const out = [],
    path = [];
  const go = i => {
    if (i === nums.length) {
      out.push([...path]);
      return;
    }
    go(i + 1); // skip nums[i]
    path.push(nums[i]);
    go(i + 1);
    path.pop(); // take nums[i], then undo
  };
  go(0);
  return out;
}
function permutations(nums) {
  const out = [],
    path = [],
    used = new Array(nums.length).fill(false);
  const go = () => {
    if (path.length === nums.length) {
      out.push([...path]);
      return;
    }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      path.push(nums[i]); // choose
      go(); // explore
      path.pop();
      used[i] = false; // un-choose
    }
  };
  go();
  return out;
}
// #endregion
// #region dp
// Fewest coins to make `amount`, or -1. Unlimited coins of each type.
function coinChange(coins, amount) {
  const best = new Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins) if (c <= a) best[a] = Math.min(best[a], best[a - c] + 1);
  return best[amount] === Infinity ? -1 : best[amount];
}
// Longest common subsequence length (the idea behind diff tools)
function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}
// 0/1 knapsack: each item once, max value within capacity. 1D table, loop capacity backwards.
function knapsack(weights, values, cap) {
  const dp = new Array(cap + 1).fill(0);
  for (let i = 0; i < weights.length; i++)
    for (let c = cap; c >= weights[i]; c--) dp[c] = Math.max(dp[c], dp[c - weights[i]] + values[i]);
  return dp[cap];
}
// #endregion
// #region bits
const isPowerOfTwo = n => n > 0 && (n & (n - 1)) === 0; // one bit set
function popcount(n) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
} // drop lowest bit
const singleNumber = nums => nums.reduce((x, n) => x ^ n, 0); // pairs cancel: a ^ a = 0
// Flags: const READ = 1, WRITE = 2, ADMIN = 4; perms |= WRITE; (perms & ADMIN) !== 0
// #endregion
// #region lru-cache
class LRUCache {
  capacity;
  map = new Map();
  head = { key: 0, val: 0, prev: null, next: null }; // most recent side
  tail = { key: 0, val: 0, prev: null, next: null }; // least recent side
  constructor(capacity) {
    this.capacity = capacity;
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  unlink(n) {
    n.prev.next = n.next;
    n.next.prev = n.prev;
  }
  addFront(n) {
    n.next = this.head.next;
    n.prev = this.head;
    this.head.next.prev = n;
    this.head.next = n;
  }
  get(key) {
    const n = this.map.get(key);
    if (!n) return -1;
    this.unlink(n);
    this.addFront(n); // touched = most recent
    return n.val;
  }
  put(key, val) {
    const hit = this.map.get(key);
    if (hit) {
      hit.val = val;
      this.unlink(hit);
      this.addFront(hit);
      return;
    }
    const n = { key, val, prev: null, next: null };
    this.map.set(key, n);
    this.addFront(n);
    if (this.map.size > this.capacity) {
      // evict least recently used
      const lru = this.tail.prev;
      this.unlink(lru);
      this.map.delete(lru.key);
    }
  }
}
// #endregion
// #region token-bucket
// Allows bursts up to `capacity`, refills at `ratePerSec`. `now` is injectable so it's testable.
class TokenBucket {
  capacity;
  ratePerSec;
  now;
  tokens;
  last;
  constructor(capacity, ratePerSec, now = Date.now) {
    this.capacity = capacity;
    this.ratePerSec = ratePerSec;
    this.now = now;
    this.tokens = capacity;
    this.last = now();
  }
  tryTake(cost = 1) {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.ratePerSec);
    this.last = t;
    if (this.tokens < cost) return false; // caller returns HTTP 429
    this.tokens -= cost;
    return true;
  }
}
// #endregion
export {
  HashMap,
  Queue,
  MinHeap,
  BST,
  Trie,
  UnionFind,
  LRUCache,
  TokenBucket,
  node,
  preorder,
  inorder,
  postorder,
  inorderIterative,
  isValidBST,
  buildGraph,
  bfsDistances,
  dfsOrder,
  countComponents,
  topoSort,
  dijkstra,
  mergeSort,
  quickSort,
  lowerBound,
  upperBound,
  shipWithinDays,
  subsets,
  permutations,
  coinChange,
  lcs,
  knapsack,
  isPowerOfTwo,
  popcount,
  singleNumber
};
// ---------- tests: [actual, expected] ----------
const sorted = xs => xs.map(x => x.join(",")).sort();
const bstOf = vals => {
  const t = new BST();
  vals.forEach(v => t.insert(v));
  return t;
};
export const tests = {
  "hash-map": () => {
    const m = new HashMap(4);
    for (let i = 0; i < 100; i++) m.set("k" + i, i);
    m.set("k5", 500);
    const deleted = m.delete("k7");
    return [
      [m.get("k42"), 42],
      [m.get("k5"), 500],
      [deleted, true],
      [m.get("k7"), undefined],
      [m.delete("nope"), false],
      [m.size, 99],
      [m.capacity >= 128, true]
    ];
  },
  queue: () => {
    const q = new Queue();
    for (let i = 0; i < 5000; i++) q.enqueue(i);
    let ok = true;
    for (let i = 0; i < 4000; i++) if (q.dequeue() !== i) ok = false;
    return [
      [ok, true],
      [q.size, 1000],
      [q.peek(), 4000],
      [new Queue().dequeue(), undefined]
    ];
  },
  "min-heap": () => {
    const h = new MinHeap((a, b) => a - b);
    [5, 3, 8, 1, 9, 2, 2, 7].forEach(x => h.push(x));
    const out = [];
    while (h.size) out.push(h.pop());
    const mx = new MinHeap((a, b) => b - a);
    [1, 5, 3].forEach(x => mx.push(x));
    return [
      [out, [1, 2, 2, 3, 5, 7, 8, 9]],
      [mx.pop(), 5],
      [h.pop(), undefined]
    ];
  },
  traversals: () => {
    const r = bstOf([4, 2, 6, 1, 3, 5, 7]).root;
    return [
      [preorder(r), [4, 2, 1, 3, 6, 5, 7]],
      [inorder(r), [1, 2, 3, 4, 5, 6, 7]],
      [postorder(r), [1, 3, 2, 5, 7, 6, 4]],
      [inorderIterative(r), [1, 2, 3, 4, 5, 6, 7]],
      [inorderIterative(null), []]
    ];
  },
  bst: () => {
    const t = bstOf([50, 30, 70, 20, 40, 60, 80]);
    const before = [t.has(40), t.has(45)];
    t.delete(20);
    t.delete(30);
    t.delete(50); // leaf, one child, two children
    const bad = node(5, node(1), node(4, node(3), node(6)));
    return [
      [before, [true, false]],
      [inorder(t.root), [40, 60, 70, 80]],
      [isValidBST(t.root), true],
      [isValidBST(bad), false],
      [t.has(50), false]
    ];
  },
  trie: () => {
    const t = new Trie();
    ["car", "card", "care", "cart", "cat", "dog"].forEach(w => t.insert(w));
    return [
      [t.search("car"), true],
      [t.search("ca"), false],
      [t.startsWith("ca"), true],
      [t.startsWith("x"), false],
      [t.autocomplete("car", 3), ["car", "card", "care"]],
      [t.autocomplete("z"), []]
    ];
  },
  graph: () => {
    const adj = buildGraph(6, [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 4]
    ]);
    return [
      [bfsDistances(adj, 0), [0, 1, 1, 2, 3, -1]],
      [dfsOrder(adj, 0), [0, 1, 3, 2, 4]],
      [
        countComponents(6, [
          [0, 1],
          [0, 2],
          [1, 3],
          [2, 3],
          [3, 4]
        ]),
        2
      ],
      [countComponents(3, []), 3]
    ];
  },
  "topo-sort": () => [
    [
      topoSort(4, [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3]
      ]),
      [0, 1, 2, 3]
    ],
    [
      topoSort(2, [
        [0, 1],
        [1, 0]
      ]),
      null
    ],
    [topoSort(3, []), [0, 1, 2]]
  ],
  dijkstra: () => [
    [
      dijkstra(
        5,
        [
          [0, 1, 4],
          [0, 2, 1],
          [2, 1, 2],
          [1, 3, 1],
          [2, 3, 5]
        ],
        0
      ),
      [0, 3, 1, 4, Infinity]
    ]
  ],
  "union-find": () => {
    const u = new UnionFind(5);
    const r = [u.union(0, 1), u.union(1, 2), u.union(0, 2), u.union(3, 4)];
    return [
      [r, [true, true, false, true]],
      [u.count, 2],
      [u.find(2) === u.find(0), true],
      [u.find(3) === u.find(0), false]
    ];
  },
  "merge-sort": () => [
    [mergeSort([5, 2, 9, 1, 5, 6, -3]), [-3, 1, 2, 5, 5, 6, 9]],
    [mergeSort([]), []],
    [mergeSort([1]), [1]]
  ],
  "quick-sort": () => {
    const big = Array.from({ length: 2000 }, (_, i) => (i * 7919) % 2003);
    return [
      [quickSort([5, 2, 9, 1, 5, 6, -3]), [-3, 1, 2, 5, 5, 6, 9]],
      [quickSort([3, 3, 3]), [3, 3, 3]],
      [quickSort([...big]), [...big].sort((a, b) => a - b)],
      [quickSort(Array.from({ length: 1000 }, (_, i) => i)).length, 1000]
    ];
  },
  "binary-search": () => {
    const a = [1, 2, 2, 2, 5, 8];
    return [
      [lowerBound(a, 2), 1],
      [upperBound(a, 2), 4],
      [upperBound(a, 2) - lowerBound(a, 2), 3],
      [lowerBound(a, 9), 6],
      [lowerBound(a, 0), 0],
      [shipWithinDays([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5), 15],
      [shipWithinDays([3, 2, 2, 4, 1, 4], 3), 6]
    ];
  },
  backtracking: () => [
    [sorted(subsets([1, 2, 3])), sorted([[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]])],
    [
      sorted(permutations([1, 2, 3])),
      sorted([
        [1, 2, 3],
        [1, 3, 2],
        [2, 1, 3],
        [2, 3, 1],
        [3, 1, 2],
        [3, 2, 1]
      ])
    ],
    [subsets([]).length, 1]
  ],
  dp: () => [
    [coinChange([1, 2, 5], 11), 3],
    [coinChange([2], 3), -1],
    [coinChange([1], 0), 0],
    [lcs("abcde", "ace"), 3],
    [lcs("abc", "def"), 0],
    [knapsack([1, 3, 4, 5], [1, 4, 5, 7], 7), 9]
  ],
  bits: () => [
    [isPowerOfTwo(16), true],
    [isPowerOfTwo(18), false],
    [isPowerOfTwo(0), false],
    [popcount(11), 3],
    [singleNumber([4, 1, 2, 1, 2]), 4]
  ],
  "lru-cache": () => {
    const c = new LRUCache(2);
    c.put(1, 1);
    c.put(2, 2);
    const a = c.get(1); // 1 is now most recent
    c.put(3, 3); // evicts 2
    const b = c.get(2);
    c.put(4, 4); // evicts 1
    return [
      [a, 1],
      [b, -1],
      [c.get(1), -1],
      [c.get(3), 3],
      [c.get(4), 4]
    ];
  },
  "token-bucket": () => {
    let t = 0;
    const tb = new TokenBucket(3, 1, () => t);
    const burst = [tb.tryTake(), tb.tryTake(), tb.tryTake(), tb.tryTake()];
    t = 1000;
    const afterOne = [tb.tryTake(), tb.tryTake()];
    t = 60000;
    const capped = [tb.tryTake(), tb.tryTake(), tb.tryTake(), tb.tryTake()];
    return [
      [burst, [true, true, true, false]],
      [afterOne, [true, false]],
      [capped, [true, true, true, false]]
    ];
  }
};
export const chapters = [
  {
    id: "hashing",
    title: "Hash tables",
    blurb: "The most used structure in interviews and in production.",
    ids: ["hash-map"]
  },
  {
    id: "linear",
    title: "Queues and stacks",
    blurb: "Order matters: first in first out, or last in first out.",
    ids: ["queue"]
  },
  {
    id: "heaps",
    title: "Heaps",
    blurb: "Always know the smallest (or largest) item, cheaply.",
    ids: ["min-heap"]
  },
  {
    id: "trees",
    title: "Trees",
    blurb: "Hierarchies, sorted data, prefixes.",
    ids: ["traversals", "bst", "trie"]
  },
  {
    id: "graphs",
    title: "Graphs",
    blurb: "Things connected to things. Most 'medium' problems are secretly graphs.",
    ids: ["graph", "topo-sort", "dijkstra", "union-find"]
  },
  {
    id: "sorting",
    title: "Sorting and searching",
    blurb: "Know how they work, when they're stable, and the binary search templates.",
    ids: ["merge-sort", "quick-sort", "binary-search"]
  },
  {
    id: "recursion",
    title: "Recursion and backtracking",
    blurb: "Try a choice, explore, undo.",
    ids: ["backtracking"]
  },
  {
    id: "dp",
    title: "Dynamic programming",
    blurb: "Recursion plus remembering answers you already computed.",
    ids: ["dp"]
  },
  {
    id: "bits",
    title: "Bits",
    blurb: "Small tricks that come up as warm-ups and in flags.",
    ids: ["bits"]
  },
  {
    id: "backend",
    title: "Built for backends",
    blurb: "The two build-it-from-scratch questions backend interviews ask most.",
    ids: ["lru-cache", "token-bucket"]
  }
];
export const meta = {
  "hash-map": {
    title: "Hash map",
    what: "Stores key to value pairs with O(1) average lookup, insert and delete.",
    how: "A hash function turns the key into a number, and modulo the array size picks a bucket. Two keys can land in the same bucket (a collision), so each bucket holds a short list (chaining). When the table gets more than about 75% full, it doubles and rehashes everything, so chains stay short. That resize is O(n), but it happens rarely, so the average cost per insert stays O(1) (amortized).",
    ops: [
      ["get / set / delete", "O(1) average, O(n) worst (everything collides)"],
      ["resize", "O(n), rare, amortized O(1)"],
      ["iterate", "O(n)"]
    ],
    when: [
      "Have I seen this before?",
      "Count things",
      "Look up by id",
      "Group by a key",
      "Cache results (memoize)"
    ],
    traps: [
      "Plain objects as maps: keys become strings, and there are prototype keys. Use Map.",
      "Map compares object keys by reference, not by value. Use a string key like `${r},${c}`.",
      "Worst case O(n) is real: attackers can force collisions (hash flooding), which is why languages use seeded hashes."
    ],
    real: "JS Map and Set. Redis is one big hash table, and Redis hashes (HSET) are maps inside it. Databases use hash joins and hash indexes.",
    say: "Average O(1) because the hash spreads keys across buckets and the table resizes to keep chains short. Worst case O(n) if everything collides."
  },
  queue: {
    title: "Queue and stack",
    what: "A queue gives items back in the order they arrived (FIFO). A stack gives back the most recent first (LIFO).",
    how: "Stack: a JS array with push and pop, both O(1). Queue: a JS array with shift() is O(n), because every element moves down one slot. Instead, keep a head index that moves forward, and occasionally slice off the used front. A deque (double-ended) supports both ends, usually as a ring buffer.",
    ops: [
      ["stack push / pop / peek", "O(1)"],
      ["queue enqueue / dequeue (head index)", "O(1) amortized"],
      ["array.shift()", "O(n), avoid in loops"]
    ],
    when: [
      "Queue: BFS, task processing in order, buffering",
      "Stack: matching brackets, undo, DFS without recursion, 'most recent'",
      "Monotonic stack: next greater element"
    ],
    traps: [
      "shift() inside a BFS loop makes it O(n²) on big inputs.",
      "Recursion is a hidden stack. Deep recursion overflows; switch to an explicit stack."
    ],
    real: "Bull and BullMQ are queues on Redis lists. Node's event loop runs queues of callbacks. Kafka partitions are ordered logs.",
    say: "In JS, shift is linear, so for a real queue I keep a head pointer."
  },
  "min-heap": {
    title: "Binary heap (priority queue)",
    what: "Gives you the smallest item in O(1) and removes it in O(log n). A max heap is the same with the comparison flipped.",
    how: "A complete binary tree stored in an array: the children of i are 2i+1 and 2i+2, and the parent is (i-1)/2. Rule: every parent is smaller than its children. Push: add at the end and swap upward while smaller than the parent. Pop: take the root, move the last item to the root, and swap downward with the smaller child. The tree is always balanced, so height is log n.",
    ops: [
      ["peek min", "O(1)"],
      ["push / pop", "O(log n)"],
      ["build from n items", "O(n) (heapify)"],
      ["search for any item", "O(n)"]
    ],
    when: [
      "Top k, k smallest, k most frequent",
      "Always process the cheapest or earliest next (Dijkstra, scheduling)",
      "Merge k sorted lists",
      "Running median (two heaps)"
    ],
    traps: [
      "JS has no built-in heap. Be ready to write it, or say you'd use a library and write it if asked.",
      "For top k largest, keep a MIN heap of size k and pop when it grows past k. O(n log k).",
      "A heap is not sorted. Only the top is guaranteed."
    ],
    real: "Node and libuv keep timers in a min heap (which setTimeout fires next). Job schedulers order delayed jobs the same way (BullMQ uses a Redis sorted set for delayed jobs).",
    say: "I only need the next smallest each time, not a full sort, so a heap gives log n per operation."
  },
  traversals: {
    title: "Tree traversals",
    what: "Four ways to visit every node: preorder, inorder, postorder (all depth-first), and level order (breadth-first).",
    how: "Preorder: node, then left, then right. Good for copying or serializing a tree. Inorder: left, node, right. On a BST this gives sorted order. Postorder: left, right, node. Good when children must be handled first (deleting, computing sizes). Level order uses a queue and is covered in the problems book. Any recursive traversal can be written with an explicit stack to avoid stack overflow on deep trees.",
    ops: [
      ["any full traversal", "O(n) time"],
      ["space", "O(h) for DFS (h = height), O(width) for BFS"]
    ],
    when: [
      "Need sorted order from a BST: inorder",
      "Serialize or clone: preorder",
      "Combine answers from children (height, sums): postorder",
      "Shortest path or levels: BFS"
    ],
    traps: [
      "A skewed tree has h = n, so recursion depth can be n.",
      "Mixing up the orders: say the rule out loud before coding."
    ],
    real: "Rendering a DOM or React tree, walking an AST (linters, bundlers), computing folder sizes.",
    say: "Inorder on a BST gives sorted output. Postorder when the parent needs the children's answers first."
  },
  bst: {
    title: "Binary search tree",
    what: "A tree where every left subtree is smaller and every right subtree is larger, so search halves the space at each step.",
    how: "Search, insert and delete walk down one path, so they cost O(h). Balanced, h is log n. If you insert sorted data, it becomes a linked list and h is n. Self-balancing trees (red-black, AVL) fix this with rotations. Deleting a node with two children: copy in the next larger value (the in-order successor), then delete that one.",
    ops: [
      ["search / insert / delete", "O(log n) balanced, O(n) skewed"],
      ["min / max", "O(h)"],
      ["in-order walk", "O(n), sorted"]
    ],
    when: [
      "Sorted data that changes often",
      "Range queries (everything between a and b)",
      "Floor and ceiling lookups"
    ],
    traps: [
      "Validating only parent and child is wrong. Each node must fit the range set by all its ancestors.",
      "Duplicates: decide a rule (ignore, count, or always go right)."
    ],
    real: "Database indexes are B+trees: the same idea, but each node holds hundreds of keys so the tree is only 3 or 4 levels deep, which means few disk reads. That's why an index lookup is fast.",
    say: "It's O(log n) only if it stays balanced. In practice that's a red-black tree, or a B+tree in a database."
  },
  trie: {
    title: "Trie (prefix tree)",
    what: "A tree of characters where each path from the root spells a word. Finds words and prefixes in O(length of word).",
    how: "Each node has a map from character to child, plus a flag for 'a word ends here'. Insert walks or creates one node per character. Search walks and checks the end flag. startsWith just checks the path exists. Autocomplete walks to the prefix node, then DFS collects words below it.",
    ops: [
      ["insert / search / startsWith", "O(L), L = word length"],
      ["autocomplete", "O(L + size of results)"],
      ["space", "O(total characters), can be large"]
    ],
    when: [
      "Autocomplete and type-ahead",
      "Prefix matching",
      "Word games and dictionaries",
      "Many lookups against a fixed set of strings"
    ],
    traps: [
      "Forgetting the end flag: 'ca' is a prefix, not a word.",
      "Memory heavy. For a few lookups, a Set plus startsWith is simpler."
    ],
    real: "HTTP routers (Fastify's find-my-way uses a radix tree, a compressed trie), IP routing tables, search box suggestions.",
    say: "Lookups cost the word length, not the dictionary size, which is why routers and autocomplete use tries."
  },
  graph: {
    title: "Graphs, BFS and DFS",
    what: "Nodes connected by edges. BFS explores level by level and finds the fewest hops. DFS goes deep first and is good for reachability and cycles.",
    how: "Store graphs as an adjacency list (each node keeps a list of neighbours), usually built from an edge list. BFS: a queue plus a distance array. The first time you reach a node is its shortest hop count. DFS: recursion or a stack, plus a visited set. Mark a node visited when you add it, so it's never added twice. Connected components: start a DFS from every unvisited node and count the starts.",
    ops: [
      ["BFS / DFS", "O(V + E)"],
      ["adjacency list space", "O(V + E)"],
      ["adjacency matrix", "O(V²) space, O(1) edge check"]
    ],
    when: [
      "Fewest steps or hops: BFS",
      "Can I reach it? Are there cycles? Count groups: DFS",
      "Grids are graphs: each cell has 4 neighbours"
    ],
    traps: [
      "Forgetting visited: infinite loop on any cycle.",
      "BFS gives shortest paths only when every edge has the same weight. Weighted needs Dijkstra.",
      "Undirected: add the edge both ways."
    ],
    real: "Service dependency maps, social graphs, crawlers, garbage collectors (mark reachable objects).",
    say: "Shortest path with equal weights is BFS, O(V + E). With weights I'd switch to Dijkstra."
  },
  "topo-sort": {
    title: "Topological sort",
    what: "Orders tasks so every task comes after the tasks it depends on. Only possible if there are no cycles.",
    how: "Kahn's algorithm: count incoming edges (indegree) for each node. Start with every node at zero, meaning nothing blocks it. Take one, add it to the order, and lower the indegree of its neighbours; any that hit zero become ready. If the order ends up shorter than the number of nodes, the rest are stuck in a cycle.",
    ops: [["Kahn's algorithm", "O(V + E)"]],
    when: [
      "Task or job dependencies",
      "Course prerequisites",
      "Build order",
      "Detect circular dependencies"
    ],
    traps: [
      "Many valid orders can exist. Don't promise a specific one unless you sort the ready list.",
      "Edge direction: define 'a before b' out loud."
    ],
    real: "Build tools and monorepos (build packages in dependency order), migration ordering, BullMQ flows (child jobs before parent), package managers.",
    say: "It's a dependency graph. Kahn's algorithm gives an order, and leftover nodes mean a cycle."
  },
  dijkstra: {
    title: "Dijkstra's shortest path",
    what: "Shortest distance from one node to all others when edges have non-negative weights.",
    how: "Keep a best-known distance for every node, starting at infinity, and 0 for the source. A min heap always gives the closest unfinished node. For each neighbour, if going through this node is shorter, update and push. Because weights are non-negative, the first time a node comes off the heap its distance is final. Skip stale heap entries.",
    ops: [["with a binary heap", "O((V + E) log V)"]],
    when: ["Weighted shortest path: cost, time, distance", "Cheapest route, lowest latency path"],
    traps: [
      "Negative weights break it (use Bellman-Ford).",
      "Not skipping stale entries wastes work, and on some problems gives wrong answers.",
      "With all weights equal, plain BFS is simpler and faster."
    ],
    real: "Map routing uses variants of it (A*, contraction hierarchies). Network routing (OSPF) runs Dijkstra.",
    say: "Greedy with a min heap: always settle the closest node next. Works because weights can't be negative."
  },
  "union-find": {
    title: "Union-find (disjoint set)",
    what: "Tracks which items are in the same group, with near O(1) merge and same-group checks.",
    how: "Every item points to a parent, and the root names the group. find walks up to the root and flattens the path as it goes (path compression). union links one root under the other, attaching the shorter tree under the taller (union by rank). Together these make operations effectively constant time.",
    ops: [
      ["find / union", "about O(1) amortized (inverse Ackermann)"],
      ["space", "O(n)"]
    ],
    when: [
      "Group or merge sets as edges arrive",
      "Detect a cycle in an undirected graph",
      "Count connected components dynamically",
      "Kruskal's minimum spanning tree"
    ],
    traps: [
      "Without path compression and rank it can be O(n) per find.",
      "It can merge groups but not split them."
    ],
    real: "Merging duplicate customer records or accounts that share a phone or email, clustering, image region labeling.",
    say: "If I only need 'are these connected' while merging groups, union-find is simpler than running BFS each time."
  },
  "merge-sort": {
    title: "Merge sort",
    what: "Split in half, sort each half, merge. Always O(n log n) and stable.",
    how: "Recursively split down to one element, which is already sorted. Merging two sorted lists is a linear walk with two pointers. log n levels of splitting, n work per level. Stable means equal items keep their original order, which matters when sorting records by one field after another.",
    ops: [
      ["time", "O(n log n) always"],
      ["space", "O(n) extra"],
      ["stable", "yes"]
    ],
    when: [
      "Need guaranteed n log n",
      "Need a stable sort",
      "Linked lists (no random access needed)",
      "Data too big for memory (external sort)"
    ],
    traps: [
      "Use <= in the merge to keep it stable.",
      "slice() in every call costs memory. Fine for interviews; mention it."
    ],
    real: "V8's Array.prototype.sort is TimSort (merge plus insertion sort) and is stable. Databases use external merge sort when a sort doesn't fit in memory; you'll see 'external merge' in Postgres EXPLAIN ANALYZE.",
    say: "Guaranteed n log n and stable, at the cost of O(n) extra memory."
  },
  "quick-sort": {
    title: "Quick sort",
    what: "Pick a pivot, put smaller items left and larger right, then sort each side. Fast in practice, in place.",
    how: "Partition: walk the range and swap anything smaller than the pivot to the front. Put the pivot right after them; it's now in its final position. Recurse on both sides. A good pivot splits evenly (n log n). A bad one, like always the first item on sorted input, gives O(n²). Middle or random pivots avoid that.",
    ops: [
      ["time", "O(n log n) average, O(n²) worst"],
      ["space", "O(log n) recursion"],
      ["stable", "no"]
    ],
    when: [
      "In-memory sort where memory matters",
      "Quickselect: find the kth smallest in O(n) average"
    ],
    traps: [
      "Always picking the first or last pivot on sorted input is O(n²).",
      "Many duplicates hurt basic partitioning (three-way partition fixes it)."
    ],
    real: "Many standard library sorts are introsort: quick sort that falls back to heap sort if recursion gets too deep.",
    say: "Average n log n and cache friendly. I'd use a random or middle pivot to avoid the sorted-input worst case."
  },
  "binary-search": {
    title: "Binary search templates",
    what: "Halve the search space every step. Works on sorted data, and on any yes/no question whose answer flips once.",
    how: "Use one template everywhere: lo = 0, hi = n (exclusive), loop while lo < hi, and move toward the first index where a condition becomes true. lowerBound is the first a[i] >= x. upperBound is the first a[i] > x. Their difference counts occurrences. 'Search on the answer': if 'can it be done with capacity c' is no, no, no, yes, yes, binary search over c instead of over an array.",
    ops: [
      ["search", "O(log n)"],
      ["search on the answer", "O(log(range) × cost of one check)"]
    ],
    when: [
      "Sorted array: find, insert position, count of x",
      "Minimum capacity, speed or time that works",
      "Maximum value that still fits"
    ],
    traps: [
      "Off by one: stick to one template (lo < hi, hi = mid, lo = mid + 1).",
      "Infinite loop: with lo < hi, always set lo = mid + 1 on one side.",
      "The search-on-answer bounds must be valid: lo = biggest single item, hi = everything at once."
    ],
    real: "Every B+tree index lookup is binary search inside nodes. git bisect is binary search over commits. Capacity planning: smallest instance size that meets the SLA.",
    say: "The check is monotonic, if capacity c works then anything larger works, so I can binary search the answer."
  },
  backtracking: {
    title: "Backtracking",
    what: "Build answers one choice at a time, explore each choice, and undo it before trying the next.",
    how: "Template: choose, explore (recurse), un-choose. Subsets: each item is taken or skipped, giving 2^n results. Permutations: at each position try every unused item, giving n! results. Pruning (stopping early when a path can't work) is what makes it practical.",
    ops: [
      ["subsets", "O(n · 2^n)"],
      ["permutations", "O(n · n!)"]
    ],
    when: [
      "Generate all combinations, subsets, permutations",
      "Puzzles: N-queens, sudoku, word search",
      "Small n (usually under about 20)"
    ],
    traps: [
      "Pushing path itself instead of a copy: every result ends up the same array.",
      "Forgetting to undo (pop) after exploring."
    ],
    real: "Generating test matrices or config combinations, constraint solvers, regex engines backtrack on failed matches.",
    say: "It's exponential by nature, so I'll prune as early as possible. Choose, explore, undo."
  },
  dp: {
    title: "Dynamic programming",
    what: "Solve a problem from answers to smaller versions of it, and never compute the same smaller answer twice.",
    how: "Steps: 1) Define the state ('best[a] = fewest coins for amount a'). 2) Write the transition from smaller states. 3) Base cases. 4) Order: top-down with a memo (recursion plus a Map), or bottom-up filling a table. Coin change: best[a] = min over coins of best[a - c] + 1. LCS: if the characters match, take the diagonal + 1, otherwise the best of skipping one character. 0/1 knapsack: loop capacity backwards so each item is used once.",
    ops: [
      ["cost", "number of states × work per state"],
      ["coin change", "O(amount × coins)"],
      ["LCS", "O(n × m)"],
      ["knapsack", "O(items × capacity)"]
    ],
    when: [
      "'How many ways', 'minimum cost', 'maximum value', 'is it possible'",
      "Choices whose sub-results repeat",
      "Greedy fails on a counterexample"
    ],
    traps: [
      "Greedy coin change fails for coins [1, 3, 4] and amount 6 (greedy says 3 coins, DP finds 2).",
      "Knapsack looped forwards lets an item be reused.",
      "Start with the recursive version out loud, then add memo. It's easier to explain."
    ],
    real: "diff tools are built on LCS-style edit distance (git uses Myers' algorithm). Spell checkers use edit distance. Pricing and resource allocation are knapsack-shaped.",
    say: "The subproblems overlap, so I'll memoize. The state is X, the transition is Y, and the cost is states times work per state."
  },
  bits: {
    title: "Bit manipulation",
    what: "Treat a number as a row of 0s and 1s. Fast tricks for flags, counting and pairing.",
    how: "n & (n - 1) clears the lowest set bit, so a power of two (one bit) becomes 0, and repeating it counts bits. a ^ a = 0 and a ^ 0 = a, so XOR of everything cancels pairs. Flags: OR to set, AND to test, AND NOT to clear.",
    ops: [
      ["each operation", "O(1)"],
      ["popcount", "O(number of set bits)"]
    ],
    when: [
      "Single number among pairs",
      "Power of two checks",
      "Permission or feature flags in one integer",
      "Subsets as bitmasks for small n"
    ],
    traps: [
      "JS bitwise operators work on 32-bit signed ints. Big numbers break; use BigInt.",
      ">> keeps the sign, >>> fills with zeros."
    ],
    real: "Unix file permissions (chmod 755), feature flag masks, Bloom filters, Redis bitmaps (SETBIT) for daily active users.",
    say: "XOR cancels pairs, so whatever's left appears once. O(n) time, O(1) space."
  },
  "lru-cache": {
    title: "LRU cache",
    what: "A fixed-size cache that throws out the least recently used item when full. get and put are both O(1).",
    how: "Two structures together: a hash map from key to node (O(1) lookup), and a doubly linked list ordered by use (O(1) move and remove). Dummy head and tail nodes remove edge cases. get: find the node, move it to the front. put: update or insert at the front. Over capacity: remove the node before the tail and delete its key from the map.",
    ops: [
      ["get / put", "O(1)"],
      ["space", "O(capacity)"]
    ],
    when: [
      "'Design a cache', LRU or LFU questions",
      "Any time you need O(1) lookup plus O(1) ordering"
    ],
    traps: [
      "In JS, a Map keeps insertion order, so delete then set moves a key to the end. That's a valid shortcut, but say so and offer the linked-list version, which is what they're testing.",
      "Forgetting to delete the evicted key from the map.",
      "Node needs its key, so eviction knows what to delete from the map."
    ],
    real: "Redis eviction policy allkeys-lru (Redis approximates it by sampling keys). CDN and browser caches. Database buffer pools use LRU variants.",
    say: "A map gives O(1) lookup and a doubly linked list gives O(1) reordering. Together, both operations are O(1)."
  },
  "token-bucket": {
    title: "Token bucket rate limiter",
    what: "Allows bursts up to a limit, then a steady rate. The standard way to rate limit an API.",
    how: "The bucket holds up to capacity tokens and refills at a fixed rate. Each request takes a token; an empty bucket means reject (HTTP 429). Refill lazily: on each request, add elapsed time × rate, capped at capacity. No timers needed. Passing the clock in makes it testable.",
    ops: [
      ["tryTake", "O(1)"],
      ["memory", "O(1) per client key"]
    ],
    when: [
      "'Design a rate limiter'",
      "Protect an API or a third-party quota",
      "Smooth bursts of jobs"
    ],
    traps: [
      "Across many servers, an in-memory bucket isn't shared. Use Redis with a Lua script (atomic read-modify-write) or the gateway.",
      "Fixed window counters allow a 2x burst at window edges. Sliding window or token bucket fix that.",
      "Use a monotonic clock in production; wall clocks can jump."
    ],
    real: "Kong's rate limiting plugin, AWS API Gateway throttling (token bucket), nginx limit_req (leaky bucket, a close cousin).",
    say: "Lazy refill means no background timer, O(1) per request. For many servers I'd keep the bucket in Redis and update it atomically with a Lua script."
  }
};
