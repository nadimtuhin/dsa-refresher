// Part 3, more design problems: the core logic of each, small enough to test and animate.
// Same shape as design.js: code in #regions (shown on the page), tests, chapters, meta.

// #region ride-sharing
// Match a rider to the nearest free driver, and let the price follow demand.
// Distance here is straight line on a small grid; real systems use road ETA from a routing service.
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function bestDriver(drivers, pickup, maxKm = 3) {
  let best = null;
  for (const d of drivers) {
    if (d.busy) continue;
    const km = dist(d.at, pickup);
    if (km <= maxKm && (!best || km < best.km)) best = { id: d.id, km };
  }
  return best; // null means "no driver nearby": widen the search or say so
}

// Surge: when riders outnumber free drivers in an area, raise the price a little at a time.
function surge(requests, freeDrivers, { cap = 3, step = 0.25 } = {}) {
  if (freeDrivers === 0) return cap;
  const ratio = requests / freeDrivers;
  if (ratio <= 1) return 1;
  return Math.min(cap, 1 + Math.ceil((ratio - 1) / 0.5) * step); // round up to the next 0.25
}
// #endregion

// #region food-delivery
// An order moves through fixed states. Any other jump is a bug, so it is refused.
const NEXT = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["picked_up"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: []
};

function advance(order, to) {
  if (!NEXT[order.status].includes(to)) return { ok: false, reason: `${order.status} cannot go to ${to}` };
  order.history.push(to);
  order.status = to;
  return { ok: true };
}

// Send the rider so they arrive when the food is ready, not before (waiting) or long after (cold food).
const dispatchAt = (readyAt, riderMinutesAway) => Math.max(0, readyAt - riderMinutesAway);
// #endregion

// #region courier-tracking
// Phones send GPS pings out of order and twice. Keep only the newest per courier,
// and keep the trail for the map without duplicates.
class Tracker {
  constructor() {
    this.last = new Map(); // courier to newest ping
    this.trail = new Map(); // courier to pings in time order
  }
  ping(courier, p) {
    const seen = this.last.get(courier);
    const trail = this.trail.get(courier) ?? [];
    if (trail.some(x => x.t === p.t)) return "duplicate";
    trail.push(p);
    trail.sort((a, b) => a.t - b.t);
    this.trail.set(courier, trail);
    if (seen && seen.t > p.t) return "late"; // stored for the trail, not the live dot
    this.last.set(courier, p);
    return "live";
  }
  where(courier) {
    return this.last.get(courier) ?? null;
  }
}

// Proof of delivery: the parcel is only "delivered" with the right one time code from the customer.
const confirmDelivery = (parcel, code) => (parcel.status === "out_for_delivery" && code === parcel.otp ? ((parcel.status = "delivered"), true) : false);
// #endregion

// #region twitter
// Home timeline: merge the newest tweets from everyone you follow, without reading everything.
// Each author's list is already newest first, so take the top of each and repeat (a k way merge).
function timeline(byAuthor, following, limit) {
  const heads = following.map(a => ({ list: byAuthor.get(a) ?? [], i: 0 }));
  const out = [];
  while (out.length < limit) {
    let pick = null;
    for (const h of heads) if (h.i < h.list.length && (!pick || h.list[h.i].at > pick.list[pick.i].at)) pick = h;
    if (!pick) break;
    out.push(pick.list[pick.i++].id);
  }
  return out;
}

// Snowflake style ids: time first, then machine, then a counter. Sorting by id sorts by time,
// and no two machines make the same id without talking to each other.
function snowflake(ms, machine, seq) {
  return (BigInt(ms) << 22n) | (BigInt(machine) << 12n) | BigInt(seq);
}
// #endregion

// #region facebook
// Friends of friends ("People you may know"): count mutual friends, skip people you already know.
function suggest(friends, me, limit = 3) {
  const mine = friends.get(me) ?? new Set();
  const mutual = new Map();
  for (const f of mine)
    for (const ff of friends.get(f) ?? [])
      if (ff !== me && !mine.has(ff)) mutual.set(ff, (mutual.get(ff) ?? 0) + 1);
  return [...mutual].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, limit);
}

