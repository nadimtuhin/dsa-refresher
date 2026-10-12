// Part 3: system design. Tested building blocks + worked design problems.
import { createHmac, timingSafeEqual } from "node:crypto";

// #region consistent-hash
// FNV-1a plus a final mix so similar keys ("user:1", "user:2") land far apart
const hash32 = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
class HashRing {
  constructor(vnodes = 100) {
    this.vnodes = vnodes; // points per server; more points = more even slices
    this.ring = []; // sorted [hash, server]
  }
  add(server) {
    for (let v = 0; v < this.vnodes; v++) this.ring.push([hash32(`${server}#${v}`), server]);
    this.ring.sort((a, b) => a[0] - b[0]);
  }
  remove(server) {
    this.ring = this.ring.filter(([, s]) => s !== server);
  }
  get(key) {
    const h = hash32(key), r = this.ring;
    let lo = 0, hi = r.length; // first point clockwise with hash >= h
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (r[mid][0] < h) lo = mid + 1;
      else hi = mid;
    }
    return r[lo % r.length][1]; // past the last point: wrap to the first
  }
}
// #endregion
// #region cache-aside
// TTL cache; `now` is injectable so expiry is testable. In production this is Redis SET key val PX ttl.
class TtlCache {
  constructor(ttlMs, now = Date.now) {
    this.ttl = ttlMs;
    this.now = now;
    this.m = new Map();
  }
  get(key) {
    const e = this.m.get(key);
    if (!e) return undefined;
    if (e.exp <= this.now()) {
      this.m.delete(key); // expired counts as a miss
      return undefined;
    }
    return e.val;
  }
  set(key, val) {
    this.m.set(key, { val, exp: this.now() + this.ttl });
  }
  delete(key) {
    this.m.delete(key);
  }
}
// Read: cache first, database on a miss, then fill the cache.
function readThrough(cache, db, key) {
  const hit = cache.get(key);
  if (hit !== undefined) return { val: hit, from: "cache" };
  const val = db.get(key);
  cache.set(key, val);
  return { val, from: "db" };
}
// Write: database first, then DELETE the key. Setting it instead lets two writers race and leave it stale.
function writeAndInvalidate(cache, db, key, val) {
  db.set(key, val);
  cache.delete(key);
}
// Stampede guard: concurrent misses on one key share a single load.
function singleFlight() {
  const inflight = new Map();
  return (key, load) => {
    if (inflight.has(key)) return inflight.get(key);
    const p = Promise.resolve()
      .then(load)
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
  };
}
// #endregion
// #region quorum
// N replicas. A write lands on W of them, a read asks R of them and keeps the highest version.
// R + W > N means every read set overlaps every write set, so reads see the latest write.
class QuorumStore {
  constructor(n, w, r) {
    this.reps = Array.from({ length: n }, () => new Map());
    this.w = w;
    this.r = r;
    this.version = 0; // ponytail: one global counter; real stores use per key versions or vector clocks
  }
  write(key, val, pick) {
    // pick(n, k) says which k replicas answered; in real life the network decides
    const v = { val, version: ++this.version };
    for (const i of pick(this.reps.length, this.w)) this.reps[i].set(key, v);
  }
  read(key, pick) {
    let best;
    for (const i of pick(this.reps.length, this.r)) {
      const v = this.reps[i].get(key);
      if (v && (!best || v.version > best.version)) best = v;
    }
    return best?.val;
  }
}
// #endregion
// #region keyset
// OFFSET pages shift when rows are inserted; a cursor (the last row's sort key) does not.
// SQL: SELECT * FROM jobs WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT $3
const newestFirst = (a, b) => b.at - a.at || b.id - a.id; // id breaks ties
function offsetPage(rows, page, size) {
  return [...rows].sort(newestFirst).slice(page * size, page * size + size);
}
function keysetPage(rows, cursor, size) {
  const after = r => !cursor || r.at < cursor.at || (r.at === cursor.at && r.id < cursor.id);
  const items = [...rows].sort(newestFirst).filter(after).slice(0, size);
  const last = items.at(-1);
  return { items, next: items.length === size ? { at: last.at, id: last.id } : null };
}
// #endregion
// #region idempotency
// Same key + same body: replay the stored response. Same key + different body: reject.
// Production: a table with a UNIQUE key in the same database as the side effect (or Redis SET NX + TTL).
class IdempotencyStore {
  constructor() {
    this.m = new Map();
  }
  handle(key, body, run) {
    const fp = JSON.stringify(body);
    const prev = this.m.get(key);
    if (prev) {
      if (prev.fp !== fp) return { status: 422, body: "key reused with a different request" };
      if (prev.res === null) return { status: 409, body: "still processing, retry later" };
      return prev.res; // replay; the work does not run again
    }
    this.m.set(key, { fp, res: null }); // claim the key BEFORE doing the work
    const res = run();
    this.m.get(key).res = res;
    return res;
  }
}
// #endregion
// #region outbox
// The row and its event commit in ONE transaction. A relay publishes later. Consumers dedupe by event id.
function placeOrder(db, order) {
  db.transaction(tx => {
    tx.orders.push(order);
    tx.outbox.push({ id: `evt-${order.id}`, type: "order.placed", payload: order, sent: false });
  });
}
// May die after publish and before marking sent, so delivery is at least once.
function relay(db, publish) {
  for (const e of db.outbox)
    if (!e.sent) {
      publish(e);
      e.sent = true;
    }
}
class DedupConsumer {
  constructor(apply) {
    this.seen = new Set(); // production: a processed_events table, written in the same transaction as apply
    this.apply = apply;
  }
  handle(e) {
    if (this.seen.has(e.id)) return false;
    this.apply(e);
    this.seen.add(e.id);
    return true;
  }
}
// tiny in-memory "database" with rollback, so the pattern is testable
function memDb() {
  const db = { orders: [], outbox: [] };
  db.transaction = fn => {
    const snap = { orders: [...db.orders], outbox: [...db.outbox] };
    try {
      fn(db);
    } catch (err) {
      db.orders = snap.orders;
      db.outbox = snap.outbox;
      throw err;
    }
  };
  return db;
}
// #endregion
// #region retry-breaker
// Exponential backoff with full jitter: wait random(0, min(cap, base * 2^attempt)).
const backoff = (attempt, { base = 100, cap = 10000, rand = Math.random } = {}) =>
  Math.floor(rand() * Math.min(cap, base * 2 ** attempt));
