import { headers } from 'next/headers'
import AtendimentoClient, { Conversa, Message } from './AtendimentoClient'
import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { resolveOwnerId, TenantResolutionError } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getAtendimentoSummary } from '@/lib/summary'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Atendimento | Radar Local',
}

export const revalidate = 0

export default async function AtendimentoPage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const perf = createServerPerf('atendimento.page', {
    requestId: resolveRequestId(headersList),
    path: '/atendimento',
    host,
  })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  perf.mark('session')
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  let ownerId = ''
  try {
    ownerId = await resolveOwnerId({
      host,
      userId: user?.id ?? null,
      userOwnerId: ownerIdFromUser ?? null,
      supabase: supabaseServer,
    })
  } catch (err) {
    if (err instanceof TenantResolutionError) {
      redirect('/403')
    }
    throw err
  }
  perf.mark('resolveOwner')

  const db = user ? supabaseServer : supabaseAdmin

  let conversas: Conversa[] = []
  let messagesByPhone: Record<string, Message[]> = {}

  try {
    const summary = await getAtendimentoSummary({ ownerId, db })
    perf.mark('queries')

    conversas = summary.contacts.map((c: any) => ({
      id: c.id,
      phone: c.phone,
      name: c.name ?? null,
      is_whatsapp: c.is_whatsapp ?? null,
      last_message_at: c.last_message_at ?? null,
      photo_url: c.photo_url ?? null,
      about: c.about ?? null,
      notify: c.notify ?? null,
      short: c.short ?? null,
      vname: c.vname ?? null,
      presence_status: c.presence_status ?? null,
      presence_updated_at: c.presence_updated_at ?? null,
      chat_unread: c.chat_unread ?? null,
      last_message: c.last_message_body
        ? {
            body: c.last_message_body,
            direction: c.last_message_direction as 'in' | 'out',
            created_at: c.last_message_created_at,
          }
        : null,
    }))

    messagesByPhone = summary.messagesByPhone as Record<string, Message[]>
    perf.mark('render')
    perf.done()
  } catch (err) {
    console.error('atendimento server fetch error', err)
  }

  return (
    <AtendimentoClient
      initialConversas={conversas}
      initialMessagesByPhone={messagesByPhone}
    />
  )
}
