// Animations for the "Real products" design pages. Same contract: replay the logic, return [ownAnswer, testedAnswer].
import * as D from "./design2.js";

const cell = v => (v == null ? "" : String(v));
const show = v => (Array.isArray(v) ? "[" + v.join(", ") + "]" : String(v));
const A = (label, items, hi = {}, ptr = {}) => ({ t: "array", label, items: items.map(cell), hi, ptr });
const KV = (label, entries, hi) => ({ t: "kv", label, entries: [...entries].map(([k, v]) => [cell(k), cell(v)]), hi: hi == null ? null : cell(hi) });
const V = vars => ({ t: "vars", vars: Object.entries(vars).map(([k, v]) => [k, show(v)]) });
const idx = (arr, cls) => Object.fromEntries(arr.map(i => [i, cls]));

export const designAnims2 = {
  "ride-sharing": f => {
    const drivers = [{ id: "d1", at: [0, 0] }, { id: "d2", at: [1, 1], busy: true }, { id: "d3", at: [2, 1] }, { id: "d4", at: [9, 9] }];
    const pickup = [1, 1];
    const row = () => drivers.map(d => `${d.id} ${d.busy ? "busy" : D.dist(d.at, pickup) > 3 ? "too far" : D.dist(d.at, pickup).toFixed(1) + " km"}`);
    f("A rider asks for a pickup. Four drivers are around. Distances are from the pickup point.", A("drivers", row()));
    f("d2 is closest but already on a ride, so skip it. d4 is more than 3 km away, so skip it too.", A("drivers", row(), { 1: "bad", 3: "bad" }));
    const best = D.bestDriver(drivers, pickup);
    f(`Of the free, nearby drivers, ${best.id} is closest. Offer the ride to ${best.id} first, with a 15 second timeout.`, A("drivers", row(), { 0: "cmp", 1: "bad", 2: "ok", 3: "bad" }), V({ "offer to": best.id }));
    const cases = [[5, 10], [10, 10], [15, 10], [20, 10], [100, 10]];
    const res = [];
    for (const [r, d] of cases) {
      res.push(D.surge(r, d));
      f(`Surge check for this area: ${r} ride requests and ${d} free drivers. Price multiplier: ${D.surge(r, d)}x.`, KV("requests vs free drivers to price", cases.slice(0, res.length).map(([a, b], i) => [`${a} vs ${b}`, `${res[i]}x`]), `${r} vs ${d}`));
    }
    f("More riders than drivers raises the price in small steps, capped at 3x. The rider sees the price before booking, and it is saved on the ride.", KV("requests vs free drivers to price", cases.map(([a, b], i) => [`${a} vs ${b}`, `${res[i]}x`])));
    return [[best.id, res], [D.bestDriver(drivers, pickup).id, cases.map(([r, d]) => D.surge(r, d))]];
  },

  "food-delivery": f => {
    const states = ["placed", "accepted", "preparing", "ready", "picked_up", "delivered"];
    const o = { status: "placed", history: ["placed"] };
    const snap = (note, bad) => f(note, A("order status", states, { ...idx(states.map((_, i) => i).filter(i => i < states.indexOf(o.status)), "ok"), [states.indexOf(o.status)]: "cur", ...(bad != null ? { [bad]: "bad" } : {}) }));
    snap("A customer orders a biryani. The order starts as placed.");
    D.advance(o, "accepted");
    snap("The restaurant accepts it.");
    D.advance(o, "preparing");
    snap("The kitchen starts cooking.");
    const r = D.advance(o, "cancelled");
    snap(`The customer tries to cancel now. Refused: "${r.reason}". The food is already being cooked.`);
    const ready = 20, away = 8, at = D.dispatchAt(ready, away);
    f(`Food will be ready in ${ready} minutes. The nearest rider is ${away} minutes away. Send the rider at minute ${at}, so they arrive as the food is ready.`, V({ "ready at": `${ready} min`, "rider away": `${away} min`, "send rider at": `${at} min` }));
    for (const s of ["ready", "picked_up", "delivered"]) {
      D.advance(o, s);
      snap(s === "ready" ? "Ready, and the rider walks in." : s === "picked_up" ? "The rider picks it up." : "Delivered. Every step followed the allowed order.");
    }
    return [[o.history, at], [["placed", "accepted", "preparing", "ready", "picked_up", "delivered"], D.dispatchAt(20, 8)]];
  },

  "courier-tracking": f => {
    const tr = new D.Tracker();
    const pings = [{ t: 1, at: [0, 0] }, { t: 3, at: [0, 2] }, { t: 2, at: [0, 1] }, { t: 3, at: [0, 2] }];
    const results = [];
    const snap = note => f(note, A("pings in arrival order (time)", pings.slice(0, results.length).map((p, i) => `t${p.t} ${results[i]}`), Object.fromEntries(results.map((r, i) => [i, r === "live" ? "ok" : r === "late" ? "cmp" : "bad"]))), V({ "live dot at time": tr.where("c1")?.t ?? "none", trail: tr.trail.get("c1")?.map(p => `t${p.t}`) ?? [] }));
    snap("The rider's phone sends GPS pings with the time they were taken. Networks deliver them out of order, and sometimes twice.");
    const notes = ["t1 arrives: the first ping, so it becomes the live dot.", "t3 arrives: newer, so the live dot moves to t3.", "t2 arrives late: older than t3, so the dot stays at t3, but t2 still goes into the trail in the right place.", "t3 arrives again: an exact duplicate, so it is ignored."];
    pings.forEach((p, i) => {
      results.push(tr.ping("c1", p));
      snap(notes[i]);
    });
    const parcel = { status: "out_for_delivery", otp: "4821" };
    const tries = [];
    for (const code of ["0000", "4821"]) {
      tries.push(`${code}: ${D.confirmDelivery(parcel, code) ? "accepted" : "rejected"}`);
      f(code === "0000" ? "At the door, the rider types a wrong code. Rejected: the parcel stays out for delivery." : "The customer reads out the code from their SMS. Accepted: the parcel is delivered.", A("delivery code tries", tries, Object.fromEntries(tries.map((t, i) => [i, t.endsWith("accepted") ? "ok" : "bad"]))), V({ status: parcel.status }));
    }
    return [[results, parcel.status], [["live", "live", "late", "duplicate"], "delivered"]];
  },

  twitter: f => {
    const by = new Map([["ana", [{ id: "a3", at: 30 }, { id: "a1", at: 10 }]], ["bob", [{ id: "b2", at: 20 }]], ["cat", [{ id: "c4", at: 40 }, { id: "c0", at: 5 }]]]);
    const heads = { ana: 0, bob: 0, cat: 0 }, out = [];
    const lists = () => [...by].map(([a, l]) => A(`${a}'s tweets (newest first)`, l.map(t => `${t.id} @${t.at}`), Object.fromEntries(l.map((_, i) => [i, i < heads[a] ? "dim" : ""]).filter(x => x[1])), heads[a] < l.length ? { [heads[a]]: "↑next" } : {}));
    f("You follow ana, bob and cat. Each one's tweets are already sorted newest first. Build the newest 4 for your timeline.", ...lists(), A("your timeline", out));
    while (out.length < 4) {
      let pick = null;
      for (const [a, l] of by) if (heads[a] < l.length && (!pick || l[heads[a]].at > by.get(pick)[heads[pick]].at)) pick = a;
      const t = by.get(pick)[heads[pick]++];
      out.push(t.id);
      f(`Compare only the next tweet from each person. The newest is ${t.id} (time ${t.at}) from ${pick}. Add it.`, ...lists(), A("your timeline", out, { [out.length - 1]: "ok" }));
    }
    f("Done after 4 picks, without reading anyone's older tweets. With 100M users this is done ahead of time for most authors and cached.", A("your timeline", out, idx(out.map((_, i) => i), "ok")));
    return [out, D.timeline(by, ["ana", "bob", "cat"], 4)];
  },

  facebook: f => {
    const fr = new Map([["me", new Set(["ana", "bob"])], ["ana", new Set(["me", "cat", "dan"])], ["bob", new Set(["me", "cat", "eve"])], ["cat", new Set(["ana", "bob"])]]);
    const counts = new Map();
    const snap = (note, hi) => f(note, KV("friends", [...fr].filter(([k]) => k !== "cat").map(([k, s]) => [k, [...s].join(" ")]), hi), KV("mutual friend counts", counts));
    snap("People you may know. Your friends are ana and bob. Look at their friends.", "me");
    for (const friend of ["ana", "bob"]) {
      for (const ff of fr.get(friend)) if (ff !== "me" && !fr.get("me").has(ff)) counts.set(ff, (counts.get(ff) ?? 0) + 1);
      snap(`${friend}'s friends: skip yourself, count the rest.`, friend);
    }
    const sug = D.suggest(fr, "me");
    f(`Sort by mutual friends: ${sug.map(([p, n]) => `${p} (${n})`).join(", ")}. cat knows both of your friends, so cat comes first.`, A("suggestions", sug.map(([p, n]) => `${p}: ${n} mutual`), { 0: "ok" }));
    const posts = [{ id: "old-close", affinity: 3, likes: 0, ageHours: 48 }, { id: "new-close", affinity: 3, likes: 0, ageHours: 1 }, { id: "new-far-viral", affinity: 1, likes: 200, ageHours: 2 }];
    f("Feed ranking. score = how close you are × how engaging (likes) ÷ how old.", KV("post: close, likes, age", posts.map(p => [p.id, `${p.affinity}, ${p.likes}, ${p.ageHours}h`])));
    const ranked = D.rank(posts);
    f(`Scores: ${posts.map(p => `${p.id} ${D.score(p).toFixed(1)}`).join(", ")}. The viral post wins, then the fresh one from a close friend; the 2 day old post sinks.`, A("feed order", ranked, { 0: "ok" }));
    return [[sug, ranked], [D.suggest(fr, "me"), D.rank(posts)]];
  },

  chatgpt: async f => {
    const msgs = ["hello there!", "a".repeat(40), "b".repeat(40), "what is a heap?"];
    const label = m => (m.length > 20 ? `${m[0]} x40` : m);
    const budget = 20;
    let used = D.tokens("be brief");
    const kept = [];
    f(`The model only fits ${budget} tokens (about 4 characters each). The system prompt "be brief" uses ${used}. Add messages newest first until it is full.`, A("conversation, oldest to newest", msgs.map(m => `${label(m)} (${D.tokens(m)})`)), V({ "tokens used": used, budget }));
    for (let i = msgs.length - 1; i >= 0; i--) {
      const t = D.tokens(msgs[i]);
      if (used + t > budget) {
        f(`"${label(msgs[i])}" needs ${t} more, which would make ${used + t}, over ${budget}. Stop: it and everything older are dropped.`, A("conversation, oldest to newest", msgs.map(m => `${label(m)} (${D.tokens(m)})`), { ...idx(kept, "ok"), ...idx([...Array(i + 1).keys()], "bad") }), V({ "tokens used": used, budget }));
        break;
      }
      used += t;
      kept.push(i);
      f(`Keep "${label(msgs[i])}" (${t} tokens). Total ${used}.`, A("conversation, oldest to newest", msgs.map(m => `${label(m)} (${D.tokens(m)})`), idx(kept, "ok")), V({ "tokens used": used, budget }));
    }
    const shown = [];
    for await (const w of D.streamTokens("a heap keeps the smallest on top")) {
      shown.push(w);
      if (shown.length % 2 === 1 || shown.length === 7) f("The answer streams back one token at a time, so the first word shows in under a second.", A("on screen", shown, { [shown.length - 1]: "cur" }));
    }
    const r = D.fitContext("be brief", msgs.map(text => ({ text })), budget);
    return [[kept.length, used, shown.join(" ")], [r.kept.length, r.used, await D.collect(D.streamTokens("a heap keeps the smallest on top"))]];
  },

  "coding-harness": async f => {
    const files = { "a.js": "let x = 1" };
    const tools = {
      read: ({ path }) => files[path] ?? Promise.reject(new Error(`no file ${path}`)),
      write: ({ path, text }) => ((files[path] = text), "ok"),
      shell: ({ cmd }) => `ran ${cmd}`
    };
    const script = [{ tool: "read", args: { path: "b.js" } }, { tool: "read", args: { path: "a.js" } }, { tool: "write", args: { path: "a.js", text: "let x = 2" } }, { tool: "shell", args: { cmd: "rm -rf /" } }, { done: true, text: "x is now 2" }];
    const says = ["The model asks to read b.js. It doesn't exist: the error goes back to the model as text. No crash.", "It reads a.js instead.", "It writes the change. A checkpoint of the old file would be saved first.", "It asks to run rm -rf /. The harness's permission check denies it. The model can't override that.", "The model says it's done."];
    let i = 0;
    const steps = [];
    const model = async log => {
      const last = log.at(-1);
      if (last.role === "tool") steps[steps.length - 1] += `: ${last.text}`;
      const reply = script[i];
      steps.push(reply.done ? `done: ${reply.text}` : `${reply.tool} ${Object.values(reply.args)[0]}`);
      f(says[i], A("loop steps", steps, { ...idx(steps.map((_, k) => k).filter(k => /error|denied/.test(steps[k])), "bad"), [steps.length - 1]: "cur" }), V({ "a.js": files["a.js"], step: i + 1 }));
      i++;
      return reply;
    };
    const allow = (tool, args) => !(tool === "shell" && /rm -rf/.test(args.cmd));
    f("Task: set x to 2. The harness runs a loop: the model asks for a tool, the harness checks it, runs it, and sends back the result.", A("loop steps", []), V({ "a.js": files["a.js"], step: 0 }));
    const r = await D.agentLoop(model, tools, "set x to 2", { allow });
    f(`Finished in ${r.steps} steps. a.js now says "${files["a.js"]}". A step limit would have stopped a model that never says done.`, A("loop steps", steps, idx(steps.map((_, k) => k), "ok")), V({ "a.js": files["a.js"], steps: r.steps }));
    return [[r.ok, r.steps, files["a.js"]], [true, 5, "let x = 2"]];
  }
};