// After `threshold` failures in a row: fail fast for `coolMs`, then let one trial call through.
class CircuitBreaker {
  constructor({ threshold = 3, coolMs = 5000, now = Date.now } = {}) {
    Object.assign(this, { threshold, coolMs, now, state: "closed", fails: 0, openedAt: 0 });
  }
  call(fn) {
    if (this.state === "open") {
      if (this.now() - this.openedAt < this.coolMs) throw new Error("circuit open"); // protect the callee
      this.state = "half-open"; // cool-down over: one trial
    }
    try {
      const r = fn();
      this.state = "closed";
      this.fails = 0;
      return r;
    } catch (err) {
      if (this.state === "half-open" || ++this.fails >= this.threshold) {
        this.state = "open";
        this.openedAt = this.now();
      }
      throw err;
    }
  }
}
// #endregion
// #region url-shortener
// A counter (DB sequence, or id blocks handed to each server) encoded in base62. No collisions, no retries.
const B62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
function encode62(n) {
  let s = "";
  do {
    s = B62[n % 62] + s;
    n = Math.floor(n / 62);
  } while (n > 0);
  return s;
}
function decode62(s) {
  let n = 0;
  for (const c of s) n = n * 62 + B62.indexOf(c);
  return n;
}
// #endregion
// #region rate-limiter
// Sliding window counter: the previous fixed window counts in proportion to how much of it still overlaps.
// Two integers per key per window, so it fits Redis: INCR rl:{key}:{window}, EXPIRE 2 windows.
class SlidingWindowLimiter {
  constructor(limit, windowMs, now = Date.now) {
    Object.assign(this, { limit, windowMs, now, counts: new Map() });
  }
  allow(key) {
    const t = this.now(), win = Math.floor(t / this.windowMs);
    const cur = this.counts.get(`${key}:${win}`) ?? 0;
    const prev = this.counts.get(`${key}:${win - 1}`) ?? 0;
    const overlap = 1 - (t % this.windowMs) / this.windowMs; // share of the previous window still inside
    if (prev * overlap + cur >= this.limit) return false; // caller answers 429 + Retry-After
    this.counts.set(`${key}:${win}`, cur + 1);
    return true;
  }
}
// #endregion
// #region webhooks
// 2xx = done. 408, 429, 5xx and timeouts (status 0) may pass, so retry. Other 4xx is their bug: stop.
const retryable = status => status === 0 || status === 408 || status === 429 || status >= 500;
function deliver(event, send, { maxAttempts = 5, delay = a => backoff(a) } = {}) {
  const log = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // ponytail: real workers re-enqueue with a delay instead of waiting in a loop
    const waitBefore = attempt ? delay(attempt - 1) : 0;
    const status = send(event, attempt);
    log.push({ attempt, status, waitBefore });
    if (status >= 200 && status < 300) return { result: "delivered", log };
    if (!retryable(status)) return { result: "dead-letter", reason: `permanent ${status}`, log };
  }
  return { result: "dead-letter", reason: "out of attempts", log };
}
// Sign timestamp + body, so receivers can check it came from us and isn't an old replay.
const sign = (secret, ts, body) => createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
function verify(secret, header, body, nowSec, toleranceSec = 300) {
  const { t, v1 } = Object.fromEntries(header.split(",").map(p => p.split("=")));
  if (!t || Math.abs(nowSec - Number(t)) > toleranceSec) return false; // too old: maybe a replay
  const want = Buffer.from(sign(secret, t, body)), got = Buffer.from(v1 ?? "");
  return got.length === want.length && timingSafeEqual(got, want); // constant time compare
}
// #endregion
// #region job-dispatch
// Many workers see one open job; exactly one may win. The row is the lock:
// UPDATE jobs SET status = 'assigned', assignee = $1, version = version + 1
//   WHERE id = $2 AND status = 'open' AND version = $3      -- 1 row = you won, 0 rows = 409
function claim(jobs, jobId, workerId, seenVersion) {
  const j = jobs.get(jobId);
  if (!j || j.status !== "open" || j.version !== seenVersion) return false;
  Object.assign(j, { status: "assigned", assignee: workerId, version: j.version + 1 });
  return true;
}
// Nearby: bucket workers into grid cells (stand-in for geohash, H3 or a PostGIS index), scan the 3x3 around the job.
const cellOf = (lat, lng, size = 0.1) => `${Math.floor(lat / size)},${Math.floor(lng / size)}`;
function nearby(index, lat, lng, size = 0.1) {
  const [cy, cx] = cellOf(lat, lng, size).split(",").map(Number), out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) out.push(...(index.get(`${cy + dy},${cx + dx}`) ?? []));
  return out; // then filter by exact distance, skills, rating
}
// #endregion
// #region news-feed
// Hybrid fan-out. Normal authors: push the post into each follower's list on write (fast reads).
// Celebrities: skip the push (millions of writes); merge their posts in at read time.
function publish(feeds, followers, author, post, celebrities, cap = 800) {
  if (celebrities.has(author)) return 0;
  const fans = followers.get(author) ?? [];
  for (const f of fans) {
    const list = feeds.get(f) ?? [];
    list.unshift(post); // Redis: LPUSH feed:{f} id, then LTRIM feed:{f} 0 cap-1
    if (list.length > cap) list.length = cap;
    feeds.set(f, list);
  }
  return fans.length; // writes this post cost
}
function readFeed(feeds, following, user, postsBy, celebrities, k = 10) {
  const pulled = [...(following.get(user) ?? [])].filter(a => celebrities.has(a)).map(a => postsBy.get(a) ?? []);
  return mergeNewest([feeds.get(user) ?? [], ...pulled], k);
}
// k-way merge of lists already sorted newest first (a heap if there are many lists)
function mergeNewest(lists, k) {
  const idx = lists.map(() => 0), out = [];
  while (out.length < k) {
    let best = -1;
    for (let i = 0; i < lists.length; i++)
      if (idx[i] < lists[i].length && (best < 0 || lists[i][idx[i]].at > lists[best][idx[best]].at)) best = i;
    if (best < 0) break;
    out.push(lists[best][idx[best]++]);
  }
  return out;
}
// #endregion
// #region chat
// The server stamps a per-conversation sequence number. Clients may get messages late, twice, or out of order
// (reconnects, retries), so they buffer and show them in seq order.
class InOrderInbox {
  constructor() {
    this.next = 1;
    this.buf = new Map();
  }
  receive(msg) {
    if (msg.seq < this.next || this.buf.has(msg.seq)) return []; // duplicate
    this.buf.set(msg.seq, msg);
    const ready = [];
    while (this.buf.has(this.next)) {
      ready.push(this.buf.get(this.next));
      this.buf.delete(this.next++);
    }
    return ready; // show these now, in order
  }
  gap() {
    // the range to fetch from the server: GET /messages?afterSeq=next-1
    return this.buf.size ? [this.next, Math.min(...this.buf.keys()) - 1] : null;
  }
}
// #endregion
// #region app-builder
// The model never rewrites whole files. It returns search and replace edits that apply all or nothing.
function applyEdits(files, edits) {
  const next = new Map(files);
  for (const { path, search, replace } of edits) {
    const src = next.get(path);
    if (search === "") {
      // empty search = create a new file
      if (src !== undefined) return { ok: false, error: `${path} already exists` };
      next.set(path, replace);
      continue;
    }
    if (src === undefined) return { ok: false, error: `${path} not found` };
    const at = src.indexOf(search);
    if (at < 0) return { ok: false, error: `search text not found in ${path}` };
    if (src.indexOf(search, at + 1) >= 0) return { ok: false, error: `search text matches twice in ${path}` };
    next.set(path, src.slice(0, at) + replace + src.slice(at + search.length));
  }
  return { ok: true, files: next };
}

// Generate, apply, build. Errors go back to the model, at most maxTries times.
// Only a version that builds is kept, so the preview never shows a broken app.
async function generateUntilBuilds(project, prompt, { model, build, maxTries = 3 }) {
  const base = project.versions.at(-1);
  let feedback = null;
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    const r = applyEdits(base, await model({ files: base, prompt, feedback }));
    const err = r.ok ? await build(r.files) : r.error;
    if (!err) {
      project.versions.push(r.files);
      return { ok: true, attempt, version: project.versions.length - 1 };
    }
    feedback = err;
  }
  return { ok: false, feedback }; // keep the last good version live and show the error
}

// Versions are never changed or deleted. Undo makes an old version the newest one again.
const restore = (project, n) => project.versions.push(project.versions[n]) - 1;

