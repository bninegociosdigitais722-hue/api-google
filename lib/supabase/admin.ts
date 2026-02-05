import { createClient } from '@supabase/supabase-js'
import { requireEnv } from '../env'

const url = requireEnv('SUPABASE_URL')
const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

export default supabaseAdmin
