import { headers } from 'next/headers'
import AtendimentoClient, { Conversa, Message } from './AtendimentoClient'
import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { resolveOwnerId } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'

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
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })

  const db = user ? supabaseServer : supabaseAdmin

  let conversas: Conversa[] = []
  let messagesByPhone: Record<string, Message[]> = {}

  try {
    const contactsPromise = db
      .from('contacts')
      .select('id, phone, name, is_whatsapp, last_message_at')
      .eq('owner_id', ownerId)
      .order('last_message_at', { ascending: false })
      .limit(200)

    const messagesPromise = db
      .from('messages')
      .select('contact_id, body, direction, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    const prefetchPromise = (async () => {
      const contactsRes = await contactsPromise
      const first = contactsRes.data?.[0]
      if (!first) return null
      return db
        .from('messages')
        .select('id, contact_id, body, direction, status, created_at, media')
        .eq('contact_id', first.id)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true })
    })()

    const [{ data: contacts }, { data: msgs }, prefetchRes] = await Promise.all([
      contactsPromise,
      messagesPromise,
      prefetchPromise,
    ])
    perf.mark('queries')

    const contactIds = contacts?.map((c) => c.id) ?? []
    let messagesMap = new Map<number, Conversa['last_message']>()

    if (msgs && msgs.length) {
      for (const msg of msgs) {
        if (!messagesMap.has(msg.contact_id)) {
          messagesMap.set(msg.contact_id, {
            body: msg.body,
            direction: msg.direction as 'in' | 'out',
            created_at: msg.created_at,
          })
        }
      }
    }

    conversas =
      contacts?.map((c) => ({
        ...c,
        last_message: messagesMap.get(c.id) ?? null,
      })) ?? []

    // pré-carrega mensagens da conversa mais recente para evitar flash vazio
    const firstPhone = conversas[0]?.phone
    if (firstPhone && prefetchRes?.data) {
      messagesByPhone[firstPhone] = prefetchRes.data as Message[]
    }
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
