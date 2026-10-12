# DSA refresher

A compact data structures, algorithms and system design refresher for interviews. A static book with one page per topic, built for phones first.

- Part 1: 18 concepts. How each structure works, what it costs, when to use it, where it shows up in production.
- Part 2: 27 easy and easy-medium problems grouped by pattern, with hints, approaches and traps.
- Part 3: 13 system design topics. Building blocks (consistent hashing, caching, quorums, pagination, idempotency, outbox, retries and breakers) and worked design problems (URL shortener, rate limiter, webhooks, job dispatch, news feed, chat).

Every implementation and solution is plain JavaScript, has tests, and has a step-by-step animation (play, pause, scrub, arrow keys). The build runs all tests, replays every animation and checks it ends on the same answer as the tested code, and refuses to write the site if anything fails.

Live: https://dsa-refresher-pi.vercel.app

## Build

```sh
node build.js   # tests + animation checks, then public/*.html (one page per topic)
```

No dependencies. Each page inlines only its own animation frames, so a phone loads and animates one topic at a time; `site.css`, `player.js` and `app.js` are shared and cached.

- `concepts.js`, `problems.js`, `design.js`: code, tests and text. Code sits between `// #region <id>` and `// #endregion`; the build copies that exact source into the page, so pages always show tested code.
- `anims.js`, `design-anims.js`: one tracer per entry. It replays the logic on a small input, records frames, and returns its answer next to the tested code's answer.
- `start.js`: the reading pages (how to use, pick a structure, Big O, methods, cheat sheet).
- `player.js`: draws the frames. `app.js`: menu, progress (saved in localStorage), filter, prev/next keys.

## License

MIT