// Ranked feed: score = how close you are to the author x how engaging x how fresh.
const score = p => p.affinity * (1 + p.likes / 10) / (1 + p.ageHours / 6);
const rank = posts => [...posts].sort((a, b) => score(b) - score(a)).map(p => p.id);
// #endregion

// #region chatgpt
// Fit a conversation into the model's context window: keep the system prompt and the newest
// messages, drop the oldest middle ones. Tokens are estimated as about 4 characters each.
const tokens = s => Math.ceil(s.length / 4);

function fitContext(system, messages, budget) {
  let used = tokens(system);
  const kept = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = tokens(messages[i].text);
    if (used + t > budget) break;
    used += t;
    kept.unshift(messages[i]);
  }
  return { kept, dropped: messages.length - kept.length, used };
}

// Stream the answer: the model makes tokens one by one; the client shows each as it arrives.
async function* streamTokens(text) {
  for (const word of text.split(" ")) yield word;
}
async function collect(stream) {
  const parts = [];
  for await (const t of stream) parts.push(t);
  return parts.join(" ");
}
// #endregion

// #region coding-harness
// An AI coding agent is a loop: the model asks for a tool, the harness runs it and sends back the result,
// until the model says it is done. The harness, not the model, enforces limits and permissions.
async function agentLoop(model, tools, task, { maxSteps = 8, allow = () => true } = {}) {
  const log = [{ role: "user", text: task }];
  for (let step = 1; step <= maxSteps; step++) {
    const reply = await model(log);
    if (reply.done) return { ok: true, answer: reply.text, steps: step, log };
    const { tool, args } = reply;
    let result;
    if (!tools[tool]) result = `error: no tool ${tool}`;
    else if (!allow(tool, args)) result = `denied: ${tool} needs approval`;
    else {
      try {
        result = await tools[tool](args);
      } catch (e) {
        result = `error: ${e.message}`; // errors go back to the model, they don't crash the loop
      }
    }
    log.push({ role: "tool", tool, text: String(result) });
  }
  return { ok: false, answer: "stopped: step limit", steps: maxSteps, log };
}
// #endregion

export { dist, bestDriver, surge, NEXT, advance, dispatchAt, Tracker, confirmDelivery, timeline, snowflake, suggest, score, rank, tokens, fitContext, streamTokens, collect, agentLoop };

