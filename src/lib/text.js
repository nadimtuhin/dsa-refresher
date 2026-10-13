// Plain markdown for llms.txt and llms-full.txt, built from the same data as the pages.
import { sourceOf } from "./bodies.js";
import { stories } from "../../stories.js";
import { SITE, BOOK_NAME, urlOf } from "./seo.js";

const oneLine = s => String(s).replace(/\s+/g, " ").trim();
const bullets = xs => xs.map(x => `- ${x}`).join("\n");
const table = xs => xs.map(([a, b]) => `- ${a}: ${b}`).join("\n");
const fence = src => "```js\n" + src + "\n```";
const section = (title, body) => `### ${title}\n\n${body}`;
const storyText = slug => [section("In plain words", stories[slug].story.join("\n\n")), section("Everyday examples", bullets(stories[slug].examples))];

const startText = html =>
  html
    .replace(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/g, "\n### $1\n")
    .replace(/<tr>(.*?)<\/tr>/gs, (_m, r) => "\n- " + [...r.matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs)].map(c => c[1]).join(" | "))
    .replace(/<li>/g, "\n- ")
    .replace(/<\/(p|pre|ul|table|div)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const conceptText = (pg, m) => [
  m.what,
  ...storyText(pg.slug),
  section("How it works", m.how),
  section("Costs", table(m.ops)),
  section("Reach for it when", bullets(m.when)),
  section("Implementation (JavaScript, tested)", fence(sourceOf(pg.part.key, pg.id))),
  section("Traps", bullets(m.traps)),
  section("In real systems", m.real),
  section("Say out loud", m.say)
];

const problemText = (pg, m) => [
  `#${m.n}, ${m.diff}. ${m.prompt}`,
  ...storyText(pg.slug),
  section("Examples", fence(m.examples.join("\n"))),
  section("Ask before coding", bullets(m.clarify)),
  section("Hint", m.hint),
  section("Approach", `${m.idea}\n\nTime ${m.time}, space ${m.space}.`),
  section("Solution (JavaScript, tested)", fence(sourceOf("p", pg.id))),
  section("Traps", bullets(m.traps)),
  section("Say out loud", m.say)
];

const designProblemText = (pg, m) => [
  m.prompt,
  ...storyText(pg.slug),
  section("Ask first", bullets(m.clarify)),
  section("Numbers", table(m.numbers)),
  section("API", fence(m.api)),
  section("Data", fence(m.data)),
  section("Deep dive", m.deep.map(([q, a]) => `**${q}**\n${a}`).join("\n\n")),
  section("Core logic (JavaScript, tested)", fence(sourceOf("d", pg.id))),
  section("Failures", table(m.failures)),
  section("Trade-offs", bullets(m.tradeoffs)),
  section("Say out loud", m.say)
];

const pageText = pg =>
  pg.part.key === "start" ? [startText(pg.body)]
  : pg.part.key === "c" ? conceptText(pg, pg.meta)
  : pg.part.key === "p" ? problemText(pg, pg.meta)
  : pg.meta.how ? conceptText(pg, pg.meta) : designProblemText(pg, pg.meta);

const summary = `${BOOK_NAME} is a free study book on data structures, algorithms and system design. Every page covers one topic. All JavaScript on the site is tested before the site is built, and each topic has a step-by-step animation. Written by Nadim Tuhin.`;

export const llmsTxt = (pages, buildDate) => {
  const groups = [];
  for (const pg of pages) {
    const name = pg.part.key === "start" ? "Start" : pg.part.title;
    if (groups.at(-1)?.[0] !== name) groups.push([name, []]);
    groups.at(-1)[1].push(`- [${pg.title}](${urlOf(pg)}): ${oneLine(pg.description)}`);
  }
  return [`# ${BOOK_NAME}`, `> ${summary}`, `Full text of every page in one file: ${SITE}/llms-full.txt. Updated ${buildDate}.`,
    ...groups.map(([name, lines]) => `## ${name}\n\n${lines.join("\n")}`)].join("\n\n") + "\n";
};

export const llmsFullTxt = (pages, buildDate) =>
  [`# ${BOOK_NAME}`, `> ${summary}`, `Author: Nadim Tuhin (https://github.com/nadimtuhin). Updated ${buildDate}.`,
    ...pages.map(pg => `## ${pg.title}\n\nURL: ${urlOf(pg)}\nSection: ${pg.part.key === "start" ? "Start" : pg.part.title}${pg.ch.title ? " / " + pg.ch.title : ""}\n\n${pageText(pg).join("\n\n")}`)
  ].join("\n\n---\n\n") + "\n";
