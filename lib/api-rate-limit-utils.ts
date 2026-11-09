import { createHmac, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'

export type ClientIdentity = {
  value: string
  missingIp: boolean
  untrustedRuntime: boolean
}

export function getRateLimitSecret(
  value: string | undefined,
): string {
  if (!value) {
    const error = new Error('API_RATE_LIMIT_HMAC_SECRET is not configured')
    Object.assign(error, { code: 'API_RATE_LIMIT_HMAC_SECRET_MISSING' })
    throw error
  }

  if (Buffer.byteLength(value, 'utf8') < 32) {
    const error = new Error(
      'API_RATE_LIMIT_HMAC_SECRET must contain at least 32 bytes',
    )
    Object.assign(error, { code: 'API_RATE_LIMIT_HMAC_SECRET_TOO_SHORT' })
    throw error
  }

  return value
}

function expandIpv6(address: string): string[] | null {
  const value = address.toLowerCase().split('%')[0]
  const halves = value.split('::')
  if (halves.length > 2) return null

  const parseSide = (side: string): string[] => {
    if (!side) return []
    const parts = side.split(':')
    const last = parts[parts.length - 1]

    if (last.includes('.')) {
      const octets = last.split('.').map(Number)
      if (
        octets.length !== 4 ||
        octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
      ) return []
      parts.splice(
        parts.length - 1,
        1,
        ((octets[0] << 8) | octets[1]).toString(16),
        ((octets[2] << 8) | octets[3]).toString(16),
      )
    }

    if (parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return []
    return parts
  }

  const left = parseSide(halves[0])
  const right = parseSide(halves[1] ?? '')
  if (left.length + right.length > 8) return null

  const zeros = halves.length === 2 ? 8 - left.length - right.length : 0
  const parts = [...left, ...Array(zeros).fill('0'), ...right]
  if (parts.length !== 8) return null
  return parts
}

export function normalizeClientIp(value: string): string | null {
  const candidate = value.trim().replace(/^\[|\]$/g, '')
  const version = isIP(candidate)
  if (version === 4) return candidate
  if (version !== 6) return null

  const parts = expandIpv6(candidate)
  if (!parts) return null
  return `${parts.slice(0, 4).join(':')}::/64`
}

export function resolveClientIdentity(
  request: Request,
  isVercel: boolean,
  createId: () => string = randomUUID,
): ClientIdentity {
  if (!isVercel) {
    return {
      value: `local:${createId()}`,
      missingIp: false,
      untrustedRuntime: true,
    }
  }

  const realIp = request.headers.get('x-real-ip')
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]
  const normalized = [realIp, forwardedIp]
    .map((candidate) => candidate?.trim() || '')
    .map((candidate) => candidate ? normalizeClientIp(candidate) : null)
    .find((candidate): candidate is string => candidate !== null)

  if (normalized) {
    return { value: normalized, missingIp: false, untrustedRuntime: false }
  }

  return {
    value: 'vercel:missing-ip',
    missingIp: true,
    untrustedRuntime: false,
  }
}

export function createRateLimitBucketKey(
  scope: string,
  identity: string,
  secret: string,
): string {
  return `${scope}:${createHmac('sha256', secret)
    .update(`${scope}:${identity}`)
    .digest('hex')}`
}
