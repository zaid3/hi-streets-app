import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/mobile-safety', fullyParallel: false, timeout: 30000,
  use: { ...devices['Pixel 7'], baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'block', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4174',
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_fixture' },
    url: 'http://127.0.0.1:4174', timeout: 120000,
  },
})
