import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { resolveOwnerId } from '../../../../lib/tenant'

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

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ownerId = resolveOwnerId({
    host: req.headers.get('x-forwarded-host') || req.headers.get('host'),
  })

  const { data: contacts, error } = await supabaseAdmin
    .from('contacts')
    .select('id, phone, name, is_whatsapp, last_message_at')
    .eq('owner_id', ownerId)
    .order('last_message_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const contactIds = contacts?.map((c) => c.id) ?? []
  let messagesMap = new Map<number, Conversa['last_message']>()

  if (contactIds.length) {
    const { data: msgs } = await supabaseAdmin
      .from('messages')
      .select('contact_id, body, direction, created_at')
      .in('contact_id', contactIds)
      .eq('owner_id', ownerId)
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

  return NextResponse.json({ conversas }, { status: 200 })
}