// One preview sandbox per open project. Booting takes seconds, so keep some warm and stop idle ones.
class SandboxPool {
  constructor({ warm = 2, idleMs = 600000, now = Date.now } = {}) {
    Object.assign(this, { target: warm, idleMs, now, warm: [], live: new Map(), n: 0 });
    this.refill();
  }
  refill() {
    // runs in the background in real life; booting is slow
    while (this.warm.length < this.target) this.warm.push(`sb${++this.n}`);
  }
  open(project) {
    const s = this.live.get(project);
    if (s) {
      s.seen = this.now();
      return { id: s.id, cold: false };
    }
    const cold = this.warm.length === 0;
    const id = cold ? `sb${++this.n}` : this.warm.shift();
    this.live.set(project, { id, seen: this.now() });
    return { id, cold };
  }
  reap() {
    const stopped = [];
    for (const [p, s] of this.live)
      if (this.now() - s.seen >= this.idleMs) {
        this.live.delete(p);
        stopped.push(s.id);
      }
    return stopped;
  }
}
// #endregion
export {
  hash32,
  HashRing,
  TtlCache,
  readThrough,
  writeAndInvalidate,
  singleFlight,
  QuorumStore,
  offsetPage,
  keysetPage,
  IdempotencyStore,
  placeOrder,
  relay,
  DedupConsumer,
  memDb,
  backoff,
  CircuitBreaker,
  encode62,
  decode62,
  SlidingWindowLimiter,
  retryable,
  deliver,
  sign,
  verify,
  claim,
  cellOf,
  nearby,
  publish,
  readFeed,
  mergeNewest,
  InOrderInbox,
  applyEdits,
  generateUntilBuilds,
  restore,
  SandboxPool
};

