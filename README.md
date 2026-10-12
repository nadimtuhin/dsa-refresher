# DSA refresher

A compact data structures and algorithms refresher for coding interviews, as one static page.

- Part 1: 18 concepts. How each structure works, what it costs, when to use it, where it shows up in production.
- Part 2: 27 easy and easy-medium problems grouped by pattern, with hints, approaches and traps.

Every implementation and solution is plain JavaScript, has tests, and has a step-by-step animation (play, pause, scrub, arrow keys). The build runs all tests, replays every animation and checks it ends on the same answer as the tested solution, and refuses to write the page if anything fails.

Live: https://dsa-refresher-pi.vercel.app

## Build

```sh
node build.js   # runs tests + animation checks, writes public/index.html
```

No dependencies.

- `concepts.js`, `problems.js`: solutions, tests and text. Each solution sits between `// #region <id>` and `// #endregion`; the build copies that exact source into the page, so the page always shows tested code.
- `anims.js`: one tracer per entry. It replays the algorithm on a small input, records frames, and returns its answer next to the tested solution's answer.
- `player.js`: draws the frames (arrays, maps, trees, graphs, grids, intervals) in the browser.

## License

MIT
