import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AtendimentoClient, { Conversa, Message } from './AtendimentoClient'
import { resolveOwnerId } from '../../../lib/tenant'
import { createSupabaseServerClient } from '../../../lib/supabase/server'

export const metadata = {
  title: 'Atendimento | Radar Local',
}

export const revalidate = 0

export default async function AtendimentoPage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  if (!user) {
    redirect('/login')
  }
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })

  let conversas: Conversa[] = []
  let messagesByPhone: Record<string, Message[]> = {}

  try {
    const [{ data: contacts }, { data: msgs }] = await Promise.all([
      supabaseServer
        .from('contacts')
        .select('id, phone, name, is_whatsapp, last_message_at')
        .eq('owner_id', ownerId)
        .order('last_message_at', { ascending: false })
        .limit(200),
      supabaseServer
        .from('messages')
        .select('contact_id, body, direction, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false }),
    ])

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
    if (firstPhone) {
      const contactId = conversas[0].id
      const { data: msgsAsc } = await supabaseServer
        .from('messages')
        .select('id, contact_id, body, direction, status, created_at')
        .eq('contact_id', contactId)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: true })

      if (msgsAsc) {
        messagesByPhone[firstPhone] = msgsAsc as Message[]
      }
    }
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
