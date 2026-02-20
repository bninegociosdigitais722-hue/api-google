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

export class SessionRequiredError extends Error {
  constructor() {
    super('SESSION_REQUIRED')
    this.name = 'SessionRequiredError'
  }
}

const getConsultasSummaryCached = (ownerId: string, limit: number) =>
  unstable_cache(
    async (): Promise<ConsultasSummary> => {
      const contactsRes = await supabaseAdmin
        .from('contacts')
        .select('id, name, phone, is_whatsapp, last_outbound_template, photo_url')
        .eq('owner_id', ownerId)
        .order('last_message_at', { ascending: false })
        .limit(limit)

      return {
        ownerId,
        contacts: contactsRes.data ?? [],
        count: null,
      }
    },
    ['consultas-summary', ownerId, String(limit)],
    { revalidate: 60 }
  )()

const getConsultasCountCached = (ownerId: string) =>
  unstable_cache(
    async (): Promise<number | null> => {
      const { count } = await supabaseAdmin
        .from('contacts')
        .select('id', { count: 'estimated', head: true })
        .eq('owner_id', ownerId)

      return typeof count === 'number' ? count : null
    },
    ['consultas-count', ownerId],
    { revalidate: 60 }
  )()

export const getConsultasSummary = async (
  host: string | null,
  limit: number = 10
): Promise<ConsultasSummary> => {
  const perf = createServerPerf('consultas.summary', { host })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData, error: sessionError } = await supabaseServer.auth.getSession()
  perf.mark('session')
  if (sessionError || !sessionData.session) {
    throw new SessionRequiredError()
  }
  const user = sessionData.session.user
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

export const getConsultasCount = async (host: string | null): Promise<number | null> => {
  const perf = createServerPerf('consultas.count', { host })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData, error: sessionError } = await supabaseServer.auth.getSession()
  perf.mark('session')
  if (sessionError || !sessionData.session) {
    throw new SessionRequiredError()
  }
  const user = sessionData.session.user
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = await resolveOwnerId({
    host,
    userId: user?.id ?? null,
    userOwnerId: ownerIdFromUser ?? null,
    supabase: supabaseServer,
  })
  perf.mark('resolveOwner')

  const count = await getConsultasCountCached(ownerId)
  perf.mark('queries')
  perf.mark('render')
  perf.done()
  return count
}

const getPortalConsultasSummaryCached = (
  ownerId: string,
  contactsLimit: number,
  messagesLimit: number
) =>
  unstable_cache(
    async (): Promise<PortalConsultasSummary> => {
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
    ['portal-consultas-summary', ownerId, String(contactsLimit), String(messagesLimit)],
    { revalidate: 60 }
  )()

export const getPortalConsultasSummary = async (
  host: string | null,
  contactsLimit: number = 50,
  messagesLimit: number = 30
): Promise<PortalConsultasSummary> => {
  const perf = createServerPerf('portal.consultas.summary', { host })
  perf.mark('start')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData, error: sessionError } = await supabaseServer.auth.getSession()
  perf.mark('session')
  if (sessionError || !sessionData.session) {
    throw new SessionRequiredError()
  }
  const user = sessionData.session.user
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
      'id, phone, name, is_whatsapp, last_message_at, photo_url, presence_status, presence_updated_at, chat_unread, last_message_body, last_message_direction, last_message_created_at'
    )
    .eq('owner_id', opts.ownerId)
    .order('last_message_at', { ascending: false })
    .limit(opts.contactsLimit ?? 20)
  perf.mark('queries')

  const contacts = contactsRes.data ?? []
  const firstContact = contacts[0]
  const messagesByPhone: Record<string, any[]> = {}

  if (firstContact?.id && (opts.messagesLimit ?? 20) > 0) {
    const { data: prefetchMessages } = await opts.db
      .from('messages')
      .select('id, contact_id, body, direction, status, created_at, media')
      .eq('contact_id', firstContact.id)
      .eq('owner_id', opts.ownerId)
      .order('created_at', { ascending: true })
      .limit(opts.messagesLimit ?? 20)

    if (prefetchMessages) {
      messagesByPhone[firstContact.phone] = prefetchMessages as any[]
    }
  }
  perf.mark('render')
  perf.done()

  return { contacts, messagesByPhone }
}