// ---------- tests: [actual, expected] ----------
const combos = (arr, k) => (k === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), k - 1).map(c => [x, ...c])));
export const tests = {
  "consistent-hash": () => {
    const keys = Array.from({ length: 10000 }, (_, i) => "key" + i);
    const ring = new HashRing(100);
    ["A", "B", "C"].forEach(s => ring.add(s));
    const before = keys.map(k => ring.get(k));
    const share = s => before.filter(x => x === s).length / keys.length;
    ring.add("D");
    const after = keys.map(k => ring.get(k));
    const moved = keys.filter((_, i) => before[i] !== after[i]).length / keys.length;
    const modMoved = keys.filter(k => hash32(k) % 3 !== hash32(k) % 4).length / keys.length;
    const onlyToD = keys.every((_, i) => before[i] === after[i] || after[i] === "D");
    ring.remove("D");
    return [
      [["A", "B", "C"].every(s => share(s) > 0.25 && share(s) < 0.42), true],
      [moved > 0.15 && moved < 0.35, true],
      [onlyToD, true],
      [modMoved > 0.6, true],
      [keys.every((k, i) => ring.get(k) === before[i]), true]
    ];
  },
  "cache-aside": async () => {
    let t = 0;
    const c = new TtlCache(1000, () => t), db = new Map([["a", 1]]);
    const r1 = readThrough(c, db, "a").from, r2 = readThrough(c, db, "a").from;
    writeAndInvalidate(c, db, "a", 2);
    const r3 = readThrough(c, db, "a");
    t = 1500;
    const r4 = readThrough(c, db, "a").from;
    let calls = 0;
    const sf = singleFlight();
    const vals = await Promise.all(Array.from({ length: 5 }, () => sf("k", () => (calls++, 42))));
    const again = await sf("k", () => (calls++, 43));
    return [
      [[r1, r2], ["db", "cache"]],
      [[r3.from, r3.val], ["db", 2]],
      [r4, "db"],
      [vals, [42, 42, 42, 42, 42]],
      [calls, 2],
      [again, 43]
    ];
  },
  quorum: () => {
    const stale = (w, r) => {
      let bad = 0;
      for (const ws of combos([0, 1, 2], w))
        for (const rs of combos([0, 1, 2], r)) {
          const s = new QuorumStore(3, w, r);
          s.write("x", "old", () => [0, 1, 2]);
          s.write("x", "new", () => ws);
          if (s.read("x", () => rs) !== "new") bad++;
        }
      return bad;
    };
    return [
      [stale(2, 2), 0],
      [stale(3, 1), 0],
      [stale(1, 3), 0],
      [stale(1, 1) > 0, true],
      [stale(2, 1) > 0, true]
    ];
  },
  keyset: () => {
    const rows = [1, 2, 3, 4, 5, 6].map(id => ({ id, at: Math.ceil(id / 2) })); // ties on `at`
    const p1 = offsetPage(rows, 0, 2).map(r => r.id), k1 = keysetPage(rows, null, 2);
    rows.push({ id: 7, at: 9 }); // new row arrives between page 1 and page 2
    const p2 = offsetPage(rows, 1, 2).map(r => r.id), k2 = keysetPage(rows, k1.next, 2).items.map(r => r.id);
    const all = [];
    let cur = null;
    do {
      const pg = keysetPage(rows, cur, 3);
      all.push(...pg.items.map(r => r.id));
      cur = pg.next;
    } while (cur);
    return [
      [p1, [6, 5]],
      [p2, [5, 4]],
      [k2, [4, 3]],
      [all, [7, 6, 5, 4, 3, 2, 1]]
    ];
  },
  idempotency: () => {
    const s = new IdempotencyStore();
    let n = 0;
    const run = () => ({ status: 201, body: ++n });
    const a = s.handle("k1", { amt: 5 }, run), b = s.handle("k1", { amt: 5 }, run), c = s.handle("k1", { amt: 9 }, run);
    let inner;
    const d = s.handle("k2", { amt: 1 }, () => {
      inner = s.handle("k2", { amt: 1 }, run); // retry arrives while the first is still running
      return run();
    });
    return [
      [a, { status: 201, body: 1 }],
      [b, { status: 201, body: 1 }],
      [c.status, 422],
      [inner.status, 409],
      [d.body, 2],
      [n, 2]
    ];
  },
  outbox: () => {
    const db = memDb();
    placeOrder(db, { id: 1 });
    let failed = false;
    try {
      db.transaction(tx => {
        tx.orders.push({ id: 2 });
        tx.outbox.push({ id: "evt-2", sent: false });
        throw new Error("constraint violation");
      });
    } catch {
      failed = true;
    }
    const applied = [], c = new DedupConsumer(e => applied.push(e.id));
    let deliveries = 0, crash = true;
    try {
      relay(db, e => {
        deliveries++;
        c.handle(e);
        if (crash) {
          crash = false;
          throw new Error("relay died before marking sent");
        }
      });
    } catch {}
    relay(db, e => (deliveries++, c.handle(e)));
    relay(db, e => (deliveries++, c.handle(e)));
    return [
      [failed, true],
      [db.orders.map(o => o.id), [1]],
      [db.outbox.length, 1],
      [deliveries, 2],
      [applied, ["evt-1"]],
      [db.outbox[0].sent, true]
    ];
  },
  "retry-breaker": () => {
    let t = 0;
    const b = new CircuitBreaker({ threshold: 2, coolMs: 1000, now: () => t });
    const bad = () => {
      throw new Error("503");
    };
    const res = fn => {
      try {
        return b.call(fn);
      } catch (e) {
        return e.message;
      }
    };
    const seq = [res(bad), res(bad), b.state, res(() => "ok")];
    t = 1500;
    seq.push(res(bad), b.state); // half-open trial fails: open again
    t = 3000;
    seq.push(res(() => "ok"), b.state);
    const waits = [0, 1, 2, 3, 10].map(a => backoff(a, { base: 100, cap: 1000, rand: () => 0.999 }));
    return [
      [seq, ["503", "503", "open", "circuit open", "503", "open", "ok", "closed"]],
      [waits, [99, 199, 399, 799, 999]]
    ];
  },
  "url-shortener": () => [
    [encode62(0), "0"],
    [encode62(61), "Z"],
    [encode62(62), "10"],
    [decode62(encode62(123456789)), 123456789],
    [encode62(62 ** 7 - 1).length, 7]
  ],
  "rate-limiter": () => {
    let t = 0;
    const l = new SlidingWindowLimiter(3, 1000, () => t);
    const burst = n => Array.from({ length: n }, () => l.allow("u"));
    const a = burst(4);
    t = 1500;
    const b = burst(3); // previous window still counts for half: 3 * 0.5 = 1.5
    t = 2000;
    const c = burst(2);
    t = 3500;
    const d = burst(4);
    return [
      [a, [true, true, true, false]],
      [b, [true, true, false]],
      [c, [true, false]],
      [d, [true, true, true, false]],
      [l.allow("someone-else"), true]
    ];
  },
  webhooks: () => {
    const codes = [500, 0, 429, 200];
    const r = deliver({ id: "e1" }, (_, a) => codes[a], { delay: a => backoff(a, { rand: () => 0.5 }) });
    const r2 = deliver({}, () => 400), r3 = deliver({}, () => 503, { maxAttempts: 3, delay: () => 0 });
    const body = '{"id":"e1"}', ts = 1700000000, header = `t=${ts},v1=${sign("whsec", ts, body)}`;
    return [
      [[r.result, r.log.map(x => x.status), r.log.map(x => x.waitBefore)], ["delivered", [500, 0, 429, 200], [0, 50, 100, 200]]],
      [[r2.result, r2.reason, r2.log.length], ["dead-letter", "permanent 400", 1]],
      [[r3.reason, r3.log.length], ["out of attempts", 3]],
      [verify("whsec", header, body, ts + 10), true],
      [verify("whsec", header, '{"id":"e2"}', ts + 10), false],
      [verify("whsec", header, body, ts + 1000), false],
      [verify("other", header, body, ts + 10), false],
      [verify("whsec", "garbage", body, ts), false]
    ];
  },
  "job-dispatch": () => {
    const jobs = new Map([["j1", { status: "open", version: 3 }]]);
    const won = [claim(jobs, "j1", "w2", 3), claim(jobs, "j1", "w1", 3), claim(jobs, "j1", "w4", 4)];
    const idx = new Map();
    const add = (w, lat, lng) => {
      const k = cellOf(lat, lng, 1);
      idx.set(k, [...(idx.get(k) ?? []), w]);
    };
    add("near1", 1.5, 1.5);
    add("near2", 2.5, 3.5);
    add("far", 4.5, 4.5);
    add("neg", -0.5, 2.5);
    return [
      [won, [true, false, false]],
      [[jobs.get("j1").assignee, jobs.get("j1").version], ["w2", 4]],
      [nearby(idx, 2.5, 2.5, 1).sort(), ["near1", "near2"]],
      [nearby(idx, 0.2, 2.5, 1).sort(), ["near1", "neg"]]
    ];
  },
  "news-feed": () => {
    const followers = new Map([["alice", ["u1", "u2", "u3"]], ["star", ["u1", "u2"]]]);
    const following = new Map([["u1", new Set(["alice", "star"])], ["u3", new Set(["alice"])]]);
    const celebs = new Set(["star"]), feeds = new Map(), postsBy = new Map([["star", [{ id: "s1", at: 2 }]]]);
    const w1 = publish(feeds, followers, "alice", { id: "a1", at: 1 }, celebs);
    const w2 = publish(feeds, followers, "star", { id: "s1", at: 2 }, celebs);
    publish(feeds, followers, "alice", { id: "a2", at: 3 }, celebs);
    const ids = u => readFeed(feeds, following, u, postsBy, celebs).map(p => p.id);
    const capped = new Map();
    for (let i = 0; i < 5; i++) publish(capped, followers, "alice", { id: i, at: i }, celebs, 3);
    return [
      [[w1, w2], [3, 0]],
      [ids("u1"), ["a2", "s1", "a1"]],
      [ids("u3"), ["a2", "a1"]],
      [capped.get("u1").map(p => p.id), [4, 3, 2]],
      [mergeNewest([[{ at: 5 }, { at: 1 }], [{ at: 4 }], []], 2).map(p => p.at), [5, 4]]
    ];
  },
  chat: () => {
    const ib = new InOrderInbox(), shown = [], gaps = [];
    for (const seq of [1, 3, 2, 3, 5, 4, 4]) {
      shown.push(...ib.receive({ seq }).map(m => m.seq));
      gaps.push(ib.gap());
    }
    return [
      [shown, [1, 2, 3, 4, 5]],
      [gaps, [null, [2, 2], null, null, [4, 4], null, null]]
    ];
  }  ,
  "app-builder": async () => {
    const files = new Map([["App.jsx", "<h1>Hi</h1>\n<p>Hi</p>"]]);
    const e = (path, search, replace) => ({ path, search, replace });
    const ok = applyEdits(files, [e("App.jsx", "<h1>Hi</h1>", "<h1>Salon</h1>"), e("Book.jsx", "", "form")]);
    const twice = applyEdits(files, [e("App.jsx", "Hi", "Yo")]);
    const half = applyEdits(files, [e("App.jsx", "<p>Hi</p>", "<p>x</p>"), e("App.jsx", "nope", "x")]);
    // model: 1st reply quotes text that isn't there, 2nd doesn't build, 3rd is fine
    const replies = [[e("App.jsx", "<h2>", "x")], [e("App.jsx", "<p>Hi</p>", "<p>{oops</p>")], [e("App.jsx", "<p>Hi</p>", "<p>Book now</p>")]];
    const seen = [];
    const model = async ({ feedback }) => (seen.push(feedback), replies[seen.length - 1]);
    const build = async f => ([...f.values()].join("").includes("{oops") ? "SyntaxError: unexpected end in App.jsx" : null);
    const project = { versions: [files] };
    const r = await generateUntilBuilds(project, "add booking", { model, build });
    const fail = { versions: [files] };
    const r2 = await generateUntilBuilds(fail, "x", { model: async () => [e("App.jsx", "nope", "x")], build, maxTries: 2 });
    const back = restore(project, 0);
    let t = 0;
    const pool = new SandboxPool({ warm: 2, idleMs: 1000, now: () => t });
    const opened = ["a", "b", "c", "a"].map(p => pool.open(p).cold);
    t = 500; pool.open("a");
    t = 1200; const stopped = pool.reap();
    return [
      [[ok.ok, ok.files.get("App.jsx"), ok.files.get("Book.jsx")], [true, "<h1>Salon</h1>\n<p>Hi</p>", "form"]],
      [twice, { ok: false, error: "search text matches twice in App.jsx" }],
      [[half.ok, files.get("App.jsx")], [false, "<h1>Hi</h1>\n<p>Hi</p>"]],
      [r, { ok: true, attempt: 3, version: 1 }],
      [seen, [null, "search text not found in App.jsx", "SyntaxError: unexpected end in App.jsx"]],
      [[r2.ok, fail.versions.length], [false, 1]],
      [[back, project.versions[2] === files], [2, true]],
      [opened, [false, false, true, false]],
      [stopped.sort(), ["sb2", "sb3"]]
    ];
  }
};

