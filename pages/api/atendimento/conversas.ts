import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '../../../lib/supabase'

type Conversa = {
  id: number
  phone: string
  name: string | null
  is_whatsapp: boolean | null
  last_message_at: string | null
  last_message?: {
    body: string
    direction: 'in' | 'out'
    created_at: string
  } | null
}

type ResponseData = { conversas: Conversa[] }

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ResponseData | { message: string }>
) {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, phone, name, is_whatsapp, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(200)

  if (error) {
    return res.status(500).json({ message: error.message })
  }

  const contactIds = contacts?.map((c) => c.id) ?? []
  let messagesMap = new Map<number, Conversa['last_message']>()

  if (contactIds.length) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('contact_id, body, direction, created_at')
      .in('contact_id', contactIds)
      .order('created_at', { ascending: false })

    if (msgs) {
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
  }

  const conversas: Conversa[] =
    contacts?.map((c) => ({
      ...c,
      last_message: messagesMap.get(c.id) ?? null,
    })) ?? []

  return res.status(200).json({ conversas })
}
