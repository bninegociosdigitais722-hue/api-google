import { NextRequest, NextResponse } from 'next/server'
import { findHostRule, pathAllowedForHost } from './lib/tenant'
import { logWarn } from './lib/logger'
import { rateLimit } from './lib/rate-limit'

export default async function proxy(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const rule = findHostRule(host)
  const pathname = req.nextUrl.pathname
  const isApi = pathname.startsWith('/api')

  if (isApi) {
    const ip =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'
    const key = `${host ?? 'unknown'}:${ip}:${pathname.split('/').slice(0, 3).join('/')}`
    const { limited } = await rateLimit({ key, limit: 120, windowMs: 60_000 })
    if (limited) {
      logWarn('rate_limit_exceeded', { path: pathname, host, ip })
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 })
    }
  }

  // Redireciona raiz para prefixo padrão conforme host (ex.: admin → /admin/dashboard; app → /dashboard)
  if (rule && pathname === '/') {
    const hasAdmin = rule.prefixes.includes('/admin')
    const hasDashboard = rule.prefixes.includes('/dashboard')
    const hasAtendimento = rule.prefixes.includes('/atendimento')
    const hasApp = rule.prefixes.includes('/app')
    if (hasAdmin) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
    if (hasDashboard) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
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
