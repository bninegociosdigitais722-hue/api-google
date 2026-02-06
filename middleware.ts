import { NextRequest, NextResponse } from 'next/server'
import { findHostRule, pathAllowedForHost } from './lib/tenant'

export const runtime = 'nodejs'

export function middleware(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const rule = findHostRule(host)
  const pathname = req.nextUrl.pathname
  const isApi = pathname.startsWith('/api')

  // Redireciona raiz para prefixo padrão conforme host (ex.: admin → /admin/dashboard; atendimento → /atendimento)
  if (rule && pathname === '/') {
    const hasAdmin = rule.prefixes.includes('/admin')
    const hasAtendimento = rule.prefixes.includes('/atendimento')
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
