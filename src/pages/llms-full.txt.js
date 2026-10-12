import { pages, BUILD_DATE } from "../lib/book.js";
import { llmsFullTxt } from "../lib/text.js";

export const GET = () => new Response(llmsFullTxt(pages, BUILD_DATE), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
