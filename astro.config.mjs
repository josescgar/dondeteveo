// @ts-check
import { defineConfig } from "astro/config";

import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

import { createLastmodResolver } from "./src/lib/sitemap-lastmod.ts";

const resolveLastmod = createLastmodResolver(
  fileURLToPath(new URL(".", import.meta.url)),
  new Date(),
);

// https://astro.build/config
export default defineConfig({
  site: "https://dondeteveo.com",
  trailingSlash: "always",
  redirects: {
    "/": {
      status: 301,
      destination: "/es/",
    },
  },
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

        if (/\/og\//.test(page)) {
          return false;
        }

        return !/\/races\/[^/]+\/$/.test(page);
      },
      serialize: (item) => ({ ...item, lastmod: resolveLastmod(item.url) }),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
