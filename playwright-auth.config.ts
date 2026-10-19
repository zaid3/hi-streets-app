import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/auth-e2e',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/business',
    env: { VITE_SUPABASE_URL: 'https://histreets-auth-test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-publishable-key' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['iPhone 15'] } },
  ],
})
