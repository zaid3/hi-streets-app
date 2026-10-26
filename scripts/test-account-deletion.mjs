import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const db = new PGlite()
const alice = '11111111-1111-4111-8111-111111111111'
const bob = '22222222-2222-4222-8222-222222222222'
const guest = '33333333-3333-4333-8333-333333333333'
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key);
insert into auth.users values ('${alice}'),('${bob}'),('${guest}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('test.jwt',true),''),'{}')::jsonb$$;
create function public.current_user_role() returns text language sql stable as $$select current_setting('test.profile',true)$$;
revoke all on function public.current_user_role() from public,anon;
grant execute on function public.current_user_role() to authenticated;`)
await db.exec(await readFile('supabase/migrations/20261026143615_account_deletion_requests.sql', 'utf8'))
let checks = 0
async function as(role, id = '', profile = 'user', anonymous = false) {
  await db.exec('reset role')
  await db.query("select set_config('test.uid',$1,false),set_config('test.profile',$2,false),set_config('test.jwt',$3,false)", [id, profile, JSON.stringify({email: `${id || 'none'}@example.invalid`, is_anonymous:anonymous})])
  await db.exec(`set role ${role}`)
}
const insert = id => db.query('insert into public.account_deletion_requests (user_id) values ($1) returning *', [id])
const rows = () => db.query('select * from public.account_deletion_requests')
async function denied(fn, pattern = /permission denied|row-level security/) { await assert.rejects(fn, pattern); checks++ }
await as('anon')
await denied(rows); await denied(() => insert(alice))
await as('authenticated', alice)
const row = (await insert(alice)).rows[0]
assert.equal(row.contact_email, `${alice}@example.invalid`); checks++
assert.equal(row.notice_version, '2026-10-26-v1'); checks++
assert.equal((await rows()).rows.length, 1); checks++
await denied(() => insert(bob))
await denied(() => insert(alice), /duplicate key/)
await denied(() => db.query("update public.account_deletion_requests set contact_email='changed@example.invalid'"))
await denied(() => db.query('delete from public.account_deletion_requests'))
await as('authenticated', bob)
assert.equal((await rows()).rows.length, 0); checks++
await denied(() => db.query("insert into public.account_deletion_requests (user_id,contact_email) values ($1,'spoof@example.invalid')", [bob]))
await denied(() => db.query("insert into public.account_deletion_requests (user_id,requested_at) values ($1,'2000-01-01')", [bob]))
await denied(() => db.query("insert into public.account_deletion_requests (user_id,notice_version) values ($1,'forged')", [bob]))
await insert(bob); checks++
await as('authenticated', guest, 'user', true)
await denied(() => insert(guest))
await as('authenticated', guest, 'admin')
assert.equal((await rows()).rows.length, 0); checks++
await as('authenticated', guest, 'super_admin')
assert.equal((await rows()).rows.length, 2); checks++
await denied(() => db.query('delete from public.account_deletion_requests'))
await as('authenticated', guest, 'suspended')
await insert(guest); checks++
await as('service_role')
assert.equal((await rows()).rows.length, 3); checks++
await db.exec(`reset role; delete from auth.users where id='${alice}'`)
assert.equal((await rows()).rows.length, 2); checks++
await db.close()
console.log(`${checks} account-deletion ownership, privacy, duplicate and immutable-intake checks passed in isolated PostgreSQL.`)
