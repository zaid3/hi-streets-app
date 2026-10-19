import { loadEnv } from 'vite'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { validateMobileConfig } from './mobile-config.mjs'
const preview = process.argv.includes('--preview')
const values = preview ? { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' } : validateMobileConfig({ ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env })
for (const [command, args] of [['npm', ['run','build']], ['npx', ['cap','sync']]]) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...values } })
  if (result.error || result.status !== 0) process.exit(result.status || 1)
  if (command === 'npm') writeFileSync('dist/mobile-build.json', JSON.stringify({ configured: !preview, preview, builtAt: new Date().toISOString() }) + '\n')
}
