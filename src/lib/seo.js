// Titles, structured data and FAQ pairs. Everything marked up here is also visible text on the page.
import { esc } from "./bodies.js";

export const SITE = "https://prep.nadimtuhin.com";
export const BOOK_NAME = "DSA refresher";
export const AUTHOR = { "@type": "Person", name: "Nadim Tuhin", url: "https://github.com/nadimtuhin" };
export const PUBLISHED = "2026-10-12"; // first commit of the book

export const urlOf = pg => `${SITE}/${pg.slug === "index" ? "" : pg.slug}`;

export const seoTitle = pg => {
  if (pg.slug === "index") return "DSA and system design refresher: tested JavaScript, animated";
  const label = { start: pg.title, c: `${pg.title}: how it works`, p: `${pg.title}: solution and complexity` }[pg.part.key]
    ?? (pg.meta.how ? `${pg.title}: how it works` : `${pg.title}: system design`);
  // search results cut titles near 60 chars: drop the book name, then the label, when long
  const full = `${label} · ${BOOK_NAME}`;
  return full.length <= 65 ? full : label.length <= 65 ? label : pg.title;
};

// keep whole sentences that fit; if even the first doesn't, cut at a word and add "..."
const clip = (s, max) => {
  if (s.length <= max) return s;
  let out = "";
  for (const sent of s.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []) {
    if ((out + sent).trim().length > max) break;
    out += sent;
  }
  if (out.trim()) return out.trim();
  return s.slice(0, s.lastIndexOf(" ", max - 4)).replace(/[,.;:]$/, "") + "...";
};

// at most 160 chars: the direct answer first, then what the page gives you
export const metaDescription = pg => {
  const m = pg.meta;
  if (!m) return clip(pg.description, 160);
  if (m.seo) return m.seo; // hand written when the first sentence is too long
  const tail = {
    p: `Tested JavaScript, ${m.time} time, ${m.space} space, animated.`,
    c: "Plain words, examples, tested JavaScript, animation."
  }[pg.part.key] ?? "Plain words, real examples, tested model, animation.";
  const head = clip(pg.description, 160 - tail.length - 1);
  // a whole first sentence beats a cut one plus the tail
  return head.endsWith("...") ? clip(pg.description, 160) : `${head} ${tail}`;
};

// what the share card shows under the title
export const ogSubtitle = pg => {
  const m = pg.meta;
  if (!m) return pg.description;
  if (pg.part.key === "p") return `${m.diff} · ${m.time} time · ${m.space} space · tested JavaScript + animation`;
  return m.seo ?? m.what ?? m.prompt;
};
export const ogImage = pg => `${SITE}/og/${pg.slug}.png`;

const ul = xs => `<ul>${xs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;

// [question, answer as HTML] pairs, each backed by text shown on the page
export const faqOf = pg => {
  const m = pg.meta;
  if (!m) return [];
  if (pg.part.key === "p")
    return [
      [`What should I ask before coding ${m.title}?`, ul(m.clarify)],
      [`What is the time and space complexity of ${m.title}?`, `Time ${esc(m.time)}, space ${esc(m.space)}.`],
      [`What are common mistakes with ${m.title}?`, ul(m.traps)]
    ];
  if (m.how)
    return [
      [`What is ${m.title}?`, esc(m.what)],
      [`When should I use ${m.title}?`, ul(m.when)],
      [`What are common mistakes with ${m.title}?`, ul(m.traps)]
    ];
  return [
    [`What should I ask before designing ${m.title}?`, ul(m.clarify)],
    ...m.deep.map(([q, a]) => [q, esc(a)])
  ];
};

export const jsonLd = (pg, { buildDate, firstOfPart }) => {
  const url = urlOf(pg);
  const crumbs = [["Home", SITE + "/"]];
  if (pg.part.key !== "start") crumbs.push([pg.part.title, urlOf(firstOfPart[pg.part.key])]);
  if (pg.slug !== "index") crumbs.push([pg.title, url]);
  const graph = [
    {
      "@type": "TechArticle",
      headline: pg.title,
      description: pg.description,
      image: ogImage(pg),
      url,
      mainEntityOfPage: url,
      author: AUTHOR,
      datePublished: PUBLISHED,
      dateModified: buildDate,
      inLanguage: "en",
      isPartOf: { "@type": "Book", name: BOOK_NAME, url: SITE + "/", author: AUTHOR }
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item }))
    }
  ];
  const faq = faqOf(pg);
  if (faq.length)
    graph.push({ "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
  return { "@context": "https://schema.org", "@graph": graph };
};
