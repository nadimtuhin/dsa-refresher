// Plain-word stories and everyday examples, one per page. Shown at the top of each page, before the technical text.
// Keyed by page slug: c-<id> concepts, p-<id> problems, d-<id> system design.
// Every entry: { story: [paragraph, ...], examples: [string, ...] }. check.js requires one per topic page.
import { storiesC } from "./stories-c.js";
import { storiesP } from "./stories-p.js";
import { storiesD } from "./stories-d.js";

export const stories = { ...storiesC, ...storiesP, ...storiesD };
