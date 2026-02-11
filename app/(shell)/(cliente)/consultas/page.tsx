import ConsultasClient from '../../(admin)/admin/consultas/ConsultasClient'
import { headers } from 'next/headers'
import { resolveOwnerId } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

export const metadata = {
  title: 'Consultas | Radar Local',
}

export default async function ConsultasPage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null

  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const { data: results, error, count } = await db
    .from('contacts')
    .select('id, name, phone, is_whatsapp, last_message_at, last_outbound_template, last_outbound_at', {
      count: 'exact',
    })
    .eq('owner_id', ownerId)
    .order('last_message_at', { ascending: false })
    .limit(200)

  const contatos = results ?? []
  const hasError = error

  const sentMap = Object.fromEntries(
    contatos
      .filter((c) => c.phone)
      .map((c) => [
        String(c.phone),
        {
          template: (c as any).last_outbound_template as string | null,
          lastOutboundAt: (c as any).last_outbound_at as string | null,
        },
      ])
  )

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
      total={typeof count === 'number' ? count : null}
      error={hasError?.message}
      apiPrefix="/api"
    />
  )
}
