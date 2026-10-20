import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

// A completely isolated database and mock transport: never sends customer email.
const db = new PGlite()
let checks = 0
const ok = (condition) => { assert.ok(condition); checks++ }
const eq = (actual, expected) => { assert.deepEqual(actual, expected); checks++ }
const denies = async (fn) => { await assert.rejects(fn, /permission denied/); checks++ }
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]
const processQueue = async () => (await one('select feedback_private.process_emails() as result')).result
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create function public.current_user_role() returns text language sql stable
    as $$select current_setting('test.user_role',true)$$;
  create schema vault; create schema net; create schema cron;
  create table vault.decrypted_secrets(name text primary key, decrypted_secret text);
  create table net._http_response(id bigint, status_code integer, content text);
  create table net.requests(id bigserial, url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds integer)
    returns bigint language sql as $$
      insert into net.requests(url,body,headers) values(url,body,headers) returning id;
    $$;
  create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
  grant usage on schema net to public;
  grant select on all tables in schema net to public;
`)
await db.exec(await readFile('supabase/migrations/20261019230908_user_feedback.sql', 'utf8'))
// Extensions are supplied by mocks above, all application SQL runs unchanged.
const migration = (await readFile('supabase/migrations/20261019235510_feedback_email_delivery.sql', 'utf8'))
  .replace(/^create extension[^\n]+\n/gm, '')
await db.exec(migration)
async function submit() {
  const id = randomUUID()
  await db.exec('set role anon')
  await db.query(`insert into public.user_feedback(id,name,email,experience,planned_use)
    values($1,'Isolated test',$2,'Automated test, not genuine customer feedback.','May publish offers later.')`,
  [id, `test-${id}@example.invalid`])
  await db.exec('reset role')
  return id
}
async function delivery(id) { return one('select * from public.feedback_email_deliveries where feedback_id=$1', [id]) }
async function respond(id, status, content = '{}') {
  await db.query('insert into net._http_response values($1,$2,$3)', [(await delivery(id)).http_request_id, status, content])
  return processQueue()
}
const id = await submit()
eq((await delivery(id)).state, 'pending')
eq((await processQueue()).status, 'configuration_required')
eq((await delivery(id)).attempts, 0)
eq((await one('select count(*)::int as n from net.requests')).n, 0)

await db.exec('set role anon')
await denies(() => db.query('select * from public.feedback_email_deliveries'))
await denies(() => db.query('select * from net.requests'))
await denies(() => db.query('select * from vault.decrypted_secrets'))
await denies(() => db.query('select feedback_private.process_emails()'))
await db.exec("reset role; set role authenticated; set test.user_role='user'")
eq((await db.query('select feedback_id,state from public.feedback_email_deliveries')).rows.length, 0)
await db.exec("set test.user_role='super_admin'")
eq((await db.query('select feedback_id,state,attempts,accepted_at,last_error from public.feedback_email_deliveries')).rows.length, 1)
await denies(() => db.query('select payload from public.feedback_email_deliveries'))
await denies(() => db.query("update public.feedback_email_deliveries set state='accepted'"))
await db.exec('reset role')
await db.exec("insert into vault.decrypted_secrets values('histreets_feedback_resend_api_key','isolated-test-key'),('histreets_feedback_from_email','invalid')")
eq((await processQueue()).status, 'sender_configuration_invalid')
await db.exec("update vault.decrypted_secrets set decrypted_secret='feedback@example.invalid' where name='histreets_feedback_from_email'")
eq((await processQueue()).status, 'dispatched')
let sent = await one('select * from net.requests order by id desc limit 1')
eq(sent.url, 'https://api.resend.com/emails')
eq(sent.body.to, ['ahaque@atomicmail.io'])
eq(sent.body.reply_to, `test-${id}@example.invalid`)
eq(sent.body.from, 'HiStreets <feedback@example.invalid>')
ok(sent.body.text.includes('Future plans:\nMay publish offers later.'))
ok(sent.body.text.includes('Permission to quote with name and organisation: No'))
eq(sent.headers['Idempotency-Key'], `histreets-feedback/${id}`)
eq((await delivery(id)).state, 'sending')
// Retry a transient error with a frozen body and stable idempotency key.
const original = sent
await respond(id, 503)
eq((await delivery(id)).state, 'pending')
await db.exec("update public.feedback_email_deliveries set next_attempt_at=now(); update vault.decrypted_secrets set decrypted_secret='changed@example.invalid' where name='histreets_feedback_from_email'")
eq((await processQueue()).status, 'dispatched')
sent = await one('select * from net.requests order by id desc limit 1')
eq(sent.body, original.body)
eq(sent.headers['Idempotency-Key'], original.headers['Idempotency-Key'])
await respond(id, 200, '{"id":"mock-provider-id"}')
eq((await delivery(id)).state, 'accepted')
eq((await delivery(id)).provider_message_id, 'mock-provider-id')
eq((await processQueue()).status, 'idle')

const failed = await submit()
await processQueue(); await respond(failed, 403)
eq((await delivery(failed)).state, 'needs_attention')
ok(await one('select id from public.user_feedback where id=$1', [failed]))
const ambiguous = await submit()
await processQueue(); await respond(ambiguous, 200, 'not valid JSON')
eq((await delivery(ambiguous)).state, 'needs_attention')
const lost = await submit()
await processQueue()
await db.query("update public.feedback_email_deliveries set last_attempt_at=now()-interval '11 minutes' where feedback_id=$1", [lost])
eq((await processQueue()).status, 'dispatched')
eq((await delivery(lost)).attempts, 2)
const lostRetry = await one('select * from net.requests order by id desc limit 1')
eq(lostRetry.headers['Idempotency-Key'], `histreets-feedback/${lost}`)
await respond(lost, 200, '{"id":"mock-retry-id"}')
const exhausted = await submit()
await processQueue()
await db.query('update public.feedback_email_deliveries set attempts=8 where feedback_id=$1', [exhausted])
await respond(exhausted, 429)
eq((await delivery(exhausted)).state, 'needs_attention')
const expired = await submit()
await db.query("update public.feedback_email_deliveries set first_attempt_at=now()-interval '24 hours' where feedback_id=$1", [expired])
eq((await processQueue()).status, 'idle')
eq((await delivery(expired)).state, 'needs_attention')
// A rolled-back response cannot leave a queued email behind.
await db.exec('begin')
const rolledBack = await submit()
await db.exec('rollback')
eq(await delivery(rolledBack), undefined)
eq((await one('select count(*)::int as n from public.user_feedback')).n, 6)
await db.close()
console.log(`${checks} feedback email privacy, queue, provider response and retry checks passed without sending any email.`)
