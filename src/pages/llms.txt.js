import { pages, BUILD_DATE } from "../lib/book.js";
import { llmsTxt } from "../lib/text.js";

export const GET = () => new Response(llmsTxt(pages, BUILD_DATE), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
