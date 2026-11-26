-- Keep the internal event-trigger function unavailable through the public Data API.
-- The existing ensure_rls event trigger continues to invoke it as its owner.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
