/** Static demo browser checks at the same /3rr/ project path used by GitHub Pages. */
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.DEMO_PORT ?? 3218);

export default defineConfig({
  testDir: './test/demo',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  reporter: process.env.CI ? 'github' : 'list',
  outputDir: 'test-results/demo',
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/serve-demo.mjs',
    url: `http://127.0.0.1:${String(port)}/3rr/`,
    reuseExistingServer: false,
    timeout: 10_000,
    env: { DEMO_PORT: String(port) },
  },
});
