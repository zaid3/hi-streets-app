-- Private persistence is independent of mail availability. Credentials stay in Vault.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
-- Best effort on databases where the migration role owns net. Hosted Supabase
-- owns net as supabase_admin and these revokes have no effect there. Keep net
-- outside the Data API's exposed schemas: verify that separately at deployment.
-- All trusted database login roles can read queued HTTP headers on Supabase.
revoke all on schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;
revoke all on all sequences in schema net from public, anon, authenticated;

create table public.feedback_email_deliveries (
  feedback_id uuid primary key references public.user_feedback(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending','sending','accepted','needs_attention')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  http_request_id bigint,
  accepted_at timestamptz,
  provider_message_id text,
  last_error text,
  payload jsonb
);
create index feedback_email_pending_idx on public.feedback_email_deliveries(next_attempt_at) where state='pending';
alter table public.feedback_email_deliveries enable row level security;
revoke all on public.feedback_email_deliveries from public, anon, authenticated;
grant select(feedback_id,state,attempts,accepted_at,last_error) on public.feedback_email_deliveries to authenticated;
grant all on public.feedback_email_deliveries to service_role;
create policy feedback_email_founder_read on public.feedback_email_deliveries for select to authenticated
using ((select public.current_user_role())='super_admin');

create function feedback_private.enqueue_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.feedback_email_deliveries(feedback_id) values(new.id) on conflict do nothing;
  return new;
end $$;
revoke all on function feedback_private.enqueue_email() from public, anon, authenticated;
create trigger queue_feedback_email after insert on public.user_feedback
for each row execute function feedback_private.enqueue_email();
insert into public.feedback_email_deliveries(feedback_id) select id from public.user_feedback on conflict do nothing;

create function feedback_private.process_emails() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  delivery record;
  response record;
  feedback public.user_feedback%rowtype;
  api_key text;
  sender text;
  request_id bigint;
  message_id text;
  body jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('histreets-feedback-email',0)) then
    return jsonb_build_object('status','busy');
  end if;

  -- Reconcile previously dispatched requests without logging customer text or credentials.
  for delivery in select * from public.feedback_email_deliveries where state='sending' for update loop
    select * into response from net._http_response where id=delivery.http_request_id;
    if found then
      if response.status_code between 200 and 299 then
        begin message_id := nullif(response.content::jsonb->>'id',''); exception when others then message_id := null; end;
        update public.feedback_email_deliveries set
          state=case when message_id is not null then 'accepted' else 'needs_attention' end,
          accepted_at=case when message_id is not null then now() else null end,
          provider_message_id=message_id,
          last_error=case when message_id is null then 'Provider accepted the request but its response needs review. Do not resend without checking.' else null end
        where feedback_id=delivery.feedback_id;
      elsif response.status_code in (400,401,403,404,409,422) then
        update public.feedback_email_deliveries set state='needs_attention',
          last_error='Email provider returned HTTP ' || response.status_code || '. Check sending credentials, domain and provider logs.'
        where feedback_id=delivery.feedback_id;
      else
        update public.feedback_email_deliveries set
          state=case when attempts >= 8 or first_attempt_at < now()-interval '23 hours' then 'needs_attention' else 'pending' end,
          next_attempt_at=now()+make_interval(mins=>least(60,power(2,attempts)::integer)),
          last_error='Email delivery attempt failed or timed out; the original feedback remains saved.'
        where feedback_id=delivery.feedback_id;
      end if;
    elsif delivery.last_attempt_at < now()-interval '10 minutes' then
      update public.feedback_email_deliveries set
        state=case when attempts>=8 or first_attempt_at < now()-interval '23 hours' then 'needs_attention' else 'pending' end,
        next_attempt_at=now(),last_error='Email response unavailable; retry uses the same provider idempotency key.'
      where feedback_id=delivery.feedback_id;
    end if;
  end loop;

  select decrypted_secret into api_key from vault.decrypted_secrets where name='histreets_feedback_resend_api_key' limit 1;
  select decrypted_secret into sender from vault.decrypted_secrets where name='histreets_feedback_from_email' limit 1;
  if coalesce(api_key,'')='' or coalesce(sender,'')='' then
    return jsonb_build_object('status','configuration_required','recipient','ahaque@atomicmail.io');
  end if;
  if sender !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    return jsonb_build_object('status','sender_configuration_invalid');
  end if;

  update public.feedback_email_deliveries set state='needs_attention',last_error='Retry window expired. Check provider history before resending.'
  where state='pending' and first_attempt_at < now()-interval '23 hours';
  select * into delivery from public.feedback_email_deliveries
    where state='pending' and next_attempt_at<=now() order by next_attempt_at for update skip locked limit 1;
  if not found then return jsonb_build_object('status','idle'); end if;
  select * into feedback from public.user_feedback where id=delivery.feedback_id;

  body:=coalesce(delivery.payload,jsonb_build_object(
    'from','HiStreets <'||sender||'>','to',jsonb_build_array('ahaque@atomicmail.io'),
    'reply_to',feedback.email,'subject','New HiStreets user feedback',
    'text',concat_ws(E'\n',
      'New feedback submitted through HiStreets',
      'Name: '||feedback.name,'Email supplied: '||feedback.email,
      'Organisation: '||coalesce(nullif(feedback.organisation,''),'Not provided'),
      'Role: '||coalesce(nullif(feedback.role,''),'Not provided'),
      'Started using HiStreets: '||coalesce(feedback.started_on::text,'Not provided'),
      'Features used: '||coalesce(nullif(array_to_string(feedback.features_used,', '),''),'None selected'),
      '', 'Experience:',feedback.experience,'','Suggested improvements:',coalesce(nullif(feedback.improvements,''),'Not provided'),
      '', 'Future plans:',coalesce(nullif(feedback.planned_use,''),'Not provided'),'',
      'Permission to quote with name and organisation: '||case when feedback.quote_consent then 'Yes' else 'No' end,
      'Submitted at: '||to_char(feedback.created_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS')||' UTC',
      'Reference: '||feedback.id,'',
      'This is a platform notification. The respondent supplied the details above; their email and usage date are not independently verified.',
      'The original response is saved privately in Founder dashboard > User feedback.',
      'https://app.histreets.uk/business'
    )
  ));
  request_id:=net.http_post(
    url:='https://api.resend.com/emails',body:=body,
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||api_key,
      'Idempotency-Key','histreets-feedback/'||delivery.feedback_id),timeout_milliseconds:=15000);
  update public.feedback_email_deliveries set state='sending',attempts=attempts+1,
    first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now(),http_request_id=request_id,
    payload=body,last_error=null where feedback_id=delivery.feedback_id;
  return jsonb_build_object('status','dispatched','count',1);
end $$;
revoke all on function feedback_private.process_emails() from public, anon, authenticated;

-- No email leaves the database until the two Vault settings above are supplied.
-- One queued message per minute keeps this low-volume feedback flow below provider burst limits.
select cron.schedule('histreets-feedback-email','* * * * *','select feedback_private.process_emails();');
