-- Structured public posts, owner-managed public business images and optional
-- CV support where the employer explicitly chooses it.

alter table public.posts add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.posts drop constraint if exists posts_details_object_check;
alter table public.posts add constraint posts_details_object_check check (jsonb_typeof(details)='object');
alter table public.job_applications alter column cv_url drop not null;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-assets','business-assets',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists business_owners_insert_assets on storage.objects;
create policy business_owners_insert_assets on storage.objects for insert to authenticated
with check (bucket_id='business-assets' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(name))[1] and b.claimed_by=(select auth.uid()) and b.verification_status='verified'));
drop policy if exists business_owners_select_assets on storage.objects;
create policy business_owners_select_assets on storage.objects for select to authenticated
using (bucket_id='business-assets' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(name))[1] and b.claimed_by=(select auth.uid()) and b.verification_status='verified'));
drop policy if exists business_owners_update_assets on storage.objects;
create policy business_owners_update_assets on storage.objects for update to authenticated
using (bucket_id='business-assets' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(name))[1] and b.claimed_by=(select auth.uid()) and b.verification_status='verified'))
with check (bucket_id='business-assets' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(name))[1] and b.claimed_by=(select auth.uid()) and b.verification_status='verified'));
drop policy if exists business_owners_delete_assets on storage.objects;
create policy business_owners_delete_assets on storage.objects for delete to authenticated
using (bucket_id='business-assets' and exists(select 1 from public.businesses b where b.id::text=(storage.foldername(name))[1] and b.claimed_by=(select auth.uid()) and b.verification_status='verified'));

create or replace function public.create_verified_business_post_v2(
  p_business_id uuid,p_type text,p_title text,p_body text,p_category text,p_expires_at timestamptz,
  p_apply_url text default null,p_apply_phone text default null,p_recurrence text default null,p_details jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_role text:=public.current_user_role(); v_business public.businesses%rowtype; v_id uuid; v_details jsonb:=coalesce(p_details,'{}'::jsonb);
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_type not in ('offer','job','free_meal','community') then raise exception 'invalid post type'; end if;
  if nullif(trim(coalesce(p_title,'')),'') is null or nullif(trim(coalesce(p_body,'')),'') is null then raise exception 'title and description required'; end if;
  if p_expires_at is null or p_expires_at<=now() then raise exception 'future expiry date required'; end if;
  if jsonb_typeof(v_details)<>'object' or pg_column_size(v_details)>4096 then raise exception 'invalid post details'; end if;
  select * into v_business from public.businesses where id=p_business_id and public.is_public_histreets_business(verification_status,source,claimed_by);
  if not found then raise exception 'verified registered business required'; end if;
  if v_role not in ('admin','super_admin') and v_business.claimed_by is distinct from v_uid then raise exception 'you can only post from your own verified business'; end if;
  if v_role not in ('business','charity','admin','super_admin') then raise exception 'verified business account required'; end if;
  insert into public.posts(business_id,author_id,type,title,body,category,geom,expires_at,apply_url,apply_phone,recurrence,details,status,source)
  values(p_business_id,v_uid,p_type,trim(p_title),trim(p_body),nullif(trim(coalesce(p_category,'')),''),v_business.geom,p_expires_at,nullif(trim(coalesce(p_apply_url,'')),''),nullif(trim(coalesce(p_apply_phone,'')),''),nullif(trim(coalesce(p_recurrence,'')),''),v_details,'pending',case when v_role in ('admin','super_admin') then 'admin' else 'web' end)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.create_verified_business_post_v2(uuid,text,text,text,text,timestamptz,text,text,text,jsonb) from public,anon;
grant execute on function public.create_verified_business_post_v2(uuid,text,text,text,text,timestamptz,text,text,text,jsonb) to authenticated,service_role;

create or replace view public.posts_public with (security_invoker=true) as
select p.id,p.business_id,p.author_id,p.type,p.title,p.body,p.category,p.lat,p.lng,p.starts_at,p.expires_at,p.recurrence,p.apply_url,p.apply_phone,p.status,p.source,p.created_at,
  b.name as business_name,b.category as business_category,b.address as business_address,b.lat as business_lat,b.lng as business_lng,
  p.details,b.phone as business_phone,b.website as business_website,b.whatsapp as business_whatsapp,b.source as business_source,b.verification_status as business_verification_status
from public.posts p left join public.businesses b on b.id=p.business_id
where p.status='live' and p.expires_at>now();
grant select on public.posts_public to anon,authenticated,service_role;

create or replace function public.submit_job_application(p_post_id uuid,p_applicant_name text,p_applicant_email text,p_applicant_phone text,p_cover_note text default '',p_cv_url text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_post public.posts%rowtype; v_business public.businesses%rowtype; v_id uuid; v_cv_required boolean;
begin
  if nullif(trim(coalesce(p_applicant_name,'')), '') is null then raise exception 'name required'; end if;
  if nullif(trim(coalesce(p_applicant_email,'')), '') is null then raise exception 'email required'; end if;
  if nullif(trim(coalesce(p_applicant_phone,'')), '') is null then raise exception 'phone required'; end if;
  select * into v_post from public.posts where id=p_post_id and type='job' and status='live' and expires_at>now();
  if not found then raise exception 'job is not live'; end if;
  v_cv_required:=coalesce((v_post.details->>'cv_required')::boolean,true);
  if v_cv_required and nullif(trim(coalesce(p_cv_url,'')), '') is null then raise exception 'CV is required'; end if;
  select * into v_business from public.businesses where id=v_post.business_id and public.is_public_histreets_business(verification_status,source,claimed_by);
  if not found then raise exception 'verified business required'; end if;
  if exists(select 1 from public.job_applications where post_id=p_post_id and lower(applicant_email)=lower(trim(p_applicant_email)) and created_at>now()-interval '24 hours') then raise exception 'an application from this email was already submitted for this job'; end if;
  insert into public.job_applications(post_id,business_id,applicant_name,applicant_email,applicant_phone,cover_note,cv_url)
  values(p_post_id,v_business.id,trim(p_applicant_name),lower(trim(p_applicant_email)),trim(p_applicant_phone),nullif(trim(coalesce(p_cover_note,'')), ''),nullif(trim(coalesce(p_cv_url,'')), '')) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.submit_job_application(uuid,text,text,text,text,text) from public;
grant execute on function public.submit_job_application(uuid,text,text,text,text,text) to anon,authenticated,service_role;
