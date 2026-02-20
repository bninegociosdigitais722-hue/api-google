import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { requireEnv } from '../env'

const url = requireEnv('SUPABASE_URL')
const anonKey = requireEnv('SUPABASE_ANON_KEY')

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map(({ name, value }) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // setAll can fail in Server Components; ignore and rely on SSR refresh at the edge.
        }
      },
    },
  })
}

export default createSupabaseServerClient