export const chapters = [
  {
    id: "data",
    title: "Data, caching and scale",
    blurb: "Where data lives, how it is copied, and how to read it fast.",
    ids: ["consistent-hash", "cache-aside", "quorum", "keyset"]
  },
  {
    id: "reliability",
    title: "Reliability",
    blurb: "Networks fail halfway through. These patterns make retries safe.",
    ids: ["idempotency", "outbox", "retry-breaker"]
  },
  {
    id: "problems",
    title: "Design problems",
    blurb: "Classic prompts, worked through the same 8 steps. Try each deep dive out loud before opening it.",
    ids: ["url-shortener", "rate-limiter", "webhooks", "job-dispatch", "news-feed", "chat", "app-builder"]
  }
];

// Building blocks have `how`; design problems have `prompt`.
export const meta = {
  "consistent-hash": {
    title: "Consistent hashing",
    what: "Spreads keys across servers so that adding or removing a server moves about 1/n of the keys, not nearly all of them.",
    how: "Hash every server onto a circle, many times each (virtual nodes) so the slices even out. Hash the key onto the same circle and walk clockwise to the first server point: that server owns the key. A new server only takes over the arcs just before its own points. Compare hash(key) % n: going from 3 to 4 servers moves about 3 in 4 keys, which empties every cache at once.",
    ops: [
      ["lookup", "O(log points), binary search on the sorted ring"],
      ["add or remove a server", "moves about 1/n of the keys"],
      ["virtual nodes", "more points per server = more even spread"],
      ["hash % n instead", "moves about (n-1)/n of the keys on resize"]
    ],
    when: [
      "Sharding a cache across servers",
      "Choosing the partition for a key in a distributed store",
      "Sticky routing: the same user to the same worker"
    ],
    traps: [
      "Without virtual nodes one server can own a huge arc and take most of the traffic.",
      "It spreads keys, not load per key. A hot key still lands on one server: replicate it or cache it locally.",
      "Moved keys are cold on the new server. Expect a short spike on the database."
    ],
    real: "Cassandra and DynamoDB place data on a token ring. Redis Cluster uses 16384 fixed hash slots, the same idea with a lookup table. Envoy and Nginx offer ring hash load balancing.",
    say: "hash mod n reshuffles almost everything when n changes. A ring with virtual nodes moves only about 1/n of the keys, and a lookup is a binary search."
  },
  "cache-aside": {
    title: "Caching: cache-aside, TTL, invalidation",
    what: "Read the cache first; on a miss read the database and fill the cache. On a write, update the database and delete the cache key.",
    how: "Reads: get the key from Redis; if it's missing, query the database and set the key with a TTL. Writes: update the database first, then delete the key so the next read refills it. Deleting is safer than setting, because two writers can set the cache in the wrong order and leave a stale value with nothing to fix it. The TTL is the safety net: if an invalidation is ever lost, the stale value still dies when the key expires. When a hot key expires, hundreds of requests miss at the same moment and all hit the database (a stampede). Single-flight makes them share one query.",
    ops: [
      ["hit", "about 1 ms (Redis)"],
      ["miss", "a database query (often 5 to 50 ms) plus a cache write"],
      ["stale for at most", "the TTL, if an invalidation is lost"],
      ["memory", "capped by maxmemory with an eviction policy like allkeys-lru"]
    ],
    when: [
      "Read heavy data that can be a little stale: profiles, settings, product pages",
      "Expensive queries and aggregates",
      "Not for balances or stock counts at checkout: read those from the primary"
    ],
    traps: [
      "Setting the cache on write instead of deleting: a race leaves it stale.",
      "No TTL: one lost invalidation means stale forever.",
      "Hot key stampede: single-flight, refresh slightly before expiry, and add random jitter to TTLs so keys don't all expire together.",
      "Not caching misses: requests for ids that don't exist go straight to the database every time."
    ],
    real: "Redis or Memcached in front of Postgres or MySQL. A CDN is cache-aside for HTTP, with Cache-Control as the TTL. Facebook's memcache paper uses delete on write, plus leases against stampedes.",
    say: "Cache-aside with a TTL. On writes I update the database, then delete the key rather than set it, so racing writers can't leave it stale. Hot keys get single-flight, so one expiry doesn't become a thousand queries."
  },
  quorum: {
    title: "Replication and quorums",
    what: "Keep N copies. Write to W of them, read from R. If R + W > N, every read overlaps the latest write.",
    how: "With N = 3, W = 2, R = 2, any 2 replicas you read share at least one with the 2 that took the write, so taking the highest version gives the newest value. W = 1 and R = 1 is faster, but a read can hit a replica that missed the write. Leader and follower databases like Postgres and MySQL face the same trade: replicas lag, so reading your own write needs the primary, or a replica that has caught up.",
    ops: [
      ["R + W > N", "reads see the latest write"],
      ["R + W <= N", "faster, may read stale"],
      ["W = N", "one slow replica slows every write"],
      ["replica lag", "usually milliseconds, can be seconds under load"]
    ],
    when: [
      "Explaining consistency choices in any design",
      "Read after write bugs: the user saves, refreshes, sees the old value",
      "Deciding which reads may go to replicas"
    ],
    traps: [
      "Quorums are not transactions. Two writers can still conflict; last write wins silently drops one of them.",
      "Sloppy quorums and hinted handoff weaken the guarantee during failures.",
      "Reads from a replica right after a write: send that user's reads to the primary for a short while, or wait for the replica to reach the write's position."
    ],
    real: "Cassandra and DynamoDB let you choose per request (QUORUM, ONE, strongly consistent reads). Kafka uses acks=all with min.insync.replicas. Postgres has synchronous_commit and synchronous standbys.",
    say: "With N copies, R + W > N guarantees overlap, so reads see the latest write. Lowering R or W buys latency with staleness, and I'd say which reads can live with that."
  },
  keyset: {
    title: "Pagination: offset vs cursor",
    what: "OFFSET pages repeat or skip rows when data changes, and get slower the deeper you go. A cursor, the last row's sort key, does neither.",
    how: "OFFSET 10000 LIMIT 20 makes the database read and throw away 10000 rows. If a row is inserted between page 1 and page 2, everything shifts by one and the user sees a duplicate. Keyset pagination keeps the last row's sort key and asks for rows after it: WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 20. With an index on (created_at, id) every page is one index seek, page 1 or page 10000. The id breaks ties so rows with equal timestamps are never skipped.",
    ops: [
      ["offset, page k", "scans about k x size rows"],
      ["keyset, any page", "scans about size rows, with the right index"],
      ["jump to page 57", "offset can, keyset can't (next and previous only)"],
      ["stable while rows are inserted", "keyset yes, offset no"]
    ],
    when: ["Feeds, infinite scroll, activity logs", "API list endpoints (return an opaque next cursor)", "Batch jobs that walk a whole table"],
    traps: [
      "Sorting by a non unique column alone skips ties. Add the id.",
      "The index must match the ORDER BY, columns and direction.",
      "Return the cursor as an opaque string, so clients don't build it and you can change it later."
    ],
    real: "Stripe (starting_after), GitHub GraphQL (after) and Slack (cursor) all page with cursors. Postgres and MySQL both support row comparisons like (a, b) < (x, y).",
    say: "Offset rescans and shifts when rows are inserted. I'd page with a cursor on (created_at, id) and a matching index, so every page is one index seek."
  },
  idempotency: {
    title: "Idempotency keys",
    what: "Lets a client safely retry a request that changes something, such as a payment, without doing it twice.",
    how: "A timeout is ambiguous: the server may or may not have done the work. So the client sends a unique key per operation in an Idempotency-Key header. The server claims the key before doing anything (a UNIQUE row, or Redis SET NX). The same key with the same body gets the stored response replayed, and the work does not run again. The same key with a different body is a client bug: reject it. If the first request is still running, answer 409 so the client tries again shortly. Keys expire after a day or so.",
    ops: [
      ["first request", "claim the key, do the work, store the response"],
      ["retry, same body", "replay the stored response"],
      ["retry, different body", "422"],
      ["retry while the first is running", "409, try again"]
    ],
    when: [
      "Payments, payouts, orders, anything that moves money or sends messages",
      "Any POST a mobile client might retry after a timeout",
      "Queue consumers: the message id is the key"
    ],
    traps: [
      "Claiming the key after the work: two concurrent retries both run.",
      "Keys stored in a different database from the side effect: a crash between the two breaks the guarantee. Use one transaction where you can.",
      "A natural key beats a random one when it exists, such as (invoice_id, attempt)."
    ],
    real: "Stripe's Idempotency-Key header is the reference design. AWS APIs take a client token. Kafka's idempotent producer uses a producer id plus a sequence number.",
    say: "Timeouts are ambiguous, so writes take an idempotency key. I claim it first, in the same database as the side effect, and replay the stored response on retries."
  },
  outbox: {
    title: "Transactional outbox",
    what: "Saves a row and the event about it in one database transaction, then publishes the event. No lost events, and no events for rows that rolled back.",
    how: "The bug it fixes: save the order, then publish to Kafka. If the process dies between the two, the order exists and nobody hears about it. Publish first instead, and a failed insert leaves an event for an order that doesn't exist. So insert the event into an outbox table in the same transaction as the order. A relay (a poller, or change data capture like Debezium reading the write ahead log) publishes unsent rows and marks them sent. The relay can die after publishing and before marking, so it publishes again: delivery is at least once. Consumers record processed event ids and skip repeats, which makes the effect exactly once.",
    ops: [
      ["write path", "one local transaction, no two phase commit"],
      ["delivery", "at least once"],
      ["effect", "exactly once, if consumers dedupe"],
      ["delay", "the poll interval, or near real time with change data capture"]
    ],
    when: [
      "A service must update its database and tell other services",
      "Webhooks, emails and search indexing after a write",
      "Anywhere you see a dual write to a database and a queue"
    ],
    traps: [
      "Dual writes pass every test and lose events in production, on deploys and crashes.",
      "Consumers that aren't idempotent turn at least once into double charges.",
      "If order matters, publish per entity in order (partition by order id).",
      "Delete sent outbox rows, or the table grows forever."
    ],
    real: "Debezium has an outbox event router. Many teams run a plain poller with SELECT ... FOR UPDATE SKIP LOCKED so several relays can share the work.",
    say: "I don't dual write. The event goes into an outbox table in the same transaction, a relay publishes it at least once, and consumers dedupe on the event id, so the effect happens once."
  },
  "retry-breaker": {
    title: "Retries, backoff and circuit breakers",
    what: "Retries fix blips. Backoff with jitter stops retries from becoming an attack on your own systems. A circuit breaker stops calling a dependency that is down.",
    how: "Retry only what is safe to repeat (idempotent calls) and only errors that might go away: timeouts, 429, 5xx. Wait longer each time, doubling, with random jitter so a thousand clients don't retry at the same instant. Full jitter means wait a random time between 0 and base x 2^attempt, with a cap. A circuit breaker counts failures in a row. Past a threshold it opens and fails fast for a cool-down, which frees your threads and gives the dependency room to recover. Then one trial call goes through (half-open): success closes the breaker, failure opens it again.",
    ops: [
      ["closed", "calls go through, failures are counted"],
      ["open", "fail fast, no calls made"],
      ["half-open", "one trial call decides"],
      ["retry budget", "cap retries, for example at 10% extra load"]
    ],
    when: [
      "Every call to another service or a third party API",
      "Workers calling flaky partners: SMS, payments, webhooks",
      "Anywhere a slow dependency could pile up threads or connections"
    ],
    traps: [
      "Retries at every layer multiply: 3 layers x 3 retries = 27 calls. Retry in one layer.",
      "Retrying non idempotent writes without an idempotency key.",
      "No timeouts: a call that hangs never fails, so nothing trips. Set timeouts first.",
      "Fixed delays without jitter sync clients into waves."
    ],
    real: "AWS SDKs use exponential backoff with jitter. Resilience4j, Polly and opossum (Node) implement breakers. Envoy and Istio do the same at the network layer with outlier detection.",
    say: "Timeouts first. Then retries only on idempotent calls, with capped exponential backoff and full jitter. Then a breaker, so a dead dependency fails fast instead of eating every thread."
  },

  "url-shortener": {
    title: "URL shortener",
    prompt: "Design a service that turns long URLs into short links and redirects visitors. Assume 100M new links a month and 100 reads for every write.",
    clarify: [
      "Custom aliases? Do links expire?",
      "Do we need click analytics?",
      "Can links be edited or deleted?",
      "Is it a problem if codes are guessable?"
    ],
    numbers: [
      ["writes", "100M a month, about 40 per second"],
      ["reads", "100 x writes, about 4,000 per second, peaks maybe 10x"],
      ["storage", "100M x 12 x 5 years x about 500 bytes, about 3 TB"],
      ["code length", "62^7 is about 3.5 trillion, so 7 characters is plenty"]
    ],
    api: "POST /urls { url, alias?, expiresAt? }   201 { code, shortUrl }\nGET  /{code}                             302, Location: url\nGET  /urls/{code}/stats                  { clicks, ... }",
    data: "urls(code PRIMARY KEY, long_url, owner_id, created_at, expires_at)\nclicks: events to a log (Kafka), counted in batches",
    deep: [
      ["How do you make the code?", "A counter encoded in base62. The counter is a database sequence, or each server takes a block of a million ids at a time so servers never coordinate per request. No collisions, no retry loop. If codes must not be guessable, pass the counter through a reversible shuffle, or use random codes with a unique constraint and retry on the rare collision."],
      ["301 or 302?", "301 is cached by browsers forever, so you stop seeing repeat clicks. Use 302 if analytics matter."],
      ["How do redirects stay fast at peak?", "They are pure lookups of data that never changes. CDN or edge cache first, then Redis, then the database. Cache for a long time."],
      ["Counting clicks without a hot row?", "Don't UPDATE a counter on every click. Write click events to a log and aggregate them in batches."]
    ],
    failures: [
      ["Redis is down", "Reads fall through to database replicas. Size them for it, or shed load."],
      ["Sequence or id service is down", "Servers already hold a block of ids, so writes continue for a while."],
      ["Abuse and phishing links", "Scan URLs in the background, block lists, rate limit link creation."]
    ],
    tradeoffs: [
      "Counter codes are simple and collision free; random codes hide your volume.",
      "Strong consistency when creating a link, eventual consistency for stats."
    ],
    say: "It's a read heavy key value lookup. Codes come from a counter in base62, and 7 characters covers trillions. Redirects are served from a CDN and Redis, and clicks go to a log that is counted in batches, never a counter update per click."
  },
  "rate-limiter": {
    title: "Distributed rate limiter",
    prompt: "Limit each API key to N requests per minute, across a fleet of API servers.",
    clarify: [
      "Limit per user, per IP, per key, per endpoint?",
      "Must it be exact, or is slightly over fine?",
      "What does a rejected caller get? 429 with Retry-After?",
      "If the limiter breaks, should traffic be blocked or allowed?"
    ],
    numbers: [
      ["traffic", "say 50k requests per second across 30 servers"],
      ["state", "2 counters per key per window, a few bytes each"],
      ["Redis", "one INCR per request; one shard does about 100k operations a second, so shard by key past that"]
    ],
    api: "Middleware, not an endpoint:\n  allow(key)  true or false\nResponse headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After",
    data: "Redis: rl:{key}:{window}  count, with EXPIRE of 2 windows\n(or a Lua script, so read and increment happen in one step)",
    deep: [
      ["Which algorithm?", "Fixed window is simplest but lets 2N through around the window boundary. Sliding log is exact but stores every timestamp. Sliding window counter weights the previous window by how much of it still overlaps: two integers per key and close to exact. Token bucket allows controlled bursts."],
      ["Why not count in each server's memory?", "Each server sees only its share of traffic, so local counters let N x servers through. A local limiter is still a useful cheap first layer."],
      ["Race conditions?", "GET then SET races between servers. Use INCR, which is atomic, or a Lua script that reads and updates in one step."],
      ["What does it cost per request?", "One Redis round trip, about 1 ms in the same zone. To go cheaper, count locally and sync every 100 ms, trading accuracy for speed."]
    ],
    failures: [
      ["Redis is down", "Fail open (allow and log) for most APIs. Fail closed for login and other abuse targets."],
      ["One abusive key", "It hits one Redis shard hard; a local limiter in front absorbs it."],
      ["Clock skew between servers", "Take window ids from one clock, such as Redis TIME."]
    ],
    tradeoffs: [
      "Accuracy costs a network hop on every request.",
      "Fail open favours availability; fail closed favours protection."
    ],
    say: "A sliding window counter in Redis: two integers per key, atomic INCR, a TTL for cleanup. Rejected calls get 429 with Retry-After. If Redis is down I fail open for normal APIs and closed for login."
  },
  webhooks: {
    title: "Notification and webhook delivery",
    prompt: "When something happens, such as a job being assigned or a payment settling, notify customers by webhook, email and push. Customer endpoints are slow and sometimes down.",
    clarify: [
      "Which channels? Does order matter per customer?",
      "Is at least once fine? (Exactly once over HTTP is not possible.)",
      "How long do we keep retrying?",
      "Do customers need to see and replay failed deliveries?"
    ],
    numbers: [
      ["events", "say 5M a day, about 60 per second, peaks 10x"],
      ["slow endpoints", "a 10 second timeout at 600 per second means 6,000 requests in flight, so use async workers, not request threads"],
      ["retention", "keep 30 days of attempts for the replay screen"]
    ],
    api: "POST /webhook-endpoints { url, events[] }   { id, secret }\nDelivery: POST customer_url\n  Webhook-Id: evt_123\n  Webhook-Signature: t=1700000000,v1=<hmac>\n  { id, type, created, data }",
    data: "outbox(event_id, type, payload, created_at)\ndeliveries(event_id, endpoint_id, attempt, status, next_attempt_at)\nendpoints(id, url, secret, disabled_at)",
    deep: [
      ["Where do events come from?", "A transactional outbox, written in the same transaction as the business change and published by a relay. No lost events."],
      ["Retry schedule?", "Exponential backoff with jitter spread over about a day, then a dead letter queue. Retry timeouts, 408, 429 and 5xx. Other 4xx means the request itself is wrong: stop."],
      ["Can one slow customer slow everyone?", "Not if each endpoint has its own queue or concurrency limit. Endpoints that fail for days get disabled and the owner gets an email."],
      ["How do customers trust it?", "An HMAC signature over timestamp and body, a constant time compare, and old timestamps rejected so captured requests can't be replayed. They dedupe on the event id, because retries mean duplicates."]
    ],
    failures: [
      ["Customer endpoint down", "Backoff, then the dead letter queue, then a replay button."],
      ["Our worker dies mid send", "The message reappears after its visibility timeout. At least once; the customer dedupes."],
      ["Email provider outage", "The breaker opens, the queue grows, and it drains when the provider recovers."]
    ],
    tradeoffs: [
      "At least once plus dedupe beats chasing exactly once.",
      "Strict order per customer costs throughput; most receivers only need ids and timestamps."
    ],
    say: "Outbox into a queue. Workers send signed requests with exponential backoff and jitter, and give up into a dead letter queue with replay. Each endpoint is isolated, so one dead customer can't starve the rest. Delivery is at least once, so every event has an id to dedupe on."
  },
  "job-dispatch": {
    title: "Job dispatch marketplace",
    prompt: "Businesses post jobs with a place and a time window. Nearby qualified workers see them, and one worker gets each job. Design matching and assignment.",
    clarify: [
      "First come first served, or does the business choose from offers?",
      "How near is near? Filters for skills and ratings?",
      "How many jobs a day, how many workers online?",
      "What happens when an assigned worker cancels?"
    ],
    numbers: [
      ["jobs", "say 50k a day, about 1 per second, bursty in business hours"],
      ["workers online", "100k, each sending location every 30 s, about 3k writes per second"],
      ["nearby search", "should answer in about 100 ms"]
    ],
    api: "POST /jobs { location, skills, window }     { jobId }\nGET  /jobs/nearby?lat=..&lng=..&radius=..   [jobs]\nPOST /jobs/{id}/claim { version }          200 assigned, or 409 taken",
    data: "jobs(id, status, location, skills, version, assignee_id)  with a geo index\nworker locations: Redis GEO, overwritten, never the main database\njob_events: one row per state change (audit + outbox)",
    deep: [
      ["How do you find nearby fast?", "A geo index: PostGIS with a GiST index, Redis GEOSEARCH, or geohash or H3 cells. Look in the job's cell and its neighbours, then filter by exact distance, skills and rating."],
      ["Two workers tap Accept at once?", "A conditional update: UPDATE ... WHERE id = ? AND status = 'open' AND version = ?. One row updated means you won; zero rows means 409. The row is the lock, no distributed lock needed."],
      ["How are workers told?", "Push offers to workers in nearby cells, best matches first, in waves: the top 10, then wider after a short wait."],
      ["How do you keep states sane?", "A state machine: open, assigned, in progress, done, cancelled. Every transition is a conditional update plus an outbox event."]
    ],
    failures: [
      ["Worker accepts, then goes silent", "A check-in deadline. Missed, the job goes back to open with a new version."],
      ["Push notifications are slow", "Workers can also pull the list. Push is a hint, not the source of truth."],
      ["Location updates spike", "Locations are hot, disposable data: Redis only, latest wins, no database writes."]
    ],
    tradeoffs: [
      "First come first served is simple and fast; offers plus a choice are fairer but slower.",
      "Geohash cells shard easily; PostGIS is easier to query."
    ],
    say: "A geo index finds candidates, offers go out in waves, and claiming is a conditional UPDATE on status and version, so exactly one worker wins without locks. Every state change also writes an outbox event."
  },
  "news-feed": {
    title: "News feed",
    prompt: "Users follow other users and see a feed of recent posts from the people they follow, newest first.",
    clarify: [
      "Chronological or ranked?",
      "Are there accounts with millions of followers?",
      "How fresh must the feed be?",
      "How many reads per write?"
    ],
    numbers: [
      ["feed reads", "say 10M daily users x 10 reads, about 1,200 per second"],
      ["posts", "1M a day, about 12 per second, 200 followers each on average"],
      ["fan-out on write", "12 x 200 = 2,400 list pushes per second is fine; one post by an account with 5M followers is not"]
    ],
    api: "POST /posts { text, media }   { id }\nGET  /feed?cursor=...         { items, next }",
    data: "posts(id, author_id, created_at, body), sharded by author\nfollows(follower_id, followee_id), indexed both ways\nfeed:{user}  Redis list of post ids, capped at about 800",
    deep: [
      ["Push or pull?", "Push (fan-out on write) copies the post id into each follower's list, so a read is one fast list read. Pull (fan-out on read) gathers posts from everyone you follow at read time: cheap writes, slow reads. Hybrid: push for normal authors, pull for huge accounts, merge at read time."],
      ["What goes in the cache?", "Post ids only. Bodies come from a post cache by id, so edits and deletes show everywhere at once."],
      ["Inactive users?", "Don't fan out to them. Rebuild their feed when they come back."],
      ["Paging?", "A cursor on (created_at, id), so new posts don't shift pages."]
    ],
    failures: [
      ["Fan-out queue backs up", "Feeds are late, not wrong. Posts still appear on the author's page."],
      ["Feed cache lost", "Rebuild from posts and follows, lazily on the next read."],
      ["Huge account posts", "Never fanned out; merged in at read time."]
    ],
    tradeoffs: [
      "Push: fast reads, many writes. Pull: few writes, slow reads.",
      "Ranking adds a scoring service. Leave it out unless asked."
    ],
    say: "Hybrid fan-out: normal authors push post ids into their followers' Redis lists, and huge accounts are merged in at read time. The cache holds ids only, bodies are loaded by id, and pages use a cursor."
  },
  chat: {
    title: "Chat and real-time messaging",
    prompt: "One to one and group chat, delivered to online users in real time, with history and sync for users who were offline.",
    clarify: [
      "Largest group size?",
      "Read receipts, typing indicators?",
      "Keep history forever?",
      "End to end encryption?"
    ],
    numbers: [
      ["connections", "say 1M online; one gateway holds about 50k WebSockets, so about 20 gateways"],
      ["messages", "100M a day, about 1,200 per second, peaks 10x"],
      ["storage", "100M x 200 bytes, about 20 GB a day"]
    ],
    api: "WebSocket send    { convId, clientMsgId, body }   ack { seq }\nWebSocket receive { convId, seq, from, body }\nGET /conversations/{id}/messages?afterSeq=...    (sync after reconnect)",
    data: "messages(conv_id, seq, sender_id, body, created_at)  PRIMARY KEY (conv_id, seq)\npresence: user to gateway server, in Redis with a heartbeat TTL",
    deep: [
      ["How do you keep order?", "Per conversation, not globally. One sequence counter per conversation (Redis INCR, or a single owner per conversation). Clients sort by seq."],
      ["How do you avoid duplicates?", "The client sends a clientMsgId and the server dedupes on it, so resending after a lost ack doesn't post twice."],
      ["How does a message reach the right server?", "Look up the recipient's gateway in the presence map and forward via pub/sub. If they are offline, store it and send a push notification."],
      ["What happens on reconnect?", "The client sends the last seq it saw and gets everything after it. A gap in seq numbers tells the client something is missing."]
    ],
    failures: [
      ["A gateway dies", "Clients reconnect to another one and sync from their last seq."],
      ["Pub/sub drops a message", "The client sees a seq gap and fetches the missing range."],
      ["A huge group", "Fan out through a queue, not inline; very large channels are pulled when opened."]
    ],
    tradeoffs: [
      "WebSockets for real time, long polling as a fallback.",
      "Order per conversation is cheap. Global order is expensive and nobody needs it."
    ],
    say: "WebSocket gateways with a presence map in Redis. Each conversation has its own sequence number, so clients order by seq, dedupe by client message id, and fill gaps after a reconnect by asking for everything after the last seq they saw."
  },
  "app-builder": {
    title: "AI app builder like Lovable",
    prompt: "A user describes an app in plain words (\"a booking site for my salon\") and gets a working web app: generated code, a live preview that updates as the AI edits, chat to change it, undo, and one click deploy.",
    clarify: [
      "One fixed stack, or any stack the user asks for?",
      "Backend and database too, or front end only?",
      "Can users also edit the code by hand?",
      "How many projects open at once, and how long do previews stay up?",
      "Paid in credits? Then every model call is metered."
    ],
    numbers: [
      ["prompts", "say 100k daily users x 20 prompts = 2M a day, about 25 a second, peaks 5x"],
      ["one generation", "10 to 60 seconds and tens of thousands of tokens; the model is the slowest and most expensive part"],
      ["previews", "say 20k projects open at peak, one small sandbox each (0.25 CPU, 512 MB)"],
      ["storage", "a project is under 1 MB of source; files stored once by hash, so a new version costs only the changed files"]
    ],
    api: "POST /projects                  { prompt }   { projectId }\nPOST /projects/{id}/messages     { text }     stream: tokens, file edits, build status\nGET  /projects/{id}/versions\nPOST /projects/{id}/restore      { version }\nPOST /projects/{id}/deploy                    { url }",
    data: "projects(id, owner_id, live_version)\nversions(project_id, n, parent_n, tree_hash, prompt, created_at)\nblobs(hash, bytes)   in object storage, shared by all versions\nmessages(project_id, seq, role, text)\nusage(user_id, day, tokens, credits)",
    deep: [
      ["How does the AI change code safely?", "It returns small search and replace edits, not whole files. That uses fewer tokens, is faster, and can't silently drop code the model didn't mention. Edits apply all or nothing. A search text that is missing or matches twice is an error that goes back to the model."],
      ["What if the code doesn't build?", "Build it (type check and bundle) in the sandbox. On failure, send the error back to the model and try again, up to 3 times. Only a version that builds goes live, so the preview never shows a broken app. After 3 tries, keep the last good version and show the error."],
      ["How does the live preview work?", "Each open project gets a sandbox (a container or microVM) running the dev server. Edits are written into it and hot reload updates the preview iframe. Booting takes seconds, so keep a pool of warm sandboxes and stop ones idle for 10 minutes. A stopped project boots again from its latest version."],
      ["How do undo and history work?", "Every applied set of edits is a new version that never changes: a tree of file hashes, with each file's content stored once. Undo makes an old version the newest one again, so nothing is lost. This is how git works, and you can simply use git."],
      ["How do you stream progress?", "One request streams events (SSE or WebSocket): model tokens, each file edit, build started, build passed. The job runs in a worker, not in the request, so if the connection drops the client reconnects and replays events after the last one it saw."],
      ["How does the model see a big project?", "Not the whole repo every time. Send the file tree and the files most related to the request (by name, imports, recent edits or embedding search), and let the model ask for more files with a tool call."],
      ["How do you stop abuse and runaway cost?", "Check credits before each call and record tokens after, rate limit per user, cap tries per prompt. Sandboxes get no secrets, limited CPU and memory, and outbound network only through an allowlist."]
    ],
    failures: [
      ["Model provider slow or down", "Queue the job and show progress; fail over to a second model. Never leave edits half applied."],
      ["Edits don't apply", "All or nothing; the exact error goes back to the model."],
      ["Build keeps failing", "Stop after 3 tries, keep the last good version live, show the error."],
      ["Sandbox dies", "Boot a new one from the latest version. Version storage is the source of truth, not the container."],
      ["Generated code tries to escape", "MicroVM or gVisor isolation, no credentials inside, egress allowlist, CPU and memory limits."]
    ],
    tradeoffs: [
      "One fixed stack: much more reliable output, less freedom.",
      "Search and replace edits: cheaper and safer than whole files, but the model must quote text exactly.",
      "Warm sandbox pool: instant previews, but you pay for idle containers.",
      "Build gate: slower replies, but users never see a broken preview."
    ],
    say: "Each prompt runs as a job. The model returns search and replace edits that apply all or nothing, we build in the project's sandbox, and feed errors back up to 3 times. Only a version that builds goes live. Versions are immutable trees of files stored by hash, so undo just points at an older one, and previews run in a warm pool of isolated sandboxes."
  }
};
