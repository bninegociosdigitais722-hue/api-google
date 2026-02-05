import { createClient } from '@supabase/supabase-js'
import { cookies, headers } from 'next/headers'
import { requireEnv } from '../env'

const url = requireEnv('SUPABASE_URL')
const anonKey = requireEnv('SUPABASE_ANON_KEY')

export const createSupabaseServerClient = () => {
  const cookieStore = cookies()
  const headerStore = headers()
  const bearer =
    cookieStore.get('sb-access-token')?.value ||
    headerStore.get('authorization')?.replace(/Bearer\\s+/i, '') ||
    null

  return createClient(url, anonKey, {
    global: bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : {},
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export default createSupabaseServerClient
