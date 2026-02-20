import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import AtendimentoClient, { Conversa, Message } from '@/app/(shell)/(atendimento)/atendimento/AtendimentoClient'
import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { resolveOwnerId, TenantResolutionError } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getAtendimentoSummary } from '@/lib/summary'

export default async function AtendimentoData() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const perf = createServerPerf('atendimento.page', {
    requestId: resolveRequestId(headersList),
    path: '/atendimento',
    host,
  })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabaseServer.auth.getUser()
  perf.mark('session')
  const user = userError ? null : userData.user ?? null
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
    const summary = await getAtendimentoSummary({
      ownerId,
      db,
      contactsLimit: 20,
      messagesLimit: 20,
    })
    perf.mark('queries')

    conversas = summary.contacts.map((c: any) => ({
      id: c.id,
      phone: c.phone,
      name: c.name ?? null,
      is_whatsapp: c.is_whatsapp ?? null,
      last_message_at: c.last_message_at ?? null,
      photo_url: c.photo_url ?? null,
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
