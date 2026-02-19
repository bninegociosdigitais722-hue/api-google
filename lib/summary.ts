import type { SupabaseClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

import { createSupabaseServerClient } from './supabase/server'
import supabaseAdmin from './supabase/admin'
import { resolveOwnerId } from './tenant'
import { createServerPerf } from './perf'

type ConsultasSummary = {
  ownerId: string
  contacts: Array<{
    id: number
    name: string | null
    phone: string | null
    is_whatsapp: boolean | null
    last_outbound_template?: string | null
    photo_url?: string | null
  }>
  count: number | null
}

type PortalConsultasSummary = {
  ownerId: string
  contacts: Array<{
    id: number
    name: string | null
    phone: string | null
    is_whatsapp: boolean | null
    last_message_at: string | null
  }>
  messages: Array<{
    id: number
    contact_id: number
    body: string
    direction: 'in' | 'out'
    status: string | null
    created_at: string
  }>
}

const getConsultasSummaryCached = unstable_cache(
  async (ownerId: string, limit: number): Promise<ConsultasSummary> => {
    const [contactsRes, countRes] = await Promise.all([
      supabaseAdmin
        .from('contacts')
        .select('id, name, phone, is_whatsapp, last_outbound_template, photo_url')
        .eq('owner_id', ownerId)
        .order('last_message_at', { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from('contacts')
        .select('id', { count: 'estimated', head: true })
        .eq('owner_id', ownerId),
    ])

    return {
      ownerId,
      contacts: contactsRes.data ?? [],
      count: typeof countRes.count === 'number' ? countRes.count : null,
    }
  },
  ['consultas-summary'],
  { revalidate: 60 }
)

export const getConsultasSummary = async (
  host: string | null,
  limit: number = 100
): Promise<ConsultasSummary> => {
  const perf = createServerPerf('consultas.summary', { host })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  perf.mark('session')
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = await resolveOwnerId({
    host,
    userId: user?.id ?? null,
    userOwnerId: ownerIdFromUser ?? null,
    supabase: supabaseServer,
  })
  perf.mark('resolveOwner')

  const summary = await getConsultasSummaryCached(ownerId, limit)
  perf.mark('queries')
  perf.mark('render')
  perf.done()
  return summary
}

const getPortalConsultasSummaryCached = unstable_cache(
  async (
    ownerId: string,
    contactsLimit: number,
    messagesLimit: number
  ): Promise<PortalConsultasSummary> => {
    const [contactsRes, messagesRes] = await Promise.all([
      supabaseAdmin
        .from('contacts')
        .select('id, name, phone, is_whatsapp, last_message_at')
        .eq('owner_id', ownerId)
        .order('last_message_at', { ascending: false })
        .limit(contactsLimit),
      supabaseAdmin
        .from('messages')
        .select('id, contact_id, body, direction, status, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(messagesLimit),
    ])

    return {
      ownerId,
      contacts: contactsRes.data ?? [],
      messages: messagesRes.data ?? [],
    }
  },
  ['portal-consultas-summary'],
  { revalidate: 60 }
)

export const getPortalConsultasSummary = async (
  host: string | null,
  contactsLimit: number = 50,
  messagesLimit: number = 30
): Promise<PortalConsultasSummary> => {
  const perf = createServerPerf('portal.consultas.summary', { host })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  perf.mark('session')
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = await resolveOwnerId({
    host,
    userId: user?.id ?? null,
    userOwnerId: ownerIdFromUser ?? null,
    supabase: supabaseServer,
  })
  perf.mark('resolveOwner')

  const summary = await getPortalConsultasSummaryCached(ownerId, contactsLimit, messagesLimit)
  perf.mark('queries')
  perf.mark('render')
  perf.done()
  return summary
}

export const getAtendimentoSummary = async (opts: {
  ownerId: string
  db: SupabaseClient
  contactsLimit?: number
  messagesLimit?: number
}) => {
  const perf = createServerPerf('atendimento.summary', { ownerId: opts.ownerId })
  perf.mark('start')
  const contactsRes = await opts.db
    .from('contacts_with_last_message')
    .select(
      'id, phone, name, is_whatsapp, last_message_at, photo_url, about, notify, short, vname, presence_status, presence_updated_at, chat_unread, last_message_body, last_message_direction, last_message_created_at'
    )
    .eq('owner_id', opts.ownerId)
    .order('last_message_at', { ascending: false })
    .limit(opts.contactsLimit ?? 100)
  perf.mark('queries')

  const contacts = contactsRes.data ?? []
  const firstContact = contacts[0]
  const messagesByPhone: Record<string, any[]> = {}

  if (firstContact?.id) {
    const { data: prefetchMessages } = await opts.db
      .from('messages')
      .select('id, contact_id, body, direction, status, created_at, media')
      .eq('contact_id', firstContact.id)
      .eq('owner_id', opts.ownerId)
      .order('created_at', { ascending: true })
      .limit(opts.messagesLimit ?? 100)

    if (prefetchMessages) {
      messagesByPhone[firstContact.phone] = prefetchMessages as any[]
    }
  }
  perf.mark('render')
  perf.done()

  return { contacts, messagesByPhone }
}
