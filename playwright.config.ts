import { defineConfig, devices } from "@playwright/test";

// Avoid accidentally attaching to another local Astro app on the default port.
const PORT = 43211;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    env: {
      ...process.env,
      ASTRO_DEV_BACKGROUND: "0",
      // Test-only race editions (e.g. a provisional edition) merged into the
      // catalog served to e2e tests. See src/lib/races/catalog.ts.
      RACE_DATA_FIXTURES_DIR: "tests/fixtures/data",
    },
    url: BASE_URL,
    reuseExistingServer: false,
  },
});
