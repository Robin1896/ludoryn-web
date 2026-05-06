import { defineConfig, devices } from "@playwright/test";

// In CI: run against live HuggingFace space (no local server needed)
// Locally: use the local dev server on port 8080
const isCI = !!process.env.CI;
const BASE_URL = process.env.BASE_URL || (isCI
  ? "https://robin1896-ludoryn-web.hf.space"
  : "http://localhost:8080");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI
    ? [["list"], ["json", { outputFile: "report.json" }]]
    : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    video: "on-first-retry",
    // Longer timeouts for live HF space (cold start)
    actionTimeout: isCI ? 15000 : 5000,
    navigationTimeout: isCI ? 30000 : 10000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only start webserver when running locally
  ...(isCI ? {} : {
    webServer: {
      command: "node server.js",
      url: "http://localhost:8080",
      reuseExistingServer: true,
      timeout: 30000,
    },
  }),
});
