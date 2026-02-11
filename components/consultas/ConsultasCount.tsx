import { headers } from 'next/headers'

import { Badge } from '@/components/ui/badge'
import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { resolveOwnerId } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

type ConsultasCountProps = {
  perfLabel: string
  path: string
}

export default async function ConsultasCount({ perfLabel, path }: ConsultasCountProps) {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const perf = createServerPerf(perfLabel, {
    requestId: resolveRequestId(headersList),
    path,
    host,
  })
  perf.mark('start')

  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  perf.mark('session')
  const user = sessionData.session?.user ?? null

  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const { count } = await db
    .from('contacts')
    .select('id', { count: 'estimated', head: true })
    .eq('owner_id', ownerId)
  perf.mark('queries')
  perf.mark('render')
  perf.done()

  if (typeof count !== 'number') {
    return <Badge variant="secondary">—</Badge>
  }

  return <Badge variant="secondary">{count} resultados</Badge>
}
