-- HiStreets safe auto-approval setup
-- Purpose:
-- 1) Verified businesses can publish offers/jobs/free meals/community posts automatically when required fields pass safety rules.
-- 2) New business registrations stay pending unless they pass strict auto-verification requirements in a future step.
-- 3) Admin workload is reduced without allowing fake businesses or unsafe public posts.

create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ---------- Helper: simple unsafe-content blocker ----------
create or replace function public.histreets_text_is_safe(p_text text) returns boolean
language sql
stable
as $$
  select not (
    lower(coalesce(p_text, '')) ~ '(casino|gambling|betting|loan shark|sex|escort|weapon|knife|gun|drugs|cocaine|weed|thc|fake passport|fake id|scam|crypto investment|get rich quick|work from home.*fee|pay.*deposit.*job)'
  )
$$;

grant execute on function public.histreets_text_is_safe(text) to anon, authenticated;

-- ---------- Helper: validate posts from verified businesses ----------
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
as $$
begin
  if p_type not in ('offer','job','free_meal','community') then
    return 'invalid post type';
  end if;

  if length(trim(coalesce(p_title, ''))) < 4 then
    return 'title too short';
  end if;

  if length(trim(coalesce(p_title, ''))) > 90 then
    return 'title too long';
  end if;

  if length(trim(coalesce(p_body, ''))) < 12 then
    return 'description too short';
  end if;

  if length(trim(coalesce(p_body, ''))) > 1200 then
    return 'description too long';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    return 'future expiry date required';
  end if;

  if p_expires_at > now() + interval '90 days' then
    return 'expiry date too far ahead';
  end if;

  if not public.histreets_text_is_safe(coalesce(p_title, '') || ' ' || coalesce(p_body, '') || ' ' || coalesce(p_category, '')) then
    return 'unsafe words found';
  end if;

  if p_type = 'job' then
    if length(trim(coalesce(p_title, ''))) < 5 then
      return 'job title required';
    end if;
    if lower(coalesce(p_title, '') || ' ' || coalesce(p_body, '')) ~ '(cash only|no papers|illegal|commission only|deposit required|pay first|training fee)' then
      return 'job wording needs manual review';
    end if;
    -- Jobs use in-app applications, so apply_url/apply_phone are optional.
  end if;

  if p_type in ('free_meal','community') and length(trim(coalesce(p_recurrence, ''))) < 3 then
    return 'availability time required';
  end if;

  return 'approved';
end;
$$;

grant execute on function public.histreets_post_auto_approval_reason(text,text,text,text,timestamptz,text,text,text) to authenticated;

-- ---------- Replace posting function: safe auto-live for verified businesses ----------
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
  v_reason text;
  v_status text := 'pending';
begin
  if v_uid is null then raise exception 'sign in required'; end if;
  if p_type not in ('offer','job','free_meal','community') then raise exception 'invalid post type'; end if;

  select * into v_business from public.businesses
  where id = p_business_id
    and public.is_public_histreets_business(verification_status, source, claimed_by)
  for update;

  if not found then raise exception 'approved registered business required'; end if;
  if v_role <> 'admin' and v_business.claimed_by is distinct from v_uid then raise exception 'you can only post from your own approved business'; end if;
  if v_role not in ('business','charity','admin') then raise exception 'approved business account required'; end if;

  v_reason := public.histreets_post_auto_approval_reason(p_type, p_title, p_body, p_category, p_expires_at, p_apply_url, p_apply_phone, p_recurrence);

  if v_reason = 'approved' then
    v_status := 'live';
  else
    -- Only admins can bypass into live; normal businesses stay pending if rules fail.
    if v_role = 'admin' then
      v_status := 'live';
    else
      v_status := 'pending';
    end if;
  end if;

  insert into public.posts(business_id, author_id, type, title, body, category, geom, expires_at, apply_url, apply_phone, recurrence, status, source)
  values (
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
    v_status,
    case when v_role = 'admin' then 'admin' else 'web_auto_checked' end
  ) returning id into v_id;

  insert into public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  values(
    v_uid,
    case when v_status = 'live' then 'auto_approved_business_post' else 'post_needs_review' end,
    'post',
    v_id,
    jsonb_build_object('status', v_status, 'reason', v_reason, 'type', p_type, 'business_id', p_business_id)
  );

  return v_id;
end;
$$;

grant execute on function public.create_verified_business_post(uuid,text,text,text,text,timestamptz,text,text,text) to authenticated;

notify pgrst, 'reload schema';
