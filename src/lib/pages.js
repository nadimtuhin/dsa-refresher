// The book as data: every page in reading order. No rendering here, so check.js can use it without Astro.
import * as C from "../../concepts.js";
import * as P from "../../problems.js";
import * as D1 from "../../design.js";
import * as D2 from "../../design2.js";
// Part 3 spans two files; merged here so the rest of the book sees one part
const D = { meta: { ...D1.meta, ...D2.meta }, tests: { ...D1.tests, ...D2.tests }, chapters: [...D1.chapters, ...D2.chapters] };

export const parts = [
  { key: "start", title: "Start", chapters: [{ title: "", ids: ["start", "words", "pick", "logn", "bigo", "compare", "method", "sdmethod", "js"] }] },
  { key: "c", title: "Part 1 · Concepts", src: C, chapters: C.chapters },
  { key: "p", title: "Part 2 · Problems", src: P, chapters: P.chapters },
  { key: "d", title: "Part 3 · System design", src: D, chapters: D.chapters }
];

export const startPageInfo = {
  start: ["How to use this", "How this book is organised: concepts, interview problems and system design, one topic per page, with tested JavaScript and animations."],
  words: ["Words in plain English", "Interview words like pointer, O(log n), recursion, cache and idempotent, explained in plain English with an everyday picture for each."],
  pick: ["Pick a structure", "A lookup table from what you need to do to the data structure or algorithm that fits, with its cost."],
  logn: ["What log n means", "log n explained with pictures and animations: how many times you can halve n, why 1 million items need only 20 steps, and how to spot O(log n) in code."],
  bigo: ["Complexity classes", "Big O classes from constant to exponential, what each feels like at a million items, and the terms amortized, average case and stable sort."],
  compare: ["Array vs list vs map", "Array, linked list and hash map compared by the cost of access, search, insert and delete."],
  method: ["Coding: the 6 step method", "A six step routine for solving a coding problem out loud, and which pattern to try for each kind of input."],
  sdmethod: ["System design: the 8 steps", "Eight steps for a system design round, the latency and throughput numbers worth knowing, and phrases that help."],
  js: ["JavaScript cheat sheet", "Short JavaScript reference for Map, Set, arrays, strings and sorting, with three common mistakes."]
};

export const pages = [];
for (const part of parts)
  for (const ch of part.chapters)
    for (const id of ch.ids) {
      if (part.key === "start") {
        const [title, description] = startPageInfo[id];
        pages.push({ part, ch, id, slug: id === "start" ? "index" : id, title, description, tracked: false });
        continue;
      }
      const meta = part.src.meta[id];
      if (!meta || !part.src.tests[id]) throw new Error(`missing meta or tests: ${part.key}-${id}`);
      pages.push({ part, ch, id, slug: `${part.key}-${id}`, title: meta.title, description: meta.what ?? meta.prompt, meta, tracked: true });
    }
