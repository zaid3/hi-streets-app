import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create role service_role;
create function public.current_user_role() returns text language sql stable as $$select current_setting('test.user_role',true)$$;
revoke all on function public.current_user_role() from public,anon;
grant execute on function public.current_user_role() to authenticated;`)
await db.exec(await readFile('supabase/migrations/20261019230908_user_feedback.sql', 'utf8'))
let checks = 0
const runAs = async (role, profile = '') => db.exec(`reset role; set test.user_role='${profile}'; set role ${role}`)
const insert = async (overrides = {}) => {
  const row = { id: randomUUID(), name: 'Feedback test', email: 'feedback-test@example.invalid', experience: 'Isolated automated test, not genuine feedback.', ...overrides }
  const keys = Object.keys(row)
  return db.query(`insert into public.user_feedback (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, Object.values(row))
}
async function denies(fn, pattern = /permission denied/) { await assert.rejects(fn, pattern); checks++ }
await runAs('anon')
await insert(); checks++
await denies(() => db.query('select * from public.user_feedback'))
await denies(() => db.query('select * from feedback_private.user_feedback_limits'))
await denies(() => db.query("update public.user_feedback set quote_consent=true"))
await denies(() => db.query('delete from public.user_feedback'))
await denies(() => insert({ created_at: '2000-01-01T00:00:00Z' }))
await denies(() => insert({ consent_version: 'forged' }))
await denies(() => insert({ name: ' ' }), /check constraint/)
await denies(() => insert({ email: 'not-an-email' }), /check constraint/)
await denies(() => insert({ experience: ' ' }), /check constraint/)
await denies(() => insert({ experience: 'x'.repeat(2001) }), /check constraint/)
await denies(() => insert({ started_on: '2099-01-01' }), /future/)
await denies(() => insert({ features_used: ['Fake feature'] }), /check constraint/)
await insert(); await insert()
await denies(() => insert(), /Feedback limit/)
await runAs('authenticated', 'user')
assert.equal((await db.query('select * from public.user_feedback')).rows.length, 0); checks++
await insert({ email: 'different-test@example.invalid' }); checks++
await runAs('authenticated', 'admin')
assert.equal((await db.query('select * from public.user_feedback')).rows.length, 0); checks++
await runAs('authenticated', 'super_admin')
const rows = (await db.query('select * from public.user_feedback')).rows
assert.equal(rows.length, 4); checks++
assert.equal(rows[0].quote_consent, false); checks++
assert.equal(rows[0].consent_version, '2026-10-20-v1'); checks++
assert.ok(new Date(rows[0].created_at).getFullYear() >= 2026); checks++
await denies(() => db.query("update public.user_feedback set experience='Altered original'"))
await runAs('anon')
const id = randomUUID()
await insert({ id, email: 'retry-test@example.invalid' })
await denies(() => insert({ id, email: 'retry-test@example.invalid' }), /duplicate key/)
for (let n = 0; n < 15; n++) await insert({ email: `network-test-${n}@example.invalid` })
await denies(() => insert({ email: 'network-over-limit@example.invalid' }), /Feedback limit/)
await db.close()
console.log(`${checks} feedback privacy, validation, immutable response, retry and rate-limit checks passed in isolated PostgreSQL.`)
