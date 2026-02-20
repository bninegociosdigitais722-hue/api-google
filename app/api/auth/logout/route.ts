import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { requireEnv } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
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

  await supabase.auth.signOut()
  return response
}
