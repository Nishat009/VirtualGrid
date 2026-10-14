import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.browser.ts',
  timeout: 60_000,
  use: { channel: 'chrome', baseURL: 'http://127.0.0.1:5173', headless: true, viewport: { width: 1600, height: 1000 } },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
