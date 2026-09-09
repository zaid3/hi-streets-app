-- Keep the structured v2 posting RPC aligned with the established safe
-- auto-approval flow: only verified businesses can publish and any content
-- that fails deterministic checks remains pending for human review.

create or replace function public.histreets_text_is_safe(p_text text)
returns boolean
language sql
stable
set search_path = public
as $$
  select not (
    lower(coalesce(p_text, '')) ~
      '(casino|gambling|betting|loan shark|sex|escort|weapon|knife|gun|drugs|cocaine|weed|thc|fake passport|fake id|scam|crypto investment|get rich quick|work from home.*fee|pay.*deposit.*job)'
  )
$$;

create or replace function public.histreets_post_auto_approval_reason(
  p_type text,
  p_title text,
  p_body text,
  p_category text,
  p_expires_at timestamptz,
  p_apply_url text default null,
  p_apply_phone text default null,
  p_recurrence text default null
) returns text
language plpgsql
stable
set search_path = public
as $$
begin
  if p_type not in ('offer', 'job', 'free_meal', 'community') then return 'invalid post type'; end if;
  if length(trim(coalesce(p_title, ''))) < 4 then return 'title too short'; end if;
  if length(trim(coalesce(p_title, ''))) > 90 then return 'title too long'; end if;
  if length(trim(coalesce(p_body, ''))) < 12 then return 'description too short'; end if;
  if length(trim(coalesce(p_body, ''))) > 1200 then return 'description too long'; end if;
  if p_expires_at is null or p_expires_at <= now() then return 'future expiry date required'; end if;
  if p_expires_at > now() + interval '90 days' then return 'expiry date too far ahead'; end if;
  if not public.histreets_text_is_safe(coalesce(p_title, '') || ' ' || coalesce(p_body, '') || ' ' || coalesce(p_category, '')) then return 'unsafe words found'; end if;
  if p_type = 'job' and lower(coalesce(p_title, '') || ' ' || coalesce(p_body, '')) ~ '(cash only|no papers|illegal|commission only|deposit required|pay first|training fee)' then return 'job wording needs manual review'; end if;
  if p_type in ('free_meal', 'community') and length(trim(coalesce(p_recurrence, ''))) < 3 then return 'availability time required'; end if;
  return 'approved';
end;
$$;

create or replace function public.create_verified_business_post_v2(
  p_business_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_category text,
  p_expires_at timestamptz,
  p_apply_url text default null,
  p_apply_phone text default null,
  p_recurrence text default null,
  p_details jsonb default '{}'::jsonb
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
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
  v_reason text;
  v_status text := 'pending';
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_type not in ('offer', 'job', 'free_meal', 'community') then raise exception 'invalid post type'; end if;
  if jsonb_typeof(v_details) <> 'object' or pg_column_size(v_details) > 4096 then raise exception 'invalid post details'; end if;

  select * into v_business from public.businesses
  where id = p_business_id
    and public.is_public_histreets_business(verification_status, source, claimed_by)
  for update;
  if not found then raise exception 'verified registered business required'; end if;
  if v_role not in ('admin', 'super_admin') and v_business.claimed_by is distinct from v_uid then raise exception 'you can only post from your own verified business'; end if;
  if v_role not in ('business', 'charity', 'admin', 'super_admin') then raise exception 'verified business account required'; end if;

  v_reason := public.histreets_post_auto_approval_reason(
    p_type, p_title, p_body, p_category, p_expires_at,
    p_apply_url, p_apply_phone, p_recurrence
  );
  if v_reason = 'approved' or v_role in ('admin', 'super_admin') then v_status := 'live'; end if;

  insert into public.posts(
    business_id, author_id, type, title, body, category, geom, expires_at,
    apply_url, apply_phone, recurrence, details, status, source
  ) values (
    p_business_id, v_uid, p_type, trim(p_title), trim(p_body),
    nullif(trim(coalesce(p_category, '')), ''), v_business.geom, p_expires_at,
    nullif(trim(coalesce(p_apply_url, '')), ''), nullif(trim(coalesce(p_apply_phone, '')), ''),
    nullif(trim(coalesce(p_recurrence, '')), ''), v_details, v_status,
    case when v_role in ('admin', 'super_admin') then 'admin' else 'web_auto_checked' end
  ) returning id into v_id;

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values (
    v_uid,
    case when v_status = 'live' then 'auto_approved_business_post' else 'post_needs_review' end,
    'post',
    v_id,
    jsonb_build_object(
      'status', v_status, 'reason', v_reason, 'type', p_type,
      'business_id', p_business_id, 'role', v_role
    )
  );

  return v_id;
end;
$$;

revoke all on function public.create_verified_business_post_v2(uuid,text,text,text,text,timestamptz,text,text,text,jsonb) from public, anon;
grant execute on function public.create_verified_business_post_v2(uuid,text,text,text,text,timestamptz,text,text,text,jsonb) to authenticated, service_role;
