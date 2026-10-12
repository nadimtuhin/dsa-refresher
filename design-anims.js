// Animations for Part 3. Same contract as anims.js: replay the logic, return [ownAnswer, testedAnswer].
import * as D from "./design.js";

const cell = v => (v == null ? "" : String(v));
const show = v => (Array.isArray(v) ? "[" + v.join(", ") + "]" : typeof v === "string" ? `"${v}"` : String(v));
const NONE = { toString: () => "none" }; // shown bare, without quotes
const A = (label, items, hi = {}, ptr = {}) => ({ t: "array", label, items: items.map(cell), hi, ptr });
const KV = (label, entries, hi) => ({ t: "kv", label, entries: [...entries].map(([k, v]) => [cell(k), cell(v)]), hi: hi == null ? null : cell(hi) });
const V = vars => ({ t: "vars", vars: Object.entries(vars).map(([k, v]) => [k, show(v)]) });
const idx = (arr, cls) => Object.fromEntries(arr.map(i => [i, cls]));

export const designAnims = {
  "consistent-hash": f => {
    // tiny ring: 3 servers x 2 points, positions shown as hash % 100 so the order is readable
    const ring = new D.HashRing(2), keys = ["user:1", "user:2", "user:3", "user:7", "user:4", "user:8"];
    ["A", "B", "C"].forEach(s => ring.add(s));
    const pos = h => Math.round((h / 2 ** 32) * 100);
    const snap = (note, owners, changed = []) => f(note,
      A("ring points, clockwise (position 0 to 99)", ring.ring.map(([h, s]) => `${pos(h)} ${s}`), Object.fromEntries(ring.ring.map(([, s], i) => [i, s === "D" ? "cur" : ""]).filter(x => x[1]))),
      A("keys", keys.map(k => `${k} @${pos(D.hash32(k))}`)),
      A("owner", owners, idx(changed, "bad")));
    const before = keys.map(k => ring.get(k));
    snap("3 servers, each hashed onto the circle twice. A key belongs to the first server point clockwise from its own position.", before);
    ring.add("D");
    const after = keys.map(k => ring.get(k)), moved = keys.map((_, i) => i).filter(i => before[i] !== after[i]);
    snap(`Add server D (yellow points). Only keys that fall just before a D point move: ${moved.length} of ${keys.length} (red), and every one of them went to D.`, after, moved);
    const modBefore = keys.map(k => "ABC"[D.hash32(k) % 3]), modAfter = keys.map(k => "ABCD"[D.hash32(k) % 4]);
    const modMoved = keys.map((_, i) => i).filter(i => modBefore[i] !== modAfter[i]);
    snap(`Compare hash % n going from 3 to 4 servers: ${modMoved.length} of ${keys.length} keys move, so almost every cache entry is now in the wrong place.`, modAfter, modMoved);
    ring.remove("D");
    const back = keys.map(k => ring.get(k));
    snap("Remove D again: its keys go back to the next server clockwise, and nothing else moves.", back, moved);
    return [back.join(), before.join()];
  },

  "cache-aside": f => {
    let t = 0;
    const cache = new D.TtlCache(1000, () => t), db = new Map([["user:1", "Ana"]]), log = [];
    const snap = (note, hit) => f(note, KV("cache (TTL 1s)", [...cache.m].map(([k, e]) => [k, `${e.val}, expires ${e.exp / 1000}s`]), hit), KV("database", db, hit), V({ clock: `${t / 1000}s` }), A("reads", log, Object.fromEntries(log.map((x, i) => [i, x.endsWith("cache") ? "ok" : "cmp"]))));
    snap("Empty cache. The database has the truth.");
    const read = note => { const r = D.readThrough(cache, db, "user:1"); log.push(`${r.val} from ${r.from}`); snap(note(r), "user:1"); return r; };
    read(r => `Read user:1: cache miss, so read the database (${r.val}) and store it in the cache with a 1s TTL.`);
    t = 300; read(() => "Read again: cache hit. No database query.");
    t = 400; D.writeAndInvalidate(cache, db, "user:1", "Bea"); snap("Update the name to Bea: write the database first, then DELETE the cache key. Deleting, not setting, so racing writers can't leave an old value behind.", "user:1");
    t = 500; read(r => `Next read misses and loads the new value, ${r.val}.`);
    t = 1600; const last = read(() => "1.1s later the entry has expired, so the read goes to the database again. The TTL is the safety net if an invalidation is ever lost.");
    return [[log.length, last.val, last.from], [4, "Bea", "db"]];
  },

  quorum: f => {
    const reps = [0, 1, 2];
    const run = (w, r, ws, rs) => {
      const s = new D.QuorumStore(3, w, r);
      s.write("x", "old", () => reps);
      s.write("x", "new", () => ws);
      return [s, s.read("x", () => rs)];
    };
    const draw = (note, s, ws, rs, got) => f(note,
      A("replicas", s.reps.map((m, i) => `R${i}: ${m.get("x")?.val}`), { ...idx(ws, "cmp"), ...idx(rs.filter(i => !ws.includes(i)), "cur"), ...idx(rs.filter(i => ws.includes(i)), "ok") }),
      V({ N: 3, W: s.w, R: s.r, "R + W": s.w + s.r, read: got }));
    let [s, a] = run(2, 2, [0, 1], [1, 2]);
    draw("N = 3, W = 2, R = 2. The write reached R0 and R1 (blue). The read asks R1 and R2: R1 overlaps (green) and has the newer version.", s, [0, 1], [1, 2], a);
    [s, a] = run(2, 2, [0, 1], [2, 0]);
    draw("Any 2 replicas you read share at least one with the 2 that took the write, because 2 + 2 > 3. The read takes the highest version: new.", s, [0, 1], [2, 0], a);
    let b;
    [s, b] = run(1, 1, [0], [2]);
    draw("N = 3, W = 1, R = 1. Faster, but 1 + 1 is not more than 3. The write reached only R0 and the read asked only R2, so it returns the stale value.", s, [0], [2], b);
    let c;
    [s, c] = run(3, 1, [0, 1, 2], [2]);
    draw("W = 3, R = 1 also works (3 + 1 > 3): every replica has the write, so any one read is fresh. But one slow replica now slows every write.", s, [0, 1, 2], [2], c);
    return [[a, b, c], ["new", "old", "new"]];
  },

  keyset: f => {
    const rows = [1, 2, 3, 4, 5, 6].map(id => ({ id, at: Math.ceil(id / 2) }));
    const lbl = rs => [...rs].sort((x, y) => y.at - x.at || y.id - x.id).map(r => `#${r.id} t${r.at}`);
    const ord = () => [...rows].sort((x, y) => y.at - x.at || y.id - x.id).map(r => r.id);
    const where = (ids, cls) => Object.fromEntries(ids.map(id => [ord().indexOf(id), cls]));
    const p1 = D.offsetPage(rows, 0, 2).map(r => r.id), k1 = D.keysetPage(rows, null, 2);
    f("Rows newest first, sorted by (time, id). Page 1 with size 2 is #6 and #5 either way.", A("rows", lbl(rows), where(p1, "ok")), V({ cursor: `t${k1.next.at}, #${k1.next.id}` }));
    rows.push({ id: 7, at: 9 });
    f("A new row #7 arrives before the user asks for page 2. Everything shifts down by one place.", A("rows", lbl(rows), where([7], "cur")));
    const p2 = D.offsetPage(rows, 1, 2).map(r => r.id);
    f(`OFFSET 2 LIMIT 2 now returns #${p2.join(", #")}. #5 was already on page 1, so the user sees it twice.`, A("rows", lbl(rows), { ...where(p2, "cmp"), ...where(p1.filter(id => p2.includes(id)), "bad") }));
    const k2 = D.keysetPage(rows, k1.next, 2).items.map(r => r.id);
    f(`Cursor instead: WHERE (time, id) < (t${k1.next.at}, #${k1.next.id}). Returns #${k2.join(", #")}: no repeats, no skips, and it is one index seek however deep you go.`, A("rows", lbl(rows), where(k2, "ok")), V({ cursor: `t${k1.next.at}, #${k1.next.id}` }));
    return [[p2, k2], [D.offsetPage(rows, 1, 2).map(r => r.id), D.keysetPage(rows, k1.next, 2).items.map(r => r.id)]];
  },

  idempotency: f => {
    const s = new D.IdempotencyStore(), charges = [];
    const run = () => { charges.push(`charge ${charges.length + 1}`); return { status: 201, body: `ch_${charges.length}` }; };
    const snap = (note, key, res) => f(note, KV("stored keys", [...s.m].map(([k, v]) => [k, v.res ? `${v.res.status} ${v.res.body}` : "processing"]), key), A("money moved", charges, idx(charges.map((_, i) => i), "ok")), V({ response: res ? `${res.status} ${res.body}` : "-" }));
    snap("Client sends POST /payments with Idempotency-Key: k1.");
    const a = s.handle("k1", { amt: 5 }, run);
    snap("New key: claim it, charge the card, store the response next to the key.", "k1", a);
    const b = s.handle("k1", { amt: 5 }, run);
    snap("The response was lost on a bad connection, so the client retries with the same key. Stored response replayed; no second charge.", "k1", b);
    const c = s.handle("k1", { amt: 9 }, run);
    snap("Same key, different amount: a client bug. Reject with 422 instead of guessing.", "k1", c);
    const d = s.handle("k2", { amt: 1 }, run);
    snap("A different key is a different payment, so it charges.", "k2", d);
    return [[charges.length, b.body, c.status], [2, "ch_1", 422]];
  },

  outbox: f => {
    const db = D.memDb(), applied = [], c = new D.DedupConsumer(e => applied.push(e.id)), sent = [];
    const snap = (note, hi = {}) => f(note, A("orders table", db.orders.map(o => `order ${o.id}`), hi.orders), A("outbox table", db.outbox.map(e => `${e.id} ${e.sent ? "sent" : "unsent"}`), hi.outbox), A("broker", sent), A("consumer applied", applied, idx(applied.map((_, i) => i), "ok")));
    snap("Two tables in one database: orders, and an outbox for events.");
    D.placeOrder(db, { id: 1 });
    snap("Place order 1. The order row and its event are inserted in ONE transaction, so both exist or neither does.", { orders: { 0: "ok" }, outbox: { 0: "ok" } });
    try { db.transaction(tx => { tx.orders.push({ id: 2 }); tx.outbox.push({ id: "evt-2", sent: false }); throw new Error("x"); }); } catch {}
    snap("Order 2 fails a constraint and rolls back. Its event rolls back too, so nobody hears about an order that doesn't exist.");
    let crash = true;
    try { D.relay(db, e => { sent.push(e.id); c.handle(e); if (crash) { crash = false; throw new Error("died"); } }); } catch {}
    snap("The relay publishes evt-1, then dies before marking it sent. The consumer already applied it.", { outbox: { 0: "bad" } });
    D.relay(db, e => { sent.push(e.id); c.handle(e); });
    snap("The relay restarts and publishes evt-1 again: at least once. The consumer has seen this id, so it skips it.", { outbox: { 0: "ok" } });
    return [[applied, sent.length, db.outbox[0].sent], [["evt-1"], 2, true]];
  },

  "retry-breaker": f => {
    let t = 0;
    const b = new D.CircuitBreaker({ threshold: 2, coolMs: 1000, now: () => t }), log = [];
    const bad = () => { throw new Error("503"); };
    const cls = { closed: "ok", open: "bad", "half-open": "cur" };
    const call = (fn, note) => {
      let r;
      try { r = b.call(fn); } catch (e) { r = e.message; }
      log.push(r);
      f(note, A("breaker", ["closed", "open", "half-open"], { [["closed", "open", "half-open"].indexOf(b.state)]: cls[b.state] }), V({ clock: `${t / 1000}s`, "failures in a row": b.fails }), A("calls", log, Object.fromEntries(log.map((x, i) => [i, x === "ok" ? "ok" : x === "circuit open" ? "cmp" : "bad"]))));
    };
    call(bad, "Call fails with 503. Closed: still letting calls through, counting failures.");
    call(bad, "Second failure in a row hits the threshold of 2. The breaker opens.");
    t = 200; call(() => "ok", "Open: this call fails fast without touching the struggling service, which frees threads and gives it room to recover.");
    t = 1500; call(bad, "Cool-down over: one trial call goes through (half-open). It fails, so the breaker opens again.");
    t = 3000; call(() => "ok", "Next trial succeeds. The breaker closes and traffic flows again.");
    const waits = [0, 1, 2, 3, 4].map(a => D.backoff(a, { base: 100, cap: 1000, rand: () => 0.999 }));
    f("Retries wait longer each time, up to a cap, with random jitter so clients don't retry in waves. The most each wait can be:", A("max wait (ms) by attempt", waits));
    return [[log, waits], [["503", "503", "circuit open", "503", "ok"], [99, 199, 399, 799, 999]]];
  },

  "url-shortener": f => {
    const ids = [1, 61, 62, 3843, 3844, 125000000];
    const codes = [];
    f("Each new link takes the next number from a counter. Base62 (0-9, a-z, A-Z) turns it into a short code.", A("counter", ids), A("code", codes));
    for (const n of ids) {
      codes.push(D.encode62(n));
      f(`${n} in base62 is "${codes.at(-1)}".${n === 62 ? " Like 10 in decimal: one 62 and zero ones." : ""}${n === 125000000 ? " 125 million links still fit in 5 characters." : ""}`, A("counter", ids, { [codes.length - 1]: "cur" }), A("code", codes, { [codes.length - 1]: "ok" }));
    }
    f("Redirect: GET /bdtq7 decodes nothing; it looks up the code in Redis or the database and answers 302 to the long URL.", A("code", codes), V({ "62^7": "3.5 trillion codes" }));
    return [codes.map(D.decode62), ids];
  },

  "rate-limiter": f => {
    let t = 0;
    const l = new D.SlidingWindowLimiter(3, 1000, () => t), log = [];
    const snap = note => {
      const win = Math.floor(t / 1000), prev = l.counts.get(`u:${win - 1}`) ?? 0, cur = l.counts.get(`u:${win}`) ?? 0, ov = 1 - (t % 1000) / 1000;
      f(note, V({ clock: `${t / 1000}s`, "previous window": prev, "this window": cur, weight: Math.round(ov * 100) / 100, estimate: Math.round((prev * ov + cur) * 100) / 100, limit: 3 }), A("requests", log, Object.fromEntries(log.map((x, i) => [i, x.endsWith("ok") ? "ok" : "bad"]))));
    };
    const hit = (at, note) => { t = at; const ok = l.allow("u"); log.push(`${at / 1000}s ${ok ? "ok" : "429"}`); snap(note(ok)); };
    snap("Limit 3 per second. The estimate is: previous window's count x how much of it still overlaps, plus this window's count.");
    for (let i = 0; i < 4; i++) hit(0, ok => ok ? `Request ${i + 1} in the first second: under the limit, allowed.` : "Fourth request: the estimate is already 3, so reject with 429 and Retry-After.");
    hit(1500, () => "At 1.5s a new window began, but half of the previous one still overlaps: 3 x 0.5 = 1.5, plus 0. Allowed.");
    hit(1500, () => "Estimate 1.5 + 1 = 2.5, still under 3. Allowed.");
    hit(1500, () => "Estimate 1.5 + 2 = 3.5 would pass 3. Rejected. A fixed window would have allowed a burst of 6 here.");
    return [log.map(x => x.endsWith("ok")), [true, true, true, false, true, true, false]];
  },

  webhooks: f => {
    const codes = [500, 0, 429, 200], tries = [];
    const name = c => (c === 0 ? "timeout" : String(c));
    const r = D.deliver({ id: "evt_1" }, (_, a) => codes[a], { delay: a => D.backoff(a, { rand: () => 0.5 }) });
    for (const x of r.log) {
      tries.push(`${name(x.status)} after ${x.waitBefore}ms`);
      f(x.status === 200 ? "Attempt 4 gets 200. Delivered. The receiver dedupes on the event id, because retries mean it might see evt_1 twice." : `Attempt ${x.attempt + 1}: ${name(x.status)}. That might be temporary, so retry after a longer, jittered wait.`, A("attempts", tries, Object.fromEntries(tries.map((s, i) => [i, s.startsWith("200") ? "ok" : "bad"]))), V({ event: "evt_1", result: x.status === 200 ? r.result : "retrying" }));
    }
    const r2 = D.deliver({}, () => 400);
    f("A different endpoint answers 400. Its request is wrong, and retrying won't fix that, so stop and move it to the dead letter queue for a human.", A("attempts", ["400 after 0ms"], { 0: "bad" }), V({ result: r2.result, reason: r2.reason }));
    const ts = 1700000000, body = '{"id":"evt_1"}', sig = D.sign("whsec", ts, body), header = `t=${ts},v1=${sig}`;
    const checks = [["genuine", D.verify("whsec", header, body, ts + 5)], ["body changed", D.verify("whsec", header, '{"id":"evt_9"}', ts + 5)], ["replayed 20 min later", D.verify("whsec", header, body, ts + 1200)]];
    f("Every request carries t=timestamp and an HMAC of timestamp + body. Receivers check the HMAC and reject old timestamps.", A("receiver check", checks.map(([k, ok]) => `${k}: ${ok ? "accept" : "reject"}`), Object.fromEntries(checks.map(([, ok], i) => [i, ok ? "ok" : "bad"]))), V({ header: `t=${ts},v1=${sig.slice(0, 10)}...` }));
    return [[r.result, r2.reason, checks.map(c => c[1])], ["delivered", "permanent 400", [true, false, false]]];
  },

  "job-dispatch": f => {
    const workers = [["w1", 1.4, 1.6], ["w2", 2.5, 2.3], ["w3", 2.2, 3.6], ["w4", 4.6, 4.2], ["w5", 0.3, 4.5]];
    const index = new Map(), job = [2.5, 2.5];
    for (const [w, la, ln] of workers) { const k = D.cellOf(la, ln, 1); index.set(k, [...(index.get(k) ?? []), w]); }
    const near = D.nearby(index, ...job, 1).sort();
    // row 0 drawn at the top = highest latitude; worker wN shown as N, the job as J
    const grid = Array.from({ length: 5 }, (_, y) => Array.from({ length: 5 }, (_, x) => (index.get(`${4 - y},${x}`) ?? []).map(w => w.slice(1)).join("") || "·"));
    const jobCell = "2,2", ring = {};
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ring[`${2 + dy},${2 + dx}`] = "cmp";
    grid[2][2] = grid[2][2] === "·" ? "J" : grid[2][2] + "J";
    f("Each number is a worker (2 means w2), bucketed into map cells: a stand-in for geohash, H3 or a PostGIS index. J is the job, in the yellow cell.", { t: "grid", label: "map cells (number = worker, J = job)", cells: grid, hi: { [jobCell]: "cur" } });
    f(`Search only the yellow cell and its 8 blue neighbours, not every worker: ${near.join(", ")}. Then filter by exact distance, skills and rating.`, { t: "grid", label: "map cells (number = worker, J = job)", cells: grid, hi: { ...ring, [jobCell]: "cur" } }, A("candidates", near, idx(near.map((_, i) => i), "ok")));
    const jobs = new Map([["j1", { status: "open", version: 3 }]]), res = [];
    const show = note => f(note, V({ status: jobs.get("j1").status, assignee: jobs.get("j1").assignee ?? "-", version: jobs.get("j1").version }), A("claims", res, Object.fromEntries(res.map((x, i) => [i, x.endsWith("won") ? "ok" : "bad"]))));
    show("Offers go out. Both w2 and w3 tap Accept at almost the same moment, each having read version 3.");
    res.push(`w2: ${D.claim(jobs, "j1", "w2", 3) ? "won" : "409"}`);
    show("w2's UPDATE ... WHERE status = 'open' AND version = 3 changes 1 row. w2 gets the job and the version becomes 4.");
    res.push(`w3: ${D.claim(jobs, "j1", "w3", 3) ? "won" : "409"}`);
    show("w3's identical UPDATE now changes 0 rows, because the version is 4. w3 gets 409, already taken. No lock service needed.");
    return [[near, res], [["w1", "w2", "w3"], ["w2: won", "w3: 409"]]];
  },

  "news-feed": f => {
    const followers = new Map([["alice", ["u1", "u2", "u3"]], ["star", ["u1", "u2", "u4", "u5", "+5M"]]]);
    const following = new Map([["u1", new Set(["alice", "star"])]]), celebs = new Set(["star"]), feeds = new Map(), postsBy = new Map([["star", []]]);
    const snap = (note, hi) => f(note, KV("feed lists (post ids, newest first)", ["u1", "u2", "u3"].map(u => [u, (feeds.get(u) ?? []).map(p => p.id).join(" ") || "-"]), hi), KV("star's own posts", [["star", postsBy.get("star").map(p => p.id).join(" ") || "-"]]));
    snap("u1 follows alice (300 followers) and star (5 million followers).");
    const w1 = D.publish(feeds, followers, "alice", { id: "a1", at: 1 }, celebs);
    snap(`alice posts a1. Fan-out on write: push the id into each follower's list. ${w1} cheap writes, and reads become one list fetch.`, "u1");
    postsBy.get("star").unshift({ id: "s1", at: 2 });
    const w2 = D.publish(feeds, followers, "star", { id: "s1", at: 2 }, celebs);
    snap(`star posts s1. Pushing to 5 million lists would take minutes, so star is skipped (${w2} pushes). The post is only stored once.`);
    D.publish(feeds, followers, "alice", { id: "a2", at: 3 }, celebs);
    snap("alice posts a2. Pushed again.", "u1");
    const feed = D.readFeed(feeds, following, "u1", postsBy, celebs).map(p => p.id);
    f("u1 opens the app: take u1's pushed list, pull posts from the big accounts u1 follows, and merge them newest first.", A("u1's list", ["a2", "a1"]), A("pulled from star", ["s1"]), A("u1 sees", feed, idx(feed.map((_, i) => i), "ok")));
    return [feed, ["a2", "s1", "a1"]];
  },

  chat: f => {
    const ib = new D.InOrderInbox(), shown = [], arrived = [];
    for (const seq of [1, 3, 2, 3, 5, 4]) {
      arrived.push(seq);
      const out = ib.receive({ seq }).map(m => m.seq), dup = !out.length && !ib.buf.has(seq) && seq < ib.next;
      const from = shown.length;
      shown.push(...out);
      const g = ib.gap();
      f(dup ? `seq ${seq} again: a duplicate from a retry. Ignore it.` : out.length ? `seq ${seq} arrives. Show ${out.join(", ")} in order.` : `seq ${seq} arrives early. Hold it: something before it is missing.`,
        A("arrived (network order)", arrived, { [arrived.length - 1]: dup ? "bad" : out.length ? "ok" : "cur" }),
        A("held back", [...ib.buf.keys()].sort((a, b) => a - b)),
        A("on screen (seq order)", shown, idx(out.map((_, i) => from + i), "ok")),
        V({ "next expected": ib.next, "missing, fetch if it never comes": g ? (g[0] === g[1] ? g[0] : `${g[0]} to ${g[1]}`) : NONE }));
    }
    return [shown, [1, 2, 3, 4, 5]];
  },

  "app-builder": async f => {
    const files = new Map([["App.jsx", "<h1>Hi</h1>"]]);
    const e = (path, search, replace) => ({ path, search, replace });
    const project = { versions: [files] }, log = [];
    const ver = () => A("versions (never changed)", project.versions.map((v, i) => `v${i}: ${v.get("App.jsx")}`), { [project.versions.length - 1]: "ok" });
    const tries = () => A("tries", log, Object.fromEntries(log.map((x, i) => [i, x.startsWith("built") ? "ok" : "bad"])));
    f("v0 is live: App.jsx says <h1>Hi</h1>. The user types: call it Salon.", ver());
    const replies = [[e("App.jsx", "<h2>Hi</h2>", "<h1>Salon</h1>")], [e("App.jsx", "<h1>Hi</h1>", "<h1>{Salon</h1>")], [e("App.jsx", "<h1>Hi</h1>", "<h1>Salon</h1>")]];
    const notes = [
      "Try 1: the model asks to replace <h2>Hi</h2>, which isn't in the file. Nothing is applied; the error goes back to the model.",
      "Try 2: the edit applies, but the build fails on {Salon. The error goes back. The preview still shows v0.",
      "Try 3: applies and builds. Saved as v1 and the preview hot reloads."
    ];
    let n = 0;
    const build = async fs => ([...fs.values()].join("").includes("{") ? "SyntaxError in App.jsx" : null);
    const step = (i, feedback) => f(notes[i], tries(), ver(), V({ "error from the try before": feedback ?? NONE }));
    // replay what each try did (apply, then build) so the frame shows its outcome; v1 appears only after the gate passes
    const model = async ({ files, feedback }) => {
      const reply = replies[n++], a = D.applyEdits(files, reply), err = a.ok ? await build(a.files) : a.error;
      log.push(err ? `try ${n}: ${err}` : `built on try ${n}`);
      if (err) step(n - 1, feedback);
      else last = feedback;
      return reply;
    };
    let last;
    const res = await D.generateUntilBuilds(project, "call it Salon", { model, build });
    step(2, last);
    const back = D.restore(project, 0);
    f("Undo: v0 is copied to the top as v2. Nothing is deleted, so redo is just another restore.", tries(), ver(), V({ live: `v${back}` }));
    let t = 0;
    const pool = new D.SandboxPool({ warm: 2, idleMs: 1000, now: () => t }), opens = [];
    const draw = (note, stopped = []) => f(note, A("warm pool", pool.warm), KV("running previews", [...pool.live].map(([p, s]) => [p, s.id])), A("opens", opens, Object.fromEntries(opens.map((x, i) => [i, x.endsWith("cold") ? "bad" : "ok"]))), V({ stopped: stopped.length ? stopped : "none" }));
    draw("Previews run in sandboxes. Two are booted ahead of time.");
    for (const p of ["a", "b", "c"]) { const r = pool.open(p); opens.push(`${p}: ${r.id} ${r.cold ? "cold" : "instant"}`); }
    draw("Projects a and b get warm sandboxes instantly. c finds the pool empty and waits for a cold boot. Real systems refill the pool in the background.");
    t = 500; pool.open("a");
    t = 1200; const stopped = pool.reap();
    draw("a stayed active; b and c were idle too long, so they are stopped. Their code is safe in version storage.", stopped);
    return [[res.attempt, back, stopped.sort()], [3, 2, ["sb2", "sb3"]]];
  }
};
