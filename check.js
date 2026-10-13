// node check.js -> runs every test and replays every animation. Exit 1 on any failure.
// Runs as `prebuild`, and again inside the Astro build so the gate cannot be skipped.
import { pathToFileURL } from "node:url";
import * as C from "./concepts.js";
import * as P from "./problems.js";
import * as D from "./design.js";
import { anims } from "./anims.js";
import { designAnims } from "./design-anims.js";
import { pages } from "./src/lib/pages.js";
import { stories } from "./stories.js";

export async function runChecks() {
  const errors = [];
  let pass = 0;

  for (const [label, tests] of [["concept", C.tests], ["problem", P.tests], ["design", D.tests]])
    for (const [id, t] of Object.entries(tests))
      for (const [got, want] of await t()) {
        if (JSON.stringify(got) === JSON.stringify(want)) pass++;
        else errors.push(`FAIL ${label} ${id}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
      }

  // every animation must end on the tested solution's answer
  const frames = {};
  const allAnims = { ...anims, ...Object.fromEntries(Object.entries(designAnims).map(([k, v]) => ["d-" + k, v])) };
  for (const [id, trace] of Object.entries(allAnims)) {
    const fr = [];
    const [mine, real] = await trace((note, ...views) => fr.push({ note, views: JSON.parse(JSON.stringify(views)) }));
    if (JSON.stringify(mine) !== JSON.stringify(real)) errors.push(`ANIM ${id}: animation ended at ${JSON.stringify(mine)}, solution gives ${JSON.stringify(real)}`);
    if (fr.length < 2) errors.push(`ANIM ${id}: only ${fr.length} frame(s)`);
    frames[id] = fr;
  }
  for (const pg of pages) if (pg.tracked && !frames[pg.slug]) errors.push(`ANIM ${pg.slug}: missing`);
  for (const pg of pages) {
    const s = pg.tracked && stories[pg.slug];
    if (pg.tracked && !(s && s.story.length >= 1 && s.examples.length >= 3)) errors.push(`STORY ${pg.slug}: needs a story and at least 3 examples`);
  }
  for (const k of Object.keys(stories)) if (!pages.some(pg => pg.slug === k)) errors.push(`STORY ${k}: no such page`);

  const nFrames = Object.values(frames).reduce((s, f) => s + f.length, 0);
  return { pass, errors, frames, nAnims: Object.keys(frames).length, nFrames };
}

export const summary = r => `tests: ${r.pass} passed, ${r.errors.length} failed · animations: ${r.nAnims} checked, ${r.nFrames} frames`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await runChecks();
  r.errors.forEach(e => console.error(e));
  console.log(summary(r));
  process.exit(r.errors.length ? 1 : 0);
}
