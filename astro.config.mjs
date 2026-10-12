import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://prep.nadimtuhin.com",
  output: "static",
  build: { format: "file" },
  devToolbar: { enabled: false }
});
