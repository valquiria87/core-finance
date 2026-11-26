-- Centralized, atomic fixed-window rate limiting for public demo APIs.
create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits (updated_at);

alter table public.api_rate_limits enable row level security;
revoke all on table public.api_rate_limits from PUBLIC, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

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
set search_path = pg_catalog, public
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_bucket_key is null or length(p_bucket_key) < 1 or length(p_bucket_key) > 128 then
    raise exception 'Invalid rate limit bucket key';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid rate limit maximum';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 3600 then
    raise exception 'Invalid rate limit window';
  end if;

  insert into public.api_rate_limits as current_bucket (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_bucket_key,
    v_now,
    1,
    v_now
  )
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when current_bucket.window_started_at + make_interval(secs => p_window_seconds) <= v_now
        then v_now
      else current_bucket.window_started_at
    end,
    request_count = case
      when current_bucket.window_started_at + make_interval(secs => p_window_seconds) <= v_now
        then 1
      else current_bucket.request_count + 1
    end,
    updated_at = v_now
  returning current_bucket.window_started_at, current_bucket.request_count
  into v_window_started_at, v_request_count;

  -- Opportunistic cleanup keeps old, inactive IP hashes from accumulating forever.
  if random() < 0.01 then
    delete from public.api_rate_limits
    where updated_at < v_now - interval '24 hours';
  end if;

  return query
  select
    v_request_count <= p_limit,
    greatest(p_limit - v_request_count, 0),
    v_window_started_at + make_interval(secs => p_window_seconds);
end;
$function$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from PUBLIC, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;
