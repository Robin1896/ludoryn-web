import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const BASE_URL = process.env.BASE_URL || (isCI
  ? "https://robin1896-ludoryn-web.hf.space"
  : "http://localhost:8080");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: isCI ? 25000 : 10000,       // per test
  reporter: isCI
    ? [["list"], ["json", { outputFile: "report.json" }]]
    : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    actionTimeout: isCI ? 15000 : 5000,
    navigationTimeout: isCI ? 25000 : 10000,
    locale: "nl-NL",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(isCI ? {} : {
    webServer: {
      command: "node server.js",
      url: "http://localhost:8080",
      reuseExistingServer: true,
      timeout: 30000,
    },
  }),
});
