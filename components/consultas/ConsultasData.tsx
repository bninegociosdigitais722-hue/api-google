import ConsultasClient from '@/app/(shell)/(admin)/admin/consultas/ConsultasClient'
import { headers } from 'next/headers'

import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { resolveOwnerId } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

type ConsultasDataProps = {
  apiPrefix: string
  perfLabel: string
  path: string
}

export default async function ConsultasData({ apiPrefix, perfLabel, path }: ConsultasDataProps) {
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

  const { data: results, error } = await db
    .from('contacts')
    .select('id, name, phone, is_whatsapp, last_outbound_template', {})
    .eq('owner_id', ownerId)
    .order('last_message_at', { ascending: false })
    .limit(100)
  perf.mark('queries')

  const contatos = results ?? []
  const hasError = error

  const sentMap = Object.fromEntries(
    contatos
      .filter((c) => c.phone)
      .map((c) => [
        String(c.phone),
        {
          template: (c as any).last_outbound_template as string | null,
          lastOutboundAt: null,
        },
      ])
  )
  perf.mark('render')
  perf.done()

  return (
    <ConsultasClient
      initialResults={contatos.map((c) => ({
        id: String(c.id),
        nome: c.name ?? 'Contato',
        endereco: 'Endereço não informado',
        telefone: c.phone,
        nota: null,
        mapsUrl: '#',
        fotoUrl: null,
        temWhatsapp: c.is_whatsapp ?? undefined,
        lastOutboundTemplate: (c as any).last_outbound_template ?? null,
      }))}
      sentMap={sentMap}
      total={null}
      error={hasError?.message}
      apiPrefix={apiPrefix}
    />
  )
}
