// Simple rate limiting helper with optional Upstash REST.
// If UPSTASH_REDIS_REST_URL/TOKEN are set, uses Redis; otherwise falls back to in-memory.

const windowMsDefault = 60_000

const memoryBuckets = new Map<
  string,
  {
    window: number
    count: number
  }
>()

type RateLimitResult = { limited: boolean; remaining: number }

const useUpstash = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

export async function rateLimit(opts: { key: string; limit: number; windowMs?: number }): Promise<RateLimitResult> {
  const windowMs = opts.windowMs ?? windowMsDefault

  if (useUpstash()) {
    const url = `${process.env.UPSTASH_REDIS_REST_URL}/pipeline`
    const headers = {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    }
    const nowWindow = Math.floor(Date.now() / windowMs)
    const redisKey = `rl:${opts.key}:${nowWindow}`
    const body = JSON.stringify([['INCR', redisKey], ['EXPIRE', redisKey, String(windowMs / 1000 + 1)]])
    const resp = await fetch(url, { method: 'POST', headers, body })
    if (!resp.ok) {
      // fail-open to avoid blocking traffic if Redis is down
      return { limited: false, remaining: opts.limit }
    }
    const data = (await resp.json()) as [number, 'OK'][]
    const current = Number(data?.[0]?.[0] ?? 0)
    return { limited: current > opts.limit, remaining: Math.max(opts.limit - current, 0) }
  }

  const window = Math.floor(Date.now() / windowMs)
  const bucket = memoryBuckets.get(opts.key)
  if (!bucket || bucket.window !== window) {
    memoryBuckets.set(opts.key, { window, count: 1 })
    return { limited: false, remaining: opts.limit - 1 }
  }
  bucket.count += 1
  const limited = bucket.count > opts.limit
  const remaining = Math.max(opts.limit - bucket.count, 0)
  return { limited, remaining }
}

