import { NextRequest, NextResponse } from 'next/server'
import { findHostRule, pathAllowedForHost } from './lib/tenant'

export const runtime = 'nodejs'

export function middleware(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const rule = findHostRule(host)
  const pathname = req.nextUrl.pathname
  const isApi = pathname.startsWith('/api')

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
