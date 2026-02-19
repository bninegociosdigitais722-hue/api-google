import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase/server'
import { resolveTenant, TenantResolutionError } from './tenant'

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
  ownerId: string
  user: any | null
  role: string | null
}

export async function getAuthContext(opts?: { allowUnauthenticated?: boolean }) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const user = data.user ?? null
  const ownerFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const roleFromUser = ((user?.app_metadata as any)?.role as string | undefined) ?? null

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  let ownerId = ''
  let role: string | null = roleFromUser
  try {
    const resolved = await resolveTenant({
      host,
      userId: user?.id ?? null,
      userOwnerId: ownerFromUser ?? null,
      supabase,
      allowUnauthenticated: opts?.allowUnauthenticated,
    })
    ownerId = resolved.ownerId
    role = resolved.role ?? roleFromUser
  } catch (err) {
    if (err instanceof TenantResolutionError) {
      redirect('/403')
    }
    throw err
  }

  if (!user && !opts?.allowUnauthenticated) {
    redirect('/login')
  }

  return { supabase, ownerId, user, role }
}
