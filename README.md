# DSA refresher

A compact data structures and algorithms refresher for coding interviews, as one static page.

- Part 1: 18 concepts. How each structure works, what it costs, when to use it, where it shows up in production.
- Part 2: 27 easy and easy-medium problems grouped by pattern, with hints, approaches and traps.

Every implementation and solution is TypeScript and has tests. The build runs all tests first and refuses to write the page if any fail.

Live: https://dsa-refresher-pi.vercel.app

## Build

```sh
bun run build.ts   # runs tests, writes public/index.html
```

Content lives in `concepts.ts` and `problems.ts`. Each solution sits between `// #region <id>` and `// #endregion`, and the build pulls that exact source into the page, so the page always shows tested code.

## License

MIT
