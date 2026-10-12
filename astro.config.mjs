import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://dsa-refresher-pi.vercel.app",
  output: "static",
  build: { format: "file" },
  devToolbar: { enabled: false }
});
