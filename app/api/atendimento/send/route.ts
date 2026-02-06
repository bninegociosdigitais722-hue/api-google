import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { normalizePhoneToBR, sendText } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'

type BodyPayload = {
  phones?: string[]
  message?: string
  name?: string | null
}

type SendResult = { phone: string; status: 'sent' | 'failed'; error?: string }

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const { phones = [], message, name }: BodyPayload = await req.json().catch(() => ({}))

  if (!Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
    return NextResponse.json(
      { message: 'Envie um array de telefones e uma mensagem.' },
      { status: 400 }
    )
  }

  const normalizedPhones = phones
    .map((p) => normalizePhoneToBR(p))
    .filter((p): p is string => Boolean(p))

  if (normalizedPhones.length === 0) {
    return NextResponse.json(
      { message: 'Nenhum telefone válido após normalização.' },
      { status: 400 }
    )
  }

  const ensureContact = async (phone: string) => {
    const { data, error } = await db
      .from('contacts')
      .upsert(
        {
          owner_id: ownerId,
          phone,
          name: name ?? null,
          is_whatsapp: true,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id,phone' }
      )
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Erro ao salvar contato')
    }
    return data.id as number
  }

  const results: SendResult[] = []

  for (const phone of normalizedPhones) {
    try {
      const contactId = await ensureContact(phone)
      const resp = await sendText(phone, message.trim())

      await db.from('messages').insert({
        owner_id: ownerId,
        contact_id: contactId,
        direction: 'out',
        body: message.trim(),
        status: 'sent',
        provider_message_id: resp.messageId ?? null,
      })

      await db
        .from('contacts')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', contactId)
        .eq('owner_id', ownerId)

      results.push({ phone, status: 'sent' })
    } catch (err) {
      results.push({
        phone,
        status: 'failed',
        error: (err as Error)?.message || 'Falha ao enviar',
      })
    }
  }

  return NextResponse.json({ results }, { status: 200 })
}
