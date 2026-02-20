import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { requireEnv } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = (await req.json().catch(() => ({}))) as {
    accessToken?: string
    refreshToken?: string
  }

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ message: 'Tokens ausentes.' }, { status: 400 })
  }

  const url = requireEnv('SUPABASE_URL')
  const anonKey = requireEnv('SUPABASE_ANON_KEY')
  const response = NextResponse.json({ ok: true })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error || !data.session) {
    return NextResponse.json({ message: 'Sessão inválida.' }, { status: 401 })
  }

  return response
}
