-- Harden the already-deployed rate-limit RPC without rewriting its applied migration.
-- pg_cron is required for predictable daily cleanup in Supabase.
create extension if not exists pg_cron;

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_bucket_key is null
    or pg_catalog.length(p_bucket_key) < 1
    or pg_catalog.length(p_bucket_key) > 128
  then
    raise exception 'Invalid rate limit bucket key';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid rate limit maximum';
  end if;

  if p_window_seconds is null
    or p_window_seconds < 1
    or p_window_seconds > 3600
  then
    raise exception 'Invalid rate limit window';
  end if;

  insert into public.api_rate_limits as current_bucket (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_bucket_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when current_bucket.window_started_at
        + pg_catalog.make_interval(secs => p_window_seconds) <= v_now
      then v_now
      else current_bucket.window_started_at
    end,
    request_count = case
      when current_bucket.window_started_at
        + pg_catalog.make_interval(secs => p_window_seconds) <= v_now
      then 1
      else current_bucket.request_count + 1
    end,
    updated_at = v_now
  returning current_bucket.window_started_at, current_bucket.request_count
  into v_window_started_at, v_request_count;

  -- Opportunistic cleanup remains as a secondary safeguard.
  if pg_catalog.random() < 0.01 then
    delete from public.api_rate_limits
    where updated_at < pg_catalog.now() - interval '24 hours';
  end if;

  return query
  select
    v_request_count <= p_limit,
    greatest(p_limit - v_request_count, 0),
    v_window_started_at
      + pg_catalog.make_interval(secs => p_window_seconds);
end;
$function$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

-- Keep exactly one named daily cleanup job; pg_cron updates a job by name.
select cron.schedule(
  'cleanup-api-rate-limits',
  '17 3 * * *',
  $job$
    delete from public.api_rate_limits
    where updated_at < pg_catalog.now() - interval '24 hours';
  $job$
);
