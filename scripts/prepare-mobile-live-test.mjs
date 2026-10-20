import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { validateMobileConfig } from './mobile-config.mjs'

// This is the same public configuration exposed in the public web bundle.
// It grants no user/admin access. Live CI checks are read-only or reject invalid input.
const config = JSON.parse(readFileSync('android/app/src/androidTest/assets/live-backend-public.json', 'utf8'))
const env = validateMobileConfig({ VITE_SUPABASE_URL: config.url, VITE_SUPABASE_ANON_KEY: config.publishableKey })
const result = spawnSync(process.execPath, ['scripts/prepare-mobile.mjs'], { stdio: 'inherit', env: { ...process.env, ...env } })
if (result.error || result.status !== 0) process.exit(result.status || 1)
