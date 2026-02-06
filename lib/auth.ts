import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase/server'
import { resolveOwnerId } from './tenant'

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  ownerId: string
  user: any | null
  role: string | null
}

export async function getAuthContext(opts?: { allowUnauthenticated?: boolean }) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const session = data.session
  const user = session?.user ?? null
  const ownerFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const role = ((user?.app_metadata as any)?.role as string | undefined) ?? null

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerFromUser })

  if (!session && !opts?.allowUnauthenticated) {
    redirect('/login')
  }

  return { supabase, ownerId, user, role }
}