// ---------- tests: [actual, expected] ----------
export const tests = {
  "ride-sharing": () => {
    const drivers = [
      { id: "d1", at: [0, 0] },
      { id: "d2", at: [1, 1], busy: true },
      { id: "d3", at: [2, 1] },
      { id: "d4", at: [9, 9] }
    ];
    return [
      [bestDriver(drivers, [1, 1]).id, "d3"],
      [bestDriver(drivers, [0.2, 0]).id, "d1"],
      [bestDriver(drivers, [20, 20]), null],
      [[surge(5, 10), surge(10, 10), surge(15, 10), surge(20, 10), surge(100, 10), surge(3, 0)], [1, 1, 1.25, 1.5, 3, 3]]
    ];
  },
  "food-delivery": () => {
    const o = { status: "placed", history: ["placed"] };
    const steps = ["accepted", "preparing", "ready", "picked_up", "delivered"].map(s => advance(o, s).ok);
    const bad = { status: "preparing", history: [] };
    return [
      [steps, [true, true, true, true, true]],
      [o.history, ["placed", "accepted", "preparing", "ready", "picked_up", "delivered"]],
      [advance(bad, "cancelled"), { ok: false, reason: "preparing cannot go to cancelled" }],
      [advance(o, "cancelled").ok, false],
      [[dispatchAt(20, 8), dispatchAt(5, 12)], [12, 0]]
    ];
  },
  "courier-tracking": () => {
    const tr = new Tracker();
    const r = [tr.ping("c1", { t: 1, at: [0, 0] }), tr.ping("c1", { t: 3, at: [0, 2] }), tr.ping("c1", { t: 2, at: [0, 1] }), tr.ping("c1", { t: 3, at: [0, 2] })];
    const parcel = { status: "out_for_delivery", otp: "4821" };
    return [
      [r, ["live", "live", "late", "duplicate"]],
      [tr.where("c1").t, 3],
      [tr.trail.get("c1").map(p => p.t), [1, 2, 3]],
      [tr.where("nobody"), null],
      [[confirmDelivery(parcel, "0000"), parcel.status, confirmDelivery(parcel, "4821"), parcel.status], [false, "out_for_delivery", true, "delivered"]],
      [confirmDelivery(parcel, "4821"), false]
    ];
  },
  twitter: () => {
    const by = new Map([
      ["ana", [{ id: "a3", at: 30 }, { id: "a1", at: 10 }]],
      ["bob", [{ id: "b2", at: 20 }]],
      ["cat", [{ id: "c4", at: 40 }, { id: "c0", at: 5 }]]
    ]);
    const a = snowflake(1000, 1, 0), b = snowflake(1000, 2, 0), c = snowflake(1001, 1, 0);
    return [
      [timeline(by, ["ana", "bob", "cat"], 4), ["c4", "a3", "b2", "a1"]],
      [timeline(by, ["bob"], 5), ["b2"]],
      [timeline(by, [], 3), []],
      [[a < c, b < c, a !== b], [true, true, true]],
      [Number(c >> 22n), 1001]
    ];
  },
  facebook: () => {
    const f = new Map([
      ["me", new Set(["ana", "bob"])],
      ["ana", new Set(["me", "cat", "dan"])],
      ["bob", new Set(["me", "cat", "eve"])],
      ["cat", new Set(["ana", "bob"])]
    ]);
    const posts = [
      { id: "old-close", affinity: 3, likes: 0, ageHours: 48 },
      { id: "new-close", affinity: 3, likes: 0, ageHours: 1 },
      { id: "new-far-viral", affinity: 1, likes: 200, ageHours: 2 }
    ];
    return [
      [suggest(f, "me"), [["cat", 2], ["dan", 1], ["eve", 1]]],
      [suggest(f, "cat", 1), [["me", 2]]],
      [rank(posts), ["new-far-viral", "new-close", "old-close"]]
    ];
  },
  chatgpt: async () => {
    const msgs = ["hello there!", "a".repeat(40), "b".repeat(40), "what is a heap?"].map(text => ({ text }));
    const r = fitContext("be brief", msgs, 20);
    return [
      [tokens("abcd"), 1],
      [tokens("abcde"), 2],
      [[r.kept.map(m => m.text[0]), r.dropped, r.used], [["b", "w"], 2, 16]],
      [fitContext("x", msgs, 1000).dropped, 0],
      [await collect(streamTokens("a heap keeps the smallest on top")), "a heap keeps the smallest on top"]
    ];
  },
  "coding-harness": async () => {
    const files = { "a.js": "let x = 1" };
    const tools = {
      read: ({ path }) => files[path] ?? Promise.reject(new Error(`no file ${path}`)),
      write: ({ path, text }) => ((files[path] = text), "ok"),
      shell: ({ cmd }) => `ran ${cmd}`
    };
    const script = [{ tool: "read", args: { path: "b.js" } }, { tool: "read", args: { path: "a.js" } }, { tool: "write", args: { path: "a.js", text: "let x = 2" } }, { tool: "shell", args: { cmd: "rm -rf /" } }, { done: true, text: "x is now 2" }];
    let i = 0;
    const model = async () => script[i++];
    const allow = (tool, args) => !(tool === "shell" && /rm -rf/.test(args.cmd));
    const r = await agentLoop(model, tools, "set x to 2", { allow });
    const loop = await agentLoop(async () => ({ tool: "read", args: { path: "a.js" } }), tools, "never ends", { maxSteps: 3 });
    return [
      [[r.ok, r.answer, r.steps], [true, "x is now 2", 5]],
      [r.log.filter(m => m.role === "tool").map(m => m.text), ["error: no file b.js", "let x = 1", "ok", "denied: shell needs approval"]],
      [files["a.js"], "let x = 2"],
      [[loop.ok, loop.answer, loop.steps], [false, "stopped: step limit", 3]],
      [(await agentLoop(async () => ({ tool: "fly" }), tools, "x", { maxSteps: 1 })).log[1].text, "error: no tool fly"]
    ];
  }
};

