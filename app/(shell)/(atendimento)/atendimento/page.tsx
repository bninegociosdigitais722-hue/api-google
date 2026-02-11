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
    const contactsRes = await db
      .from('contacts')
      .select('id, phone, name, is_whatsapp, last_message_at')
      .eq('owner_id', ownerId)
      .order('last_message_at', { ascending: false })
      .limit(100)

    const contacts = contactsRes.data ?? []
    const contactIds = contacts.map((c) => c.id)
    const firstContact = contacts[0]

    const lastMessagesPromise = contactIds.length
      ? db
          .from('last_messages_by_contact')
          .select('contact_id, body, direction, created_at, status')
          .eq('owner_id', ownerId)
          .in('contact_id', contactIds)
      : Promise.resolve({ data: [] })

    const prefetchPromise = firstContact
      ? db
          .from('messages')
          .select('id, contact_id, body, direction, status, created_at, media')
          .eq('contact_id', firstContact.id)
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: true })
          .limit(100)
      : Promise.resolve(null)

    const [{ data: lastMessages }, prefetchRes] = await Promise.all([
      lastMessagesPromise,
      prefetchPromise,
    ])
    perf.mark('queries')

    const messagesMap = new Map<number, Conversa['last_message']>()
    if (lastMessages) {
      for (const msg of lastMessages) {
        if (!msg.body || !String(msg.body).trim()) continue
        messagesMap.set(msg.contact_id, {
          body: msg.body,
          direction: msg.direction as 'in' | 'out',
          created_at: msg.created_at,
        })
      }
    }

    conversas = contacts.map((c) => ({
      ...c,
      last_message: messagesMap.get(c.id) ?? null,
    }))

    const firstPhone = firstContact?.phone
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
