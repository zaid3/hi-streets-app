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
const legacy = await submit()
await db.query("update public.feedback_email_deliveries set attempts=1,state='sending' where feedback_id=$1", [legacy])
const untouched = await submit()
await db.exec(await readFile('supabase/migrations/20261020005540_feedback_cloudflare_delivery.sql','utf8'))
eq((await delivery(legacy)).provider, 'resend')
eq((await delivery(legacy)).state, 'needs_attention')
eq((await delivery(untouched)).provider, 'cloudflare')
await db.query('delete from public.user_feedback where id=any($1::uuid[])', [[legacy,untouched]])
const id = await submit()
eq((await delivery(id)).state, 'pending')
eq((await processQueue()).status, 'configuration_required')
eq((await delivery(id)).attempts, 0)
eq((await one('select count(*)::int as n from net.requests')).n, 0)

await db.exec('set role anon')
await denies(() => db.query('select * from public.feedback_email_deliveries'))
// Hosted Supabase owns net and retains PUBLIC grants. Data API exclusion,
// checked against the live endpoint at deployment, is its browser boundary.
await denies(() => db.query('select * from vault.decrypted_secrets'))
await denies(() => db.query('select feedback_private.process_emails()'))
await db.exec("reset role; set role authenticated; set test.user_role='user'")
eq((await db.query('select feedback_id,state from public.feedback_email_deliveries')).rows.length, 0)
await db.exec("set test.user_role='super_admin'")
eq((await db.query('select feedback_id,state,attempts,accepted_at,last_error from public.feedback_email_deliveries')).rows.length, 1)
await denies(() => db.query('select payload from public.feedback_email_deliveries'))
await denies(() => db.query("update public.feedback_email_deliveries set state='accepted'"))
await db.exec('reset role')
await db.exec("insert into vault.decrypted_secrets values('histreets_feedback_cloudflare_api_token','isolated-test-key'),('histreets_feedback_from_email','invalid')")
eq((await processQueue()).status, 'configuration_required')
await db.exec("insert into vault.decrypted_secrets values('histreets_feedback_cloudflare_account_id','invalid')")
eq((await processQueue()).status, 'account_configuration_invalid')
await db.exec("update vault.decrypted_secrets set decrypted_secret=repeat('a',32) where name='histreets_feedback_cloudflare_account_id'")
eq((await processQueue()).status, 'sender_configuration_invalid')
await db.exec("update vault.decrypted_secrets set decrypted_secret='feedback@example.invalid' where name='histreets_feedback_from_email'")
eq((await processQueue()).status, 'sender_configuration_invalid')
await db.exec("update vault.decrypted_secrets set decrypted_secret='hello@histreets.uk' where name='histreets_feedback_from_email'")
await db.query("update public.user_feedback set experience=$2 where id=$1", [id, '<img src=x onerror=alert(1)> & text'])
eq((await processQueue()).status, 'dispatched')
let sent = await one('select * from net.requests order by id desc limit 1')
eq(sent.url, `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/email/sending/send`)
eq(sent.body.to, ['ahaque@atomicmail.io'])
eq(sent.body.reply_to, `test-${id}@example.invalid`)
eq(sent.body.from, 'HiStreets <hello@histreets.uk>')
ok(sent.body.text.includes('Future plans:\nMay publish offers later.'))
ok(sent.body.text.includes('Permission to quote with name and organisation: No'))
ok(sent.body.html.includes('&lt;img src=x onerror=alert(1)&gt; &amp; text'))
ok(!sent.body.html.includes('<img'))
eq(sent.headers.Authorization, 'Bearer isolated-test-key')
eq(sent.headers['Idempotency-Key'], undefined)
eq((await delivery(id)).state, 'sending')
// A definite 429 rejection retries with the original message unchanged.
const original = sent
await respond(id, 429)
eq((await delivery(id)).state, 'pending')
eq((await processQueue()).status, 'idle')
await db.exec("update public.feedback_email_deliveries set next_attempt_at=now(); update vault.decrypted_secrets set decrypted_secret='changed@histreets.uk' where name='histreets_feedback_from_email'")
eq((await processQueue()).status, 'dispatched')
sent = await one('select * from net.requests order by id desc limit 1')
eq(sent.body, original.body)
await respond(id, 200, JSON.stringify({success:true,result:{delivered:['ahaque@atomicmail.io'],permanent_bounces:[],queued:[],message_id:'mock-id'}}))
eq((await delivery(id)).state, 'accepted')
eq((await delivery(id)).provider_message_id, 'mock-id')
eq((await processQueue()).status, 'idle')
const queued = await submit()
await processQueue()
await respond(queued, 200, JSON.stringify({success:true,result:{delivered:[],queued:['ahaque@atomicmail.io']}}))
eq((await delivery(queued)).state, 'accepted')
// Do not automatically resend ambiguous or permanent failures (no provider deduplication contract).
for (const [status,content] of [
  [403,'{}'], [503,'{}'], [null,'{}'], [200,'not valid JSON'],
  [200,JSON.stringify({success:false,result:{delivered:['ahaque@atomicmail.io']}})],
  [200,JSON.stringify({success:'true',result:{delivered:['ahaque@atomicmail.io']}})],
  [200,JSON.stringify({success:true,result:{delivered:['other@example.invalid']}})],
  [200,JSON.stringify({success:true,result:{delivered:'ahaque@atomicmail.io'}})],
  [200,JSON.stringify({success:true,result:{queued:['ahaque@atomicmail.io'],permanent_bounces:['ahaque@atomicmail.io']}})],
  [200,JSON.stringify({success:true,result:{queued:['ahaque@atomicmail.io'],suppressed_recipients:['ahaque@atomicmail.io']}})],
]) {
  const failed = await submit()
  await processQueue(); await respond(failed,status,content)
  eq((await delivery(failed)).state,'needs_attention')
  eq((await processQueue()).status,'idle')
  eq((await delivery(failed)).attempts,1)
  ok(await one('select id from public.user_feedback where id=$1',[failed]))
}
const lost = await submit()
await processQueue()
await db.query("update public.feedback_email_deliveries set last_attempt_at=now()-interval '11 minutes' where feedback_id=$1", [lost])
eq((await processQueue()).status, 'idle')
eq((await delivery(lost)).state, 'needs_attention')
eq((await delivery(lost)).attempts, 1)
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
eq((await one('select count(*)::int as n from public.user_feedback')).n, 15)
await db.close()
console.log(`${checks} feedback email privacy, queue, provider response and retry checks passed without sending any email.`)
