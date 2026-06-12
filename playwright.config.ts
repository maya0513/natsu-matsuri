import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5180",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "pnpm exec vp dev --port 5180",
    url: "http://localhost:5180",
    reuseExistingServer: true,
  },
});
