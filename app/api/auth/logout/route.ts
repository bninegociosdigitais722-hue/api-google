import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const clearCookie = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 0,
})

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('sb-access-token', '', clearCookie())
  response.cookies.set('sb-refresh-token', '', clearCookie())
  return response
}

