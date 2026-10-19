import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

// Isolated PostgreSQL engine. No production account, post, report or email is touched.
const db = new PGlite()
const user='00000000-0000-4000-8000-000000000001'
const admin='00000000-0000-4000-8000-000000000002'
const business='00000000-0000-4000-8000-000000000003'
const post='00000000-0000-4000-8000-000000000004'
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key);
insert into auth.users values('${user}'),('${admin}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create function public.current_user_role() returns text language sql stable as $$select current_setting('test.user_role',true)$$;
create table public.businesses(id uuid primary key,verification_status text,name text);
create table public.posts(id uuid primary key,business_id uuid,title text,body text,status text,expires_at timestamptz,updated_at timestamptz);
insert into public.businesses values('${business}','unclaimed','Test business');
insert into public.posts values('${post}','${business}','Test offer','Test body','live',now()+interval '1 day',now());
create function public.business_detail(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(b) from public.businesses b where id=p_id and verification_status in ('unclaimed','pending','verified','contested')$$;
`)
await db.exec(await readFile('supabase/migrations/20261019175455_mobile_content_reports.sql','utf8'))
let checks=0
async function as(role, id='', profile='') {
  await db.exec(`reset role; set request.jwt.claim.sub='${id}'; set test.user_role='${profile}'; set role ${role};`)
}
async function rejects(sql,pattern) { await assert.rejects(db.exec(sql),pattern); checks++ }
await as('anon')
await db.exec(`select public.submit_content_report('post','${post}','spam','','')`); checks++
await rejects('select * from public.content_reports',/permission denied/)
await rejects("insert into public.content_reports(kind,reporter_hash,reason) values('ai','fake','spam')",/permission denied/)
await rejects(`select public.resolve_content_report('${post}','remove')`,/permission denied/)
await rejects("select public.submit_content_report('post','00000000-0000-4000-8000-000000000099','spam','','')",/Content unavailable/)
await rejects("select public.submit_content_report('ai',null,'spam','',repeat('x',6001))",/Invalid report/)
await db.exec(`select public.submit_content_report('business','${business}','unsafe','','')`); checks++
for(let n=0;n<8;n++)await db.exec("select public.submit_content_report('ai',null,'unsafe','','Test response')")
await rejects("select public.submit_content_report('ai',null,'unsafe','','Too many')",/Report limit/)
await as('authenticated',user,'user')
assert.equal((await db.query('select * from public.content_reports')).rows.length,0); checks++
await rejects(`select public.resolve_content_report('${post}','remove')`,/Admin only/)
await as('authenticated',admin,'')
await rejects(`select public.resolve_content_report('${post}','remove')`,/Admin only/)
await as('authenticated',admin,'admin')
const reports=(await db.query('select * from public.content_reports')).rows
assert.equal(reports.length,10); checks++
await db.exec(`select public.resolve_content_report('${reports.find(r=>r.kind==='business').id}','remove')`); checks++
await as('postgres')
assert.equal((await db.query(`select verification_status from public.businesses where id='${business}'`)).rows[0].verification_status,'revoked'); checks++
assert.equal((await db.query(`select status from public.posts where id='${post}'`)).rows[0].status,'removed'); checks++
for (const status of ['unclaimed','pending','verified','contested']) await rejects(`update public.businesses set verification_status='${status}' where id='${business}'`,/moderation review/)
await rejects(`update public.posts set status='live' where id='${post}'`,/moderation review/)
await as('authenticated',admin,'admin')
await db.exec(`select public.resolve_content_report('${reports.find(r=>r.kind==='ai').id}','dismiss')`); checks++
await as('postgres')
await db.exec(`delete from auth.users where id='${admin}'`)
await as('authenticated',admin,'admin')
await rejects(`select public.resolve_content_report('${reports.find(r=>r.kind==='post').id}','remove')`,/Admin only/)
await db.close()
console.log(`${checks} reporting authorization, rate limit and moderation checks passed in isolated PostgreSQL.`)