export const chapters = [
  {
    id: "products",
    title: "Real products",
    blurb: "Well known apps, worked through the same 8 steps.",
    ids: ["ride-sharing", "food-delivery", "courier-tracking", "twitter", "facebook", "chatgpt", "coding-harness"]
  }
];

export const meta = {
  "ride-sharing": {
    title: "Ride sharing like Uber",
    prompt: "Riders request a ride, nearby drivers get the offer, one accepts, and both see each other on a live map until drop off. Prices go up when demand is high.",
    clarify: ["One city or many? How many rides a day?", "Do we pick the driver, or offer to several and take the first accept?", "Is surge pricing in scope?", "Payments in scope, or just the ride?"],
    numbers: [
      ["rides", "1M a day, about 12 per second, peaks 5x at rush hour"],
      ["drivers online", "200k, location every 4 s, so about 50k writes per second"],
      ["match time", "under a few seconds, from request to a driver accepting"]
    ],
    api: "POST /rides { pickup, dropoff }              { rideId, price }\nPOST /drivers/me/location { lat, lng }      204\nPOST /rides/{id}/accept { version }          200, or 409 taken\nWS   /rides/{id}/live                        driver position, ETA, status",
    data: "rides(id, rider_id, driver_id, status, pickup, dropoff, price, surge, version)\ndriver locations: Redis GEO, latest only, expire after 30 s\nsurge(area_cell, multiplier, updated_at)   recomputed every minute\nride_events: every state change (audit + outbox to payments, receipts)",
    deep: [
      ["How do you find the nearest driver?", "Drivers are indexed by map cell (geohash or H3) in Redis. Look in the rider's cell and neighbours, keep free drivers, then rank by road ETA from a routing service, not straight line distance: a driver across a river is not close."],
      ["How do you make sure one ride gets one driver?", "Offer to the best driver first, with a 10 to 15 second timeout, then the next. Accepting is a conditional update on status and version, so two accepts can't both win."],
      ["How does surge work?", "Every minute, per area, compare open requests to free drivers. If riders outnumber drivers, raise the multiplier in small steps, with a cap. The rider sees and agrees to the price before booking, and it is stored on the ride."],
      ["How do both apps see live positions?", "Drivers send GPS every few seconds over a persistent connection. The server forwards it to the rider of that ride through pub/sub. Positions are not stored in the main database; only the route summary is kept."]
    ],
    failures: [
      ["Driver accepts then goes offline", "Heartbeat deadline. Missed, the ride is re-offered to the next driver, and the rider is told."],
      ["Location service overloaded", "Drop pings, never queue them: only the newest one matters."],
      ["Payment fails at the end", "The ride still completes. Charge again later from the outbox; the rider can't book again until it is settled."]
    ],
    tradeoffs: ["Offering to one driver at a time is fair and avoids wasted accepts, but slower than broadcasting.", "Straight line distance is cheap for finding candidates; road ETA is right for choosing between them."],
    say: "Drivers live in a geo index in Redis, updated every few seconds. A request finds free drivers in nearby cells, ranks them by road ETA, and offers one at a time with a timeout. Accept is a conditional update, so only one driver wins. Surge compares requests to free drivers per area every minute, and the price is locked when the rider books."
  },
  "food-delivery": {
    title: "Food delivery like Foodpanda",
    prompt: "Customers order from restaurants, the restaurant accepts and cooks, a rider picks it up and delivers it. Everyone sees the order's status live.",
    clarify: ["How many orders a day, and how peaky is lunch and dinner?", "Can an order be cancelled after cooking starts?", "Do riders carry more than one order at a time?", "Is the menu and search in scope, or only ordering and delivery?"],
    numbers: [
      ["orders", "500k a day, but 60% in two 2 hour peaks: about 20 per second at peak"],
      ["restaurants", "50k, each updating menus and opening hours"],
      ["status reads", "every open app polls or listens: about 100 reads per order"]
    ],
    api: "POST /orders { restaurantId, items, address }    { orderId, total, eta }\nPOST /restaurant/orders/{id}/status { to }         200, or 409 not allowed\nPOST /rider/orders/{id}/status { to }              200, or 409\nWS   /orders/{id}/live                             status, rider position, ETA",
    data: "orders(id, customer_id, restaurant_id, rider_id, status, total, version)\norder_items(order_id, item_id, qty, price_at_order)\norder_events(order_id, status, at)   append only, feeds the live view and outbox\nmenus: Postgres + a search index, cached per restaurant",
    deep: [
      ["How do you keep the order state correct?", "A state machine: placed, accepted, preparing, ready, picked up, delivered, or cancelled. Each move is checked against the allowed list and written as a conditional update plus an event. A rider can't mark picked up before the food is ready."],
      ["When do you send the rider?", "Not at order time, or the rider waits at the restaurant. Send at ready time minus the rider's travel time, using the restaurant's prep time estimate."],
      ["How is the price fixed?", "Store the item price at order time on the order line. If the menu changes a minute later, the order doesn't."],
      ["How do you survive the lunch peak?", "Menus and restaurant pages come from cache. Ordering is a small write. Rider assignment runs in a queue per city so a slow city can't block others."]
    ],
    failures: [
      ["Restaurant doesn't accept in time", "Auto cancel after a few minutes and refund, before anyone cooks."],
      ["No rider available", "Keep trying in waves with a wider radius; tell the customer the new ETA; offer to cancel."],
      ["Customer pays twice on a bad network", "Idempotency key on POST /orders, so a retry returns the first order."]
    ],
    tradeoffs: ["Batching two orders per rider saves cost but makes one customer wait longer.", "Polling is simple; WebSockets give smoother live updates but need connection servers."],
    say: "The order is a state machine, and every move is a conditional update plus an event, so nothing skips a step. Prices are copied onto the order. Riders are dispatched at ready time minus travel time, so food doesn't wait and riders don't either. Menus are cached, ordering is a small write, and dispatch runs per city in a queue."
  },
  "courier-tracking": {
    title: "Courier tracking and delivery",
    prompt: "Merchants send parcels. Each parcel goes from pickup to hub to a delivery rider to the customer. Merchants and customers track it, and delivery needs proof.",
    clarify: ["How many parcels a day? How many hubs?", "Cash on delivery? Returns?", "How live is live: every few seconds, or each scan?", "What counts as proof of delivery: OTP, photo, signature?"],
    numbers: [
      ["parcels", "300k a day, about 4 per second, mostly created in the evening by merchants"],
      ["scans", "about 6 scan events per parcel: under 2M a day"],
      ["rider pings", "10k riders, one GPS ping every 10 s: about 1k per second"]
    ],
    api: "POST /parcels { from, to, cod }                  { parcelId, trackingCode }\nPOST /scans { parcelId, hubId, kind }            204   (pickup, arrive hub, leave hub, out for delivery)\nPOST /riders/me/pings [{ t, lat, lng }]          204   (batched from the phone)\nPOST /parcels/{id}/deliver { otp, photo? }        200, or 403 wrong code\nGET  /track/{trackingCode}                       status, history, rider position if out for delivery",
    data: "parcels(id, tracking_code, merchant_id, status, cod_amount, otp_hash)\nparcel_events(parcel_id, kind, hub_id, at)   append only: the tracking history\nrider positions: Redis, newest per rider\nrider trails: object storage per day, for disputes",
    deep: [
      ["What is the source of truth for status?", "The scan events. Each scan appends an event, and the parcel's status is updated from it. The tracking page reads the event list, so customers see the full history."],
      ["Pings arrive late and twice. What then?", "Each ping carries the phone's timestamp. Keep the newest per rider as the live dot; ignore older ones for the dot but keep them in the trail; drop exact duplicates."],
      ["How do you prove delivery?", "The customer gets a one time code by SMS. The rider must enter it; only a hash is stored. Add a photo and the GPS position at that moment for disputes."],
      ["How does the phone save battery and data?", "Batch pings and send every 30 s, send more often only when the rider is close to the customer, and keep sending offline pings once the network is back."]
    ],
    failures: [
      ["Rider's phone is offline", "Pings and scans are queued on the phone with their times and sent later; order by the phone's time, not arrival."],
      ["Wrong hub scan", "Scans are checked against the expected route; a surprise scan raises an alert instead of silently changing status."],
      ["Customer not home", "A failed attempt event, a reschedule, and after 3 tries a return to merchant flow."]
    ],
    tradeoffs: ["Status from scans is reliable but only as fresh as the last scan; live GPS is fresh but noisy.", "OTP is strong proof but adds friction; photo only is easier but weaker in disputes."],
    say: "Scan events are the source of truth: each scan appends to the parcel's history and moves its status. Rider GPS is separate, hot data in Redis, newest ping wins, late pings only go to the trail. Delivery needs the customer's one time code, stored as a hash, plus a photo and position for disputes."
  },
  twitter: {
    title: "Twitter or X",
    prompt: "Users post short tweets, follow others, and read a home timeline of tweets from people they follow, newest first. Some accounts have 100M followers.",
    clarify: ["Chronological or ranked timeline?", "How many daily users, and reads per write?", "Search, trends and DMs in scope?", "How fresh must the timeline be?"],
    numbers: [
      ["tweets", "500M a day, about 6k per second, peaks 3x"],
      ["timeline reads", "about 100 reads per tweet: 600k per second"],
      ["storage", "500M x 300 bytes is about 150 GB a day of text, media separate"]
    ],
    api: "POST /tweets { text, mediaIds? }       { id }\nGET  /timeline/home?cursor=...          [tweets], nextCursor\nGET  /users/{id}/tweets?cursor=...      [tweets], nextCursor\nPOST /follow/{userId}                   204",
    data: "tweets(id, author_id, text, created_at)   id is a snowflake: sortable by time\nfollows(follower_id, followee_id)   both directions indexed\ntimeline:{user}  Redis list of tweet ids, newest first, about 800\nmedia: object storage + CDN",
    deep: [
      ["Push or pull for timelines?", "Push for most authors: a new tweet id is written into each follower's cached timeline. Pull for huge accounts: their tweets are merged in when you read. A merge of a few sorted lists is cheap."],
      ["How are ids made at 6k per second?", "Snowflake style: milliseconds, machine number, counter. No coordination per tweet, and sorting by id sorts by time, which makes cursors easy."],
      ["What do you cache?", "Timelines as lists of ids, and tweets by id. A timeline read is one list read plus a multi get of tweets."],
      ["How do you handle a viral tweet?", "Like counts go to sharded counters and are summed in the background; the tweet itself is served from cache and CDN."]
    ],
    failures: [
      ["Fan out backlog after a big event", "Timelines may lag a few seconds. Readers still merge in very recent tweets on read."],
      ["Timeline cache lost", "Rebuild from the follow list on the next read: pull, then cache."],
      ["Hot tweet hammering one cache key", "Replicate hot keys across cache nodes, or cache in the app servers for a few seconds."]
    ],
    tradeoffs: ["Push makes reads fast but writes huge for big accounts; pull is the reverse; the mix gets both.", "Chronological is simple and predictable; ranked is more engaging but needs a scoring service."],
    say: "Reads beat writes 100 to 1, so I precompute timelines: a new tweet's id goes into each follower's Redis list, except for huge accounts whose tweets are merged in at read time. Ids are snowflakes, so they sort by time without coordination, and cursors page by id."
  },
  facebook: {
    title: "Facebook",
    prompt: "Users add friends, post, and see a ranked news feed. Suggest people they may know. Billions of users.",
    clarify: ["Ranked feed, or chronological?", "Which parts: feed, friends, suggestions, likes and comments?", "Privacy: friends only, public, custom lists?", "How fresh do suggestions need to be?"],
    numbers: [
      ["users", "2B daily, average 300 friends"],
      ["feed loads", "about 10 per user per day: 230k per second"],
      ["candidates", "a few thousand candidate posts per feed load, ranked down to 20"]
    ],
    api: "GET  /feed?cursor=...                  [posts], nextCursor\nPOST /posts { text, audience }          { id }\nPOST /friends/requests { userId }       202\nGET  /suggestions                       [people with mutual count]",
    data: "posts(id, author_id, audience, created_at)\nfriendships(user_a, user_b)   the social graph, in a graph store (TAO style), heavily cached\nengagement: likes, comments, views as events for ranking\nsuggestions:{user} precomputed daily",
    deep: [
      ["How is the feed built?", "Gather candidates from friends and pages, filter by privacy, score each by how close you are to the author, how engaging the post is and how fresh it is, then show the top. Cache the result for a short time."],
      ["How do you suggest friends?", "Friends of friends, counted by mutual friends, skipping current friends and blocked people. Computed in a daily batch, plus signals like same school or contacts."],
      ["How do you store the social graph?", "As edges in a graph store sharded by user id, with a big read through cache in front. Most reads are \"friends of X\", so keep each user's edges together."],
      ["How do you enforce privacy?", "Check the audience at read time for each candidate, after gathering and before ranking. Never trust a cached feed across a privacy change; invalidate it."]
    ],
    failures: [
      ["Ranking service slow", "Fall back to a simple recency order rather than a blank feed."],
      ["Graph cache cold after a deploy", "Warm the hottest users first and cap load on the graph store."],
      ["A post goes viral", "Counters are sharded and approximate; exact numbers are fixed later in batch."]
    ],
    tradeoffs: ["Ranking increases engagement but makes the feed harder to explain; offer a recent view too.", "Daily suggestions are cheap and good enough; real time ones cost far more."],
    say: "Feed is gather, filter, rank: candidates from friends, a privacy check, then a score of closeness times engagement divided by age, top 20 shown. The friend graph is stored as edges sharded by user, with a big cache. People you may know is friends of friends ranked by mutual friends, computed daily."
  },
  chatgpt: {
    title: "ChatGPT style assistant",
    prompt: "Users chat with an AI model. Answers stream word by word, conversations are saved, and the service runs on expensive, limited GPUs.",
    clarify: ["How many users and messages per second?", "Do we run the models, or call a model provider?", "File uploads, tools, web search in scope?", "Free and paid tiers with different limits?"],
    numbers: [
      ["messages", "100M a day, about 1.2k per second, peaks 3x"],
      ["tokens", "about 1k tokens in and 500 out per message"],
      ["GPU time", "a few seconds per answer; GPUs are the bottleneck and the bill"]
    ],
    api: "POST /conversations/{id}/messages { text }     stream of tokens (server sent events)\nGET  /conversations?cursor=...                 [conversation titles]\nGET  /conversations/{id}                       messages\nPOST /conversations/{id}/stop                  stops generating",
    data: "conversations(id, user_id, title, created_at)\nmessages(conversation_id, seq, role, text, tokens)\nusage(user_id, day, tokens)   for limits and billing\nfiles: object storage; embeddings in a vector index for retrieval",
    deep: [
      ["Why stream?", "A full answer takes seconds. Streaming tokens as they are made shows the first word in under a second. Use server sent events: one request, many small chunks."],
      ["The conversation is longer than the context window?", "Keep the system prompt and the newest messages that fit the token budget, and drop or summarise older ones. Long term facts go in a separate memory store."],
      ["How do you share scarce GPUs?", "A queue in front of the model servers, per tier priority, and batching: the server runs many requests together. Rate limit by tokens per user, not just requests."],
      ["How do you keep costs down?", "Cache answers to identical prompts, route easy questions to a smaller model, and cache the shared system prompt prefix on the GPU."]
    ],
    failures: [
      ["Model server crashes mid answer", "The client sees the stream end; offer \"regenerate\". Save partial answers as partial."],
      ["GPU capacity full", "Queue with a visible wait, fall back to a smaller model for free users, or return 429 with retry time."],
      ["User closes the tab", "Stop generating to save GPU time, unless it is a background task."]
    ],
    tradeoffs: ["Bigger models answer better but cost more and are slower; routing picks per question.", "Saving everything enables history and training opt in, but needs strict privacy controls and deletion."],
    say: "The app servers are cheap; GPUs are the bottleneck. Requests go through a token based rate limiter into a queue, model servers batch them, and tokens stream back over server sent events. Each turn sends the system prompt plus the newest messages that fit the context budget. Conversations are stored per user with a sequence number."
  },
  "coding-harness": {
    title: "AI coding agent harness like Claude Code",
    prompt: "A developer gives a coding task. An AI model reads files, runs commands, edits code and runs tests in a loop until it's done. Make it safe and reliable.",
    clarify: ["Runs on the developer's machine or in the cloud?", "Which tools: read, write, search, shell, browser?", "What needs human approval?", "Limits on time, steps and cost?"],
    numbers: [
      ["steps per task", "10 to 50 tool calls"],
      ["context", "about 200k tokens, filled fast by file contents and command output"],
      ["cost", "every step resends the conversation, so cost grows with each step"]
    ],
    api: "model -> harness: { tool: \"read\", args: { path } }   or   { done: true, text }\nharness -> model: tool result text (trimmed if long)\ntools: read(path), write(path, text), edit(path, search, replace), search(pattern), shell(cmd)",
    data: "session log: every message and tool call, in order (for resume and review)\ncheckpoints: file snapshots before each edit, for undo\npermissions: allow list per tool and command pattern\nproject notes: a file like AGENTS.md loaded at start",
    deep: [
      ["What does the loop look like?", "Send the task and tool list to the model. If it asks for a tool, the harness runs it and sends back the result. Repeat until the model says done or a step limit hits."],
      ["How do you keep it safe?", "The harness enforces permissions, not the model: reads are free, writes and shell need approval or an allow list, dangerous commands are denied. Run in a sandbox or container when unattended."],
      ["What about the context window filling up?", "Trim long tool outputs, read files in parts, and when the conversation gets big, summarise older steps and keep the newest in full."],
      ["How does it recover from mistakes?", "Tool errors go back to the model as text so it can try another way. Checkpoints before each edit allow undo. Tests are the judge of done, not the model's word."]
    ],
    failures: [
      ["Model loops forever", "Step limit, time limit and cost limit; stop and report."],
      ["Command hangs", "Timeout per command; kill it and tell the model it timed out."],
      ["Model tries something destructive", "Denied by the permission check, and the denial is shown to the model and the user."]
    ],
    tradeoffs: ["More autonomy is faster but riskier; approval per action is safe but slow. Allow lists sit in between.", "Giving the model all files is simple but blows the context; search and read on demand scales."],
    say: "It's a loop: the model asks for a tool, the harness checks permission, runs it with a timeout, and sends back trimmed output, until the model says done or a step limit hits. The harness, not the model, owns safety: allow lists, approvals, sandboxes and checkpoints for undo. Errors go back to the model as text, and tests decide when it's done."
  }
};
