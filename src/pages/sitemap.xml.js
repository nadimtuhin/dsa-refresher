import { pages, BUILD_DATE } from "../lib/book.js";
import { urlOf } from "../lib/seo.js";

const entry = pg => `<url><loc>${urlOf(pg)}</loc><lastmod>${BUILD_DATE}</lastmod></url>`;
export const GET = () =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(entry).join("")}</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
