-- Keep provenance and never redispatch an attempted message during a provider switch.
alter table public.feedback_email_deliveries add column provider text not null default 'resend'
  check (provider in ('resend','cloudflare'));
alter table public.feedback_email_deliveries alter column provider set default 'cloudflare';
update public.feedback_email_deliveries set provider='cloudflare',payload=null
where state='pending' and attempts=0;
update public.feedback_email_deliveries set state='needs_attention',
  last_error='Previous provider attempt requires review before resending.'
where provider='resend' and state in ('pending','sending');

create or replace function feedback_private.process_emails() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  delivery record;
  response record;
  feedback public.user_feedback%rowtype;
  api_key text;
  account_id text;
  sender text;
  request_id bigint;
  result_body jsonb;
  accepted boolean;
  body jsonb;
  escaped_text text;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('histreets-feedback-email',0)) then
    return jsonb_build_object('status','busy');
  end if;
  for delivery in select * from public.feedback_email_deliveries
    where state='sending' and provider='cloudflare' for update loop
    select * into response from net._http_response where id=delivery.http_request_id;
    if found then
      if response.status_code between 200 and 299 then
        begin result_body:=response.content::jsonb;
        exception when others then result_body:=null; end;
        accepted:=coalesce(result_body->'success'='true'::jsonb and (
          (jsonb_typeof(result_body#>'{result,delivered}')='array' and
            (result_body#>'{result,delivered}') @> '["ahaque@atomicmail.io"]'::jsonb) or
          (jsonb_typeof(result_body#>'{result,queued}')='array' and
            (result_body#>'{result,queued}') @> '["ahaque@atomicmail.io"]'::jsonb)
        ),false) and
          coalesce(result_body#>'{result,permanent_bounces}','[]'::jsonb)='[]'::jsonb and
          coalesce(result_body#>'{result,suppressed_recipients}','[]'::jsonb)='[]'::jsonb;
        update public.feedback_email_deliveries set
          state=case when accepted then 'accepted' else 'needs_attention' end,
          accepted_at=case when accepted then now() else null end,
          provider_message_id=case when accepted then nullif(result_body#>>'{result,message_id}','') else null end,
          last_error=case when accepted then null else 'Provider response requires review. Check delivery history before resending.' end
        where feedback_id=delivery.feedback_id;
      elsif response.status_code=429 then
        -- A definite rate-limit rejection can be retried. Ambiguous failures cannot.
        update public.feedback_email_deliveries set
          state=case when attempts>=8 or first_attempt_at<now()-interval '23 hours' then 'needs_attention' else 'pending' end,
          next_attempt_at=now()+make_interval(mins=>least(60,power(2,least(attempts,8))::integer)),
          last_error='Provider rate limit reached; feedback remains saved.'
        where feedback_id=delivery.feedback_id;
      else
        update public.feedback_email_deliveries set state='needs_attention',
          last_error='Email request failed (HTTP '||coalesce(response.status_code::text,'unavailable')||'). Check provider history before resending.'
        where feedback_id=delivery.feedback_id;
      end if;
    elsif delivery.last_attempt_at<now()-interval '10 minutes' then
      update public.feedback_email_deliveries set state='needs_attention',
        last_error='Email response unavailable. Check provider history before resending to avoid duplicates.'
      where feedback_id=delivery.feedback_id;
    end if;
  end loop;

  select decrypted_secret into api_key from vault.decrypted_secrets where name='histreets_feedback_cloudflare_api_token' limit 1;
  select decrypted_secret into account_id from vault.decrypted_secrets where name='histreets_feedback_cloudflare_account_id' limit 1;
  select decrypted_secret into sender from vault.decrypted_secrets where name='histreets_feedback_from_email' limit 1;
  if coalesce(api_key,'')='' or coalesce(account_id,'')='' or coalesce(sender,'')='' then
    return jsonb_build_object('status','configuration_required','recipient','ahaque@atomicmail.io');
  end if;
  if account_id !~ '^[a-f0-9]{32}$' then
    return jsonb_build_object('status','account_configuration_invalid');
  end if;
  if sender !~ '^[A-Za-z0-9._%+-]+@histreets\.uk$' then
    return jsonb_build_object('status','sender_configuration_invalid');
  end if;

  update public.feedback_email_deliveries set state='needs_attention',last_error='Retry limit reached. Check provider history before resending.'
  where provider='cloudflare' and state='pending' and (attempts>=8 or first_attempt_at<now()-interval '23 hours');
  select * into delivery from public.feedback_email_deliveries
    where provider='cloudflare' and state='pending' and next_attempt_at<=now()
    order by next_attempt_at for update skip locked limit 1;
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
  if delivery.payload is null then
    -- All submitted text stays in an escaped text node, never in HTML attributes.
    escaped_text:=replace(replace(replace(body->>'text','&','&amp;'),'<','&lt;'),'>','&gt;');
    body:=body||jsonb_build_object('html',
      '<!doctype html><html><body style="margin:0;background:#f3f6f5;color:#183b38;font-family:Arial,sans-serif">'||
      '<main style="max-width:640px;margin:24px auto;padding:28px;background:white;border:1px solid #dce7e4;border-radius:12px">'||
      '<h1 style="font-size:24px;margin:0 0 20px;color:#075e59">HiStreets feedback</h1>'||
      '<div style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.65">'||escaped_text||'</div>'||
      '</main></body></html>');
  end if;
  request_id:=net.http_post(
    url:='https://api.cloudflare.com/client/v4/accounts/'||account_id||'/email/sending/send',body:=body,
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||api_key),
    timeout_milliseconds:=15000);
  update public.feedback_email_deliveries set state='sending',attempts=attempts+1,
    first_attempt_at=coalesce(first_attempt_at,now()),last_attempt_at=now(),http_request_id=request_id,
    payload=body,last_error=null where feedback_id=delivery.feedback_id;
  return jsonb_build_object('status','dispatched','count',1);
end $$;
revoke all on function feedback_private.process_emails() from public, anon, authenticated;
