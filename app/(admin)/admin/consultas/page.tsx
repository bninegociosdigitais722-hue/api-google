import ConsultasClient from './ConsultasClient'
import { headers } from 'next/headers'
import { resolveOwnerId } from '../../../../lib/tenant'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Consultas | Radar Local',
}

export default async function ConsultasPage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  if (!user) redirect('/login')

  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })

  const [{ data: results, error }, { data: countData, error: countError }] = await Promise.all([
    supabaseServer
      .from('contacts')
      .select('id, name, phone, is_whatsapp, last_message_at, address', { count: 'exact' })
      .eq('owner_id', ownerId)
      .order('last_message_at', { ascending: false })
      .limit(50),
    supabaseServer.from('contacts').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId),
  ])

  const contatos = results ?? []
  const total = countData?.length ?? countData?.[0] ?? countData ?? null // count vem via header; fallback defensivo
  const hasError = error || countError

  return <ConsultasClient initialResults={contatos} total={typeof total === 'number' ? total : null} error={hasError?.message} />
}
