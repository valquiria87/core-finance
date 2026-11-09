import { getSupabaseAdmin } from './supabase-admin'
import {
  createRateLimitBucketKey,
  getRateLimitSecret,
  resolveClientIdentity,
} from './api-rate-limit-utils'

type RateLimitRow = {
  allowed: boolean
  remaining: number
  reset_at: string
}

type RateLimitError = Error & { code?: string }

export async function enforceApiRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<Response | null> {
  try {
    const secret = getRateLimitSecret(
      process.env.API_RATE_LIMIT_HMAC_SECRET,
    )
    const identity = resolveClientIdentity(
      request,
      process.env.VERCEL === '1',
    )

    if (identity.untrustedRuntime) {
      console.warn('Rate limiter is running outside Vercel; request IP headers ignored')
    }
    if (identity.missingIp) {
      console.warn('Vercel request did not include a valid client IP header')
    }

    const effectiveLimit = identity.missingIp
      ? Math.min(limit * 10, 1000)
      : limit
    const bucketKey = createRateLimitBucketKey(
      scope,
      identity.value,
      secret,
    )

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('consume_api_rate_limit', {
      p_bucket_key: bucketKey,
      p_limit: effectiveLimit,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      const rpcError = new Error('Rate limit RPC failed') as RateLimitError
      rpcError.code = error.code || 'RATE_LIMIT_RPC_ERROR'
      throw rpcError
    }

    const result = (data as RateLimitRow[] | null)?.[0]
    if (!result) {
      const emptyResultError = new Error('Rate limiter returned no decision') as RateLimitError
      emptyResultError.code = 'RATE_LIMIT_EMPTY_RESULT'
      throw emptyResultError
    }

    if (result.allowed) return null

    const resetAt = new Date(result.reset_at)
    const retryAfter = Math.max(
      1,
      Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    )

    return Response.json(
      { error: 'Muitas requisições. Aguarde um instante e tente novamente.' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(effectiveLimit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt.getTime() / 1000)),
        },
      },
    )
  } catch (error) {
    const rateLimitError = error as RateLimitError
    console.error('API rate limiter unavailable:', {
      code: rateLimitError.code || 'RATE_LIMIT_UNEXPECTED_ERROR',
      message: rateLimitError.message,
    })
    return Response.json(
      { error: 'Serviço temporariamente indisponível. Tente novamente.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
