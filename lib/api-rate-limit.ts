import { createHmac } from 'node:crypto'
import { getSupabaseAdmin } from './supabase-admin'

type RateLimitRow = {
  allowed: boolean
  remaining: number
  reset_at: string
}

export async function enforceApiRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<Response | null> {
  try {
    const secret = process.env.SUPABASE_SECRET_KEY
    if (!secret) {
      throw new Error('Rate limiter secret is not configured')
    }

    // Vercel overwrites x-real-ip with the client IP at its edge.
    // Never trust a caller-provided X-Forwarded-For value as the primary identity.
    const clientIp = request.headers.get('x-real-ip')?.trim() || 'unknown'
    const clientHash = createHmac('sha256', secret)
      .update(clientIp)
      .digest('hex')
    const bucketKey = `${scope}:${clientHash}`

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('consume_api_rate_limit', {
      p_bucket_key: bucketKey,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      throw new Error(`Rate limit storage failed: ${error.message}`)
    }

    const result = (data as RateLimitRow[] | null)?.[0]
    if (!result) {
      throw new Error('Rate limiter returned no decision')
    }

    if (result.allowed) {
      return null
    }

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
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt.getTime() / 1000)),
        },
      },
    )
  } catch (error) {
    console.error('API rate limiter unavailable:', error)
    return Response.json(
      { error: 'Serviço temporariamente indisponível. Tente novamente.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
