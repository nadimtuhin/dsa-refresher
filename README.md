# DSA refresher

A compact data structures, algorithms and system design refresher for interviews. A static book with one page per topic, built for phones first.

Every topic starts with a short story and everyday examples in plain words; a "Words in plain English" page explains the jargon.

- Part 1: 18 concepts. How each structure works, what it costs, when to use it, where it shows up in production.
- Part 2: 27 easy and easy-medium problems grouped by pattern, with hints, approaches and traps.
- Part 3: 14 system design topics. Building blocks (consistent hashing, caching, quorums, pagination, idempotency, outbox, retries and breakers) and worked design problems (URL shortener, rate limiter, webhooks, job dispatch, news feed, chat, an AI app builder like Lovable).

Every implementation and solution is plain JavaScript, has tests, and has a step-by-step animation (play, pause, scrub, arrow keys). The build runs all tests, replays every animation and checks it ends on the same answer as the tested code, and refuses to write the site if anything fails.

Live: https://prep.nadimtuhin.com

## Build

```sh
npm run build   # tests + animation checks, then Astro writes dist/ (one page per topic)
npm run preview   # links use clean URLs like /p-two-sum
```

One dependency (`astro`, static output, no client framework). Each page inlines only its own animation frames, so a phone loads and animates one topic at a time; `site.css`, `player.js` and `app.js` are shared and cached.

- `concepts.js`, `problems.js`, `design.js`: code, tests and text. Code sits between `// #region <id>` and `// #endregion`; the build copies that exact source into the page, so pages always show tested code.
- `anims.js`, `design-anims.js`: one tracer per entry. It replays the logic on a small input, records frames, and returns its answer next to the tested code's answer.
- `start.js`: the reading pages (how to use, pick a structure, Big O, methods, cheat sheet).
- `player.js`: draws the frames. `app.js`: menu, progress (saved in localStorage), filter, prev/next keys.

## License

MIT

## Share images and favicon

- `node og-art.mjs` draws one picture per page through 9Router (`cx/gpt-image-2`), from the scene list in `og-scenes.js`. Only missing ones are made; `--force` redoes all, `--only=slug,slug` redoes some. The pictures are committed in `og-art/`.
- `npm run og` builds the 1200x630 share cards in `public/og/` (title on the left, picture on the right) and the favicons from `public/favicon.svg`. The build fails if a page has no share card.
