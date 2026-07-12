-- Sprint 2 safety gate: posts must come from a verified claimed business.
-- Run after supabase/schema_v1.sql, supabase/phase1_admin.sql, and supabase/sprint1_map_finish.sql.
-- No fake/sample data.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- Keep public reads exactly as before: only live, unexpired posts.
drop policy if exists public_read_live_posts on public.posts;
create policy public_read_live_posts on public.posts
for select
using (status = 'live' and expires_at > now());

-- Remove the older looser insert policy that allowed business_id to be null.
drop policy if exists verified_business_insert_posts on public.posts;
drop policy if exists verified_claimed_business_insert_posts on public.posts;

-- Strict rule:
-- 1) Normal users cannot post.
-- 2) Business users can post only for their own claimed + verified business.
-- 3) Charity users can post only for their own claimed + verified charity/community listing.
-- 4) Admin can post for a verified business/listing, but the post still has a business_id.
create policy verified_claimed_business_insert_posts on public.posts
for insert
with check (
  auth.uid() = author_id
  and business_id is not null
  and exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role in ('business','charity','admin')
  )
  and exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.verification_status = 'verified'
      and (
        b.claimed_by = auth.uid()
        or public.current_user_role() = 'admin'
      )
  )
);

-- Owners/admin can update posts, but posts must remain attached to a verified claimed business.
drop policy if exists owners_update_own_posts on public.posts;
drop policy if exists verified_claimed_business_update_posts on public.posts;
create policy verified_claimed_business_update_posts on public.posts
for update
using (
  author_id = auth.uid()
  or public.current_user_role() = 'admin'
)
with check (
  business_id is not null
  and exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.verification_status = 'verified'
      and (
        b.claimed_by = auth.uid()
        or public.current_user_role() = 'admin'
      )
  )
);

-- RPC for the frontend post form. This avoids direct inserts with missing/incorrect fields.
create or replace function public.create_verified_business_post(
  p_business_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_category text,
  p_expires_at timestamptz,
  p_apply_url text default null,
  p_apply_phone text default null,
  p_recurrence text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text := public.current_user_role();
  v_business public.businesses%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;

  if p_type not in ('offer','job','free_meal','community') then
    raise exception 'invalid post type';
  end if;

  if nullif(trim(coalesce(p_title,'')),'') is null then
    raise exception 'title required';
  end if;

  if nullif(trim(coalesce(p_body,'')),'') is null then
    raise exception 'description required';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'future expiry date required';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id
    and verification_status = 'verified';

  if not found then
    raise exception 'verified business required';
  end if;

  if v_role <> 'admin' and v_business.claimed_by is distinct from v_uid then
    raise exception 'you can only post from your own verified business';
  end if;

  if v_role not in ('business','charity','admin') then
    raise exception 'verified business account required';
  end if;

  if p_type = 'job' and nullif(trim(coalesce(p_apply_url,'')),'') is null and nullif(trim(coalesce(p_apply_phone,'')),'') is null then
    raise exception 'jobs need an apply link or phone number';
  end if;

  insert into public.posts(
    business_id,
    author_id,
    type,
    title,
    body,
    category,
    geom,
    expires_at,
    apply_url,
    apply_phone,
    recurrence,
    status,
    source
  ) values (
    p_business_id,
    v_uid,
    p_type,
    trim(p_title),
    trim(p_body),
    nullif(trim(coalesce(p_category,'')),''),
    v_business.geom,
    p_expires_at,
    nullif(trim(coalesce(p_apply_url,'')),''),
    nullif(trim(coalesce(p_apply_phone,'')),''),
    nullif(trim(coalesce(p_recurrence,'')),''),
    'pending',
    case when v_role = 'admin' then 'admin' else 'web' end
  ) returning id into v_id;

  return v_id;
end $$;

grant execute on function public.create_verified_business_post(uuid,text,text,text,text,timestamptz,text,text,text) to authenticated;

notify pgrst, 'reload schema';
