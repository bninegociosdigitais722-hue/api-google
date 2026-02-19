import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireEnv } from '@/lib/env'

export const runtime = 'nodejs'

const cookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  ...(typeof maxAge === 'number' ? { maxAge } : {}),
})

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken, expiresAt } = (await req.json().catch(() => ({}))) as {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number | null
  }

  if (!accessToken) {
    return NextResponse.json({ message: 'Token ausente.' }, { status: 400 })
  }

  const url = requireEnv('SUPABASE_URL')
  const anonKey = requireEnv('SUPABASE_ANON_KEY')
  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) {
    return NextResponse.json({ message: 'Sessão inválida.' }, { status: 401 })
  }

  const now = Math.floor(Date.now() / 1000)
  const maxAge = expiresAt && expiresAt > now ? Math.max(expiresAt - now, 60) : 60 * 60

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sb-access-token', accessToken, cookieOptions(maxAge))
  if (refreshToken) {
    response.cookies.set('sb-refresh-token', refreshToken, cookieOptions(60 * 60 * 24 * 7))
  }
  return response
}

