// @ts-check
import { defineConfig } from "astro/config";

import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://dondeteveo.com",
  integrations: [
    preact(),
    sitemap({
      filter: (page) => {
        if (page === "https://dondeteveo.com/") {
          return false;
        }

        if (/\/share\//.test(page)) {
          return false;
        }

        return !/\/races\/[^/]+\/$/.test(page);
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
