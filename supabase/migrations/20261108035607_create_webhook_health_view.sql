create or replace view public.webhook_event_health
with (security_invoker = true)
as
select
  count(*)::integer as total_events,
  count(*) filter (where status = 'completed')::integer as completed_events,
  count(*) filter (where status = 'failed')::integer as failed_events,
  count(*) filter (where status = 'processing')::integer as processing_events,
  count(*) filter (
    where status = 'processing'
      and updated_at < now() - interval '5 minutes'
  )::integer as stale_processing_events,
  coalesce(sum(attempts), 0)::bigint as total_attempts,
  coalesce(max(attempts), 0)::integer as max_attempts,
  max(created_at) as last_event_at,
  max(processed_at) as last_processed_at,
  max(updated_at) filter (where status = 'failed') as last_failure_at,
  min(updated_at) filter (where status = 'processing') as oldest_processing_at,
  case
    when count(*) filter (
      where status = 'processing'
        and updated_at < now() - interval '5 minutes'
    ) > 0 then 'attention'
    when count(*) filter (where status = 'failed') > 0 then 'attention'
    when count(*) = 0 then 'no_events'
    else 'ok'
  end as health_status
from public.webhook_events;

comment on view public.webhook_event_health is
  'Administrative aggregate health metrics for Pluggy webhook processing. Does not expose event IDs or payloads.';

revoke all on table public.webhook_event_health from public, anon, authenticated;
grant select on table public.webhook_event_health to service_role;