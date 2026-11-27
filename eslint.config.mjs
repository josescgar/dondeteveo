import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,jsx,tsx,astro}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The race watchlist is internal sourcing state and must never reach the
    // site bundle or a public page.
    files: [
      "src/pages/**",
      "src/layouts/**",
      "src/components/**",
      "src/features/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/watchlist", "**/watchlist/**"],
              message:
                "The race watchlist is internal tooling data and must not be used by site code.",
            },
          ],
        },
      ],
    },
  },
];
