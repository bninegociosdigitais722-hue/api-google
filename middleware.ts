import { NextRequest, NextResponse } from 'next/server'
import { findHostRule, pathAllowedForHost } from './lib/tenant'
import { logWarn } from './lib/logger'

export const runtime = 'nodejs'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60
type RateBucket = { bucket: number; count: number }
const rateLimitStore = new Map<string, RateBucket>() // key -> bucket data

const rateLimited = (ip: string) => {
  const bucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS)
  const key = ip
  const current = rateLimitStore.get(key)

  if (!current || current.bucket !== bucket) {
    rateLimitStore.set(key, { bucket, count: 1 })
    return false
  }

  const nextCount = current.count + 1
  rateLimitStore.set(key, { bucket, count: nextCount })
  return nextCount > RATE_LIMIT_MAX
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const rule = findHostRule(host)
  const pathname = req.nextUrl.pathname
  const isApi = pathname.startsWith('/api')

  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'

  if (isApi && rateLimited(ip)) {
    logWarn('rate_limit_exceeded', { path: pathname, host, ip })
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
  }

  // Redireciona raiz para prefixo padrão conforme host (ex.: admin → /admin/dashboard; atendimento → /atendimento)
  if (rule && pathname === '/') {
    const hasAdmin = rule.prefixes.includes('/admin')
    const hasAtendimento = rule.prefixes.includes('/atendimento')
    const hasApp = rule.prefixes.includes('/app')
    if (hasAdmin) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
    if (hasAtendimento) {
      const url = req.nextUrl.clone()
      url.pathname = '/atendimento'
      return NextResponse.redirect(url)
    }
    if (hasApp) {
      const url = req.nextUrl.clone()
      url.pathname = '/app'
      return NextResponse.redirect(url)
    }
  }

  if (!rule || !pathAllowedForHost(pathname, rule)) {
    if (isApi) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/404'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
