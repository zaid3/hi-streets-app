-- Final business/admin contract for HiStreets.
-- This migration aligns the production database with the current React business portal.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user','business','charity','admin','super_admin'));

alter table public.businesses add column if not exists registration_note text;

create table if not exists public.business_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('shopfront','inside')),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
alter table public.business_verification_evidence enable row level security;
revoke all on table public.business_verification_evidence from anon, authenticated;
grant select, insert, update, delete on table public.business_verification_evidence to service_role;
create index if not exists business_verification_evidence_business_idx on public.business_verification_evidence(business_id, created_at desc);

create table if not exists public.business_ownership_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.business_ownership_requests enable row level security;
revoke all on table public.business_ownership_requests from anon, authenticated;
grant select, insert, update, delete on table public.business_ownership_requests to service_role;
create unique index if not exists one_pending_ownership_request_per_business on public.business_ownership_requests(business_id) where status='pending';
create index if not exists business_ownership_requester_idx on public.business_ownership_requests(requester_id, created_at desc);

create or replace function public.register_my_business(
  p_name text,p_category text,p_description text,p_address text,p_phone text,p_website text,
  p_whatsapp text,p_email text,p_opening_hours text,p_lat double precision,p_lng double precision,p_evidence_note text
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_geom geometry(Point,4326):=st_setsrid(st_makepoint(p_lng,p_lat),4326);
  v_id uuid;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if nullif(trim(coalesce(p_name,'')),'') is null then raise exception 'business name required'; end if;
  if nullif(trim(coalesce(p_category,'')),'') is null then raise exception 'category required'; end if;
  if nullif(trim(coalesce(p_address,'')),'') is null then raise exception 'address or service area required'; end if;
  if nullif(trim(coalesce(p_evidence_note,'')),'') is null then raise exception 'verification note required'; end if;
  if not exists(select 1 from public.boundaries where name='Newham') then raise exception 'Newham boundary is unavailable'; end if;
  if not st_contains((select geom from public.boundaries where name='Newham'),v_geom) then raise exception 'business location must be inside Newham'; end if;
  if exists(select 1 from public.businesses b where lower(trim(b.name))=lower(trim(p_name)) and lower(trim(coalesce(b.address,'')))=lower(trim(p_address)) and b.verification_status<>'rejected') then
    raise exception 'this business already exists or is awaiting review';
  end if;
  insert into public.businesses(name,category,description,address,phone,website,whatsapp,email,opening_hours,geom,lat,lng,claimed_by,verification_status,source,registration_note,created_at,updated_at)
  values(trim(p_name),trim(p_category),nullif(trim(coalesce(p_description,'')),''),trim(p_address),nullif(trim(coalesce(p_phone,'')),''),nullif(trim(coalesce(p_website,'')),''),nullif(trim(coalesce(p_whatsapp,'')),''),nullif(lower(trim(coalesce(p_email,''))),''),nullif(trim(coalesce(p_opening_hours,'')),''),v_geom,p_lat,p_lng,v_uid,'pending','owner_registration',trim(p_evidence_note),now(),now())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.register_my_business(text,text,text,text,text,text,text,text,text,double precision,double precision,text) from public,anon;
grant execute on function public.register_my_business(text,text,text,text,text,text,text,text,text,double precision,double precision,text) to authenticated,service_role;

create or replace function public.record_business_verification_evidence(p_business_id uuid,p_kind text,p_storage_path text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if p_kind not in ('shopfront','inside') then raise exception 'invalid evidence type'; end if;
  if not exists(select 1 from public.businesses where id=p_business_id and claimed_by=auth.uid() and verification_status='pending') then raise exception 'pending business ownership required'; end if;
  insert into public.business_verification_evidence(business_id,kind,storage_path) values(p_business_id,p_kind,trim(p_storage_path)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.record_business_verification_evidence(uuid,text,text) from public,anon;
grant execute on function public.record_business_verification_evidence(uuid,text,text) to authenticated,service_role;

create or replace function public.admin_business_verification_evidence(p_business_id uuid)
returns table(id uuid,business_id uuid,kind text,storage_path text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select e.id,e.business_id,e.kind,e.storage_path,e.created_at from public.business_verification_evidence e
  where e.business_id=p_business_id and public.current_user_role() in ('admin','super_admin') order by e.created_at asc
$$;
revoke all on function public.admin_business_verification_evidence(uuid) from public,anon;
grant execute on function public.admin_business_verification_evidence(uuid) to authenticated,service_role;

create or replace function public.delete_business_verification_evidence(p_business_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_user_role() not in ('admin','super_admin') then raise exception 'admin only'; end if;
  delete from public.business_verification_evidence where business_id=p_business_id;
end $$;
revoke all on function public.delete_business_verification_evidence(uuid) from public,anon;
grant execute on function public.delete_business_verification_evidence(uuid) to authenticated,service_role;

create or replace function public.search_claimable_businesses(p_query text)
returns table(id uuid,name text,category text,address text,lat double precision,lng double precision,verification_status text,source text)
language sql stable security definer set search_path=public as $$
  select b.id,b.name,b.category,b.address,b.lat,b.lng,b.verification_status,b.source
  from public.businesses b
  where auth.uid() is not null and b.claimed_by is null and b.verification_status in ('unclaimed','verified')
    and (b.name ilike '%'||trim(p_query)||'%' or coalesce(b.address,'') ilike '%'||trim(p_query)||'%')
    and exists(select 1 from public.boundaries n where n.name='Newham' and st_contains(n.geom,b.geom))
  order by case when lower(b.name)=lower(trim(p_query)) then 0 else 1 end,b.name limit 25
$$;
revoke all on function public.search_claimable_businesses(text) from public,anon;
grant execute on function public.search_claimable_businesses(text) to authenticated,service_role;

create or replace function public.request_business_ownership(p_business_id uuid,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'sign in required'; end if;
  if length(trim(coalesce(p_note,'')))<10 then raise exception 'verification note is too short'; end if;
  if not exists(select 1 from public.businesses where id=p_business_id and claimed_by is null and verification_status in ('unclaimed','verified')) then raise exception 'business is not available to claim'; end if;
  if exists(select 1 from public.business_ownership_requests where requester_id=auth.uid() and status='pending') then raise exception 'you already have a pending ownership request'; end if;
  insert into public.business_ownership_requests(business_id,requester_id,note) values(p_business_id,auth.uid(),trim(p_note)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.request_business_ownership(uuid,text) from public,anon;
grant execute on function public.request_business_ownership(uuid,text) to authenticated,service_role;

create or replace function public.my_business_ownership_requests()
returns table(id uuid,business_id uuid,business_name text,business_address text,status text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select r.id,r.business_id,b.name,b.address,r.status,r.created_at
  from public.business_ownership_requests r join public.businesses b on b.id=r.business_id
  where r.requester_id=auth.uid() order by r.created_at desc
$$;
revoke all on function public.my_business_ownership_requests() from public,anon;
grant execute on function public.my_business_ownership_requests() to authenticated,service_role;

create or replace function public.admin_business_ownership_requests()
returns table(id uuid,business_id uuid,business_name text,business_address text,status text,created_at timestamptz,business_category text,requester_id uuid,requester_email text,note text)
language sql stable security definer set search_path=public as $$
  select r.id,r.business_id,b.name,b.address,r.status,r.created_at,b.category,r.requester_id,u.email,r.note
  from public.business_ownership_requests r join public.businesses b on b.id=r.business_id left join auth.users u on u.id=r.requester_id
  where public.current_user_role() in ('admin','super_admin') and r.status='pending' order by r.created_at asc
$$;
revoke all on function public.admin_business_ownership_requests() from public,anon;
grant execute on function public.admin_business_ownership_requests() to authenticated,service_role;

create or replace function public.admin_moderate_ownership_request(p_request_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_req public.business_ownership_requests%rowtype;
begin
  if public.current_user_role() not in ('admin','super_admin') then raise exception 'admin only'; end if;
  if p_status not in ('approved','rejected') then raise exception 'invalid status'; end if;
  select * into v_req from public.business_ownership_requests where id=p_request_id and status='pending' for update;
  if not found then raise exception 'ownership request not found'; end if;
  update public.business_ownership_requests set status=p_status,decided_by=auth.uid(),decided_at=now() where id=p_request_id;
  if p_status='approved' then
    update public.businesses set claimed_by=v_req.requester_id,verification_status='verified',verified_at=now(),verified_via='admin_ownership_review',updated_at=now() where id=v_req.business_id and claimed_by is null;
    update public.profiles set role='business' where id=v_req.requester_id and role='user';
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata) values(auth.uid(),'moderate_ownership_request','business_ownership_request',p_request_id,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.admin_moderate_ownership_request(uuid,text) from public,anon;
grant execute on function public.admin_moderate_ownership_request(uuid,text) to authenticated,service_role;

create or replace function public.admin_moderate_business_registration(p_business_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_business public.businesses%rowtype;
begin
  if public.current_user_role() not in ('admin','super_admin') then raise exception 'admin only'; end if;
  if p_status not in ('verified','rejected') then raise exception 'invalid status'; end if;
  select * into v_business from public.businesses where id=p_business_id and verification_status='pending' for update;
  if not found then raise exception 'pending business not found'; end if;
  update public.businesses set verification_status=p_status,verified_at=case when p_status='verified' then now() else null end,verified_via=case when p_status='verified' then 'admin_review' else verified_via end,registration_note=null,updated_at=now() where id=p_business_id;
  if p_status='verified' and v_business.claimed_by is not null then update public.profiles set role='business' where id=v_business.claimed_by and role='user'; end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata) values(auth.uid(),'moderate_business_registration','business',p_business_id,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.admin_moderate_business_registration(uuid,text) from public,anon;
grant execute on function public.admin_moderate_business_registration(uuid,text) to authenticated,service_role;

create or replace function public.admin_dashboard_overview()
returns table(total_businesses bigint,pending_businesses bigint,verified_businesses bigint,live_posts bigint,pending_posts bigint,job_applications bigint)
language sql stable security definer set search_path=public as $$
  select (select count(*) from public.businesses),(select count(*) from public.businesses where verification_status='pending'),(select count(*) from public.businesses where verification_status='verified'),(select count(*) from public.posts where status='live'),(select count(*) from public.posts where status='pending'),(select count(*) from public.job_applications)
  where public.current_user_role() in ('admin','super_admin')
$$;
revoke all on function public.admin_dashboard_overview() from public,anon;
grant execute on function public.admin_dashboard_overview() to authenticated,service_role;

create or replace function public.admin_dashboard_businesses(p_status text default null)
returns table(id uuid,name text,category text,address text,phone text,website text,email text,verification_status text,source text,registration_note text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select b.id,b.name,b.category,b.address,b.phone,b.website,b.email,b.verification_status,b.source,b.registration_note,b.created_at
  from public.businesses b where public.current_user_role() in ('admin','super_admin') and (p_status is null or b.verification_status=p_status)
  order by b.created_at desc limit 200
$$;
revoke all on function public.admin_dashboard_businesses(text) from public,anon;
grant execute on function public.admin_dashboard_businesses(text) to authenticated,service_role;

create or replace function public.admin_dashboard_posts(p_status text default null)
returns table(id uuid,type text,title text,body text,status text,business_name text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id,p.type,p.title,p.body,p.status,b.name,p.created_at from public.posts p left join public.businesses b on b.id=p.business_id
  where public.current_user_role() in ('admin','super_admin') and (p_status is null or p.status=p_status)
  order by p.created_at desc limit 200
$$;
revoke all on function public.admin_dashboard_posts(text) from public,anon;
grant execute on function public.admin_dashboard_posts(text) to authenticated,service_role;

create or replace function public.admin_moderate_post(p_post_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if public.current_user_role() not in ('admin','super_admin') then raise exception 'admin only'; end if;
  if p_status not in ('live','rejected','removed') then raise exception 'invalid status'; end if;
  update public.posts set status=p_status,updated_at=now() where id=p_post_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata) values(auth.uid(),'moderate_post','post',p_post_id,jsonb_build_object('status',p_status));
end $$;
revoke all on function public.admin_moderate_post(uuid,text) from public,anon;
grant execute on function public.admin_moderate_post(uuid,text) to authenticated,service_role;

create or replace function public.admin_decide_business_claim(p_claim_id uuid,p_approved boolean,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_claim public.business_claims%rowtype;
begin
  if public.current_user_role() not in ('admin','super_admin') then raise exception 'admin only'; end if;
  select * into v_claim from public.business_claims where id=p_claim_id;
  if not found then raise exception 'claim not found'; end if;
  update public.business_claims set status=case when p_approved then 'approved' else 'rejected' end,decided_by=auth.uid(),decided_at=now(),ai_notes=coalesce(ai_notes,'{}'::jsonb)||jsonb_build_object('admin_reason',coalesce(p_reason,'')) where id=p_claim_id;
  if p_approved then
    update public.businesses set claimed_by=v_claim.claimant_id,verification_status='verified',verified_via=v_claim.method,verified_at=now(),updated_at=now() where id=v_claim.business_id;
    update public.profiles set role='business' where id=v_claim.claimant_id and role='user';
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata) values(auth.uid(),case when p_approved then 'approve_business_claim' else 'reject_business_claim' end,'business_claim',p_claim_id,jsonb_build_object('reason',coalesce(p_reason,'')));
end $$;
revoke all on function public.admin_decide_business_claim(uuid,boolean,text) from public,anon;
grant execute on function public.admin_decide_business_claim(uuid,boolean,text) to authenticated,service_role;

create or replace function public.my_job_applications()
returns table(id uuid,post_id uuid,business_id uuid,job_title text,business_name text,applicant_name text,applicant_email text,applicant_phone text,cover_note text,cv_url text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select ja.id,ja.post_id,ja.business_id,p.title,b.name,ja.applicant_name,ja.applicant_email,ja.applicant_phone,ja.cover_note,ja.cv_url,ja.created_at
  from public.job_applications ja join public.posts p on p.id=ja.post_id join public.businesses b on b.id=ja.business_id
  where public.current_user_role() in ('admin','super_admin') or b.claimed_by=auth.uid() order by ja.created_at desc
$$;
revoke all on function public.my_job_applications() from public,anon;
grant execute on function public.my_job_applications() to authenticated,service_role;

create or replace function public.update_my_business_profile(p_business_id uuid,p_name text default null,p_category text default null,p_description text default null,p_address text default null,p_phone text default null,p_website text default null,p_whatsapp text default null,p_email text default null,p_opening_hours text default null,p_photo_url text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role text:=public.current_user_role(); v_row public.businesses%rowtype;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  select * into v_row from public.businesses where id=p_business_id and verification_status='verified' and (claimed_by=v_uid or v_role in ('admin','super_admin')) for update;
  if not found then raise exception 'verified business ownership required'; end if;
  update public.businesses set name=coalesce(nullif(trim(coalesce(p_name,'')),''),name),category=coalesce(nullif(trim(coalesce(p_category,'')),''),category),description=coalesce(nullif(trim(coalesce(p_description,'')),''),description),address=coalesce(nullif(trim(coalesce(p_address,'')),''),address),phone=coalesce(nullif(trim(coalesce(p_phone,'')),''),phone),website=coalesce(nullif(trim(coalesce(p_website,'')),''),website),whatsapp=coalesce(nullif(trim(coalesce(p_whatsapp,'')),''),whatsapp),email=coalesce(nullif(lower(trim(coalesce(p_email,''))),''),email),opening_hours=coalesce(nullif(trim(coalesce(p_opening_hours,'')),''),opening_hours),photo_url=coalesce(nullif(trim(coalesce(p_photo_url,'')),''),photo_url),updated_at=now() where id=p_business_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata) values(case when v_role in ('admin','super_admin') then v_uid else null end,'business_profile_updated','business',p_business_id,jsonb_build_object('updated_by',v_uid));
  return public.business_detail(p_business_id);
end $$;
revoke all on function public.update_my_business_profile(uuid,text,text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.update_my_business_profile(uuid,text,text,text,text,text,text,text,text,text,text) to authenticated,service_role;

create or replace function public.create_verified_business_post(p_business_id uuid,p_type text,p_title text,p_body text,p_category text,p_expires_at timestamptz,p_apply_url text default null,p_apply_phone text default null,p_recurrence text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role text:=public.current_user_role(); v_business public.businesses%rowtype; v_id uuid;
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_type not in ('offer','job','free_meal','community') then raise exception 'invalid post type'; end if;
  if nullif(trim(coalesce(p_title,'')),'') is null or nullif(trim(coalesce(p_body,'')),'') is null then raise exception 'title and description required'; end if;
  if p_expires_at is null or p_expires_at<=now() then raise exception 'future expiry date required'; end if;
  select * into v_business from public.businesses where id=p_business_id and public.is_public_histreets_business(verification_status,source,claimed_by);
  if not found then raise exception 'approved registered business required'; end if;
  if v_role not in ('admin','super_admin') and v_business.claimed_by is distinct from v_uid then raise exception 'you can only post from your own approved business'; end if;
  if v_role not in ('business','charity','admin','super_admin') then raise exception 'approved business account required'; end if;
  insert into public.posts(business_id,author_id,type,title,body,category,geom,expires_at,apply_url,apply_phone,recurrence,status,source)
  values(p_business_id,v_uid,p_type,trim(p_title),trim(p_body),nullif(trim(coalesce(p_category,'')),''),v_business.geom,p_expires_at,nullif(trim(coalesce(p_apply_url,'')),''),nullif(trim(coalesce(p_apply_phone,'')),''),nullif(trim(coalesce(p_recurrence,'')),''),'pending',case when v_role in ('admin','super_admin') then 'admin' else 'web' end) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_verified_business_post(uuid,text,text,text,text,timestamptz,text,text,text) from public,anon;
grant execute on function public.create_verified_business_post(uuid,text,text,text,text,timestamptz,text,text,text) to authenticated,service_role;

create or replace function public.add_blue_badge_bay(p_lat double precision,p_lng double precision,p_road_name text,p_notes text,p_photo_url text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_geom geometry(Point,4326):=st_setsrid(st_makepoint(p_lng,p_lat),4326);
begin
  if public.current_user_role() not in ('admin','super_admin') then raise exception 'admin only'; end if;
  if nullif(trim(p_road_name),'') is null or nullif(trim(p_photo_url),'') is null then raise exception 'road name and photo required'; end if;
  if exists(select 1 from public.boundaries where name='Newham') and not st_contains((select geom from public.boundaries where name='Newham'),v_geom) then raise exception 'point outside Newham boundary'; end if;
  insert into public.blue_badge_bays(geom,road_name,notes,photo_url,source,is_published,created_by) values(v_geom,trim(p_road_name),nullif(trim(coalesce(p_notes,'')),''),trim(p_photo_url),'survey',true,auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.add_blue_badge_bay(double precision,double precision,text,text,text) from public,anon;
grant execute on function public.add_blue_badge_bay(double precision,double precision,text,text,text) to authenticated,service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-verification','business-verification',false,8388608,array['image/jpeg','image/png','image/webp','image/heic'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
update storage.buckets set public=false where id='job-cvs';

drop policy if exists public_read_job_cvs on storage.objects;
drop policy if exists authenticated_read_job_cvs on storage.objects;
drop policy if exists business_verification_insert on storage.objects;
drop policy if exists business_verification_read on storage.objects;
drop policy if exists business_verification_delete on storage.objects;

create or replace function public.can_read_job_cv(p_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and exists(
    select 1 from public.job_applications ja join public.businesses b on b.id=ja.business_id
    where (ja.cv_url=p_path or ja.cv_url like '%'||p_path) and (b.claimed_by=auth.uid() or public.current_user_role() in ('admin','super_admin'))
  )
$$;
revoke all on function public.can_read_job_cv(text) from public,anon;
grant execute on function public.can_read_job_cv(text) to authenticated,service_role;

create or replace function public.can_manage_business_evidence(p_path text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_text text:=split_part(p_path,'/',2); v_business uuid;
begin
  if auth.uid() is null or v_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false; end if;
  v_business:=v_text::uuid;
  return public.current_user_role() in ('admin','super_admin') or exists(select 1 from public.businesses where id=v_business and claimed_by=auth.uid());
end $$;
revoke all on function public.can_manage_business_evidence(text) from public,anon;
grant execute on function public.can_manage_business_evidence(text) to authenticated,service_role;

create policy authenticated_read_job_cvs on storage.objects for select to authenticated using(bucket_id='job-cvs' and public.can_read_job_cv(name));
create policy business_verification_insert on storage.objects for insert to authenticated with check(bucket_id='business-verification' and public.can_manage_business_evidence(name));
create policy business_verification_read on storage.objects for select to authenticated using(bucket_id='business-verification' and public.can_manage_business_evidence(name));
create policy business_verification_delete on storage.objects for delete to authenticated using(bucket_id='business-verification' and public.can_manage_business_evidence(name));

alter table public.businesses_backup enable row level security;
revoke all on table public.businesses_backup from anon,authenticated;
grant select,insert,update,delete on table public.businesses_backup to service_role;

revoke execute on function public.filter_businesses_to_newham() from public,anon,authenticated;
grant execute on function public.filter_businesses_to_newham() to service_role;
revoke execute on function public.upsert_boundary(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.upsert_boundary(text,jsonb,text) to service_role;
revoke execute on function public.upsert_cpz_zone(text,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.upsert_cpz_zone(text,jsonb,jsonb,jsonb,text) to service_role;
revoke execute on function public.business_research_export() from public,anon,authenticated;
revoke execute on function public.business_research_export_count() from public,anon,authenticated;
revoke execute on function public.business_research_export_csv() from public,anon,authenticated;
grant execute on function public.business_research_export() to service_role;
grant execute on function public.business_research_export_count() to service_role;
grant execute on function public.business_research_export_csv() to service_role;

revoke execute on function public.current_user_role() from public,anon;
grant execute on function public.current_user_role() to authenticated,service_role;
