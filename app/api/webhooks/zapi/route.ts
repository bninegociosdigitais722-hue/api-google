import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { normalizePhoneToBR } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'

type ZapiIncoming = {
  phone?: string
  from?: string
  remoteJid?: string
  pushName?: string
  message?: {
    id?: string
    from?: string
    phone?: string
    body?: string
    text?: string
  }
  body?: string
  text?: string
}

const extractPhone = (payload: ZapiIncoming): string | null => {
  const candidates = [
    payload.phone,
    payload.from,
    payload.remoteJid,
    payload.message?.phone,
    payload.message?.from,
  ].filter(Boolean) as string[]

  for (const cand of candidates) {
    const digits = cand.replace(/\D/g, '')
    if (digits.length >= 10) {
      const normalized = normalizePhoneToBR(digits)
      if (normalized) return normalized
    }
  }
  return null
}

const extractBody = (payload: ZapiIncoming): string => {
  return (
    payload.message?.body ||
    payload.message?.text ||
    payload.body ||
    payload.text ||
    '[mensagem sem texto]'
  )
}

const verifySignature = (req: NextRequest) => {
  const expected = process.env.ZAPI_WEBHOOK_TOKEN
  if (!expected) {
    throw new Error('ZAPI_WEBHOOK_TOKEN ausente - fail hard.')
  }

  const provided =
    req.headers.get('x-zapi-signature') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)

  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!verifySignature(req)) {
    return NextResponse.json({ message: 'Assinatura inválida.' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => ({}))) as ZapiIncoming
  const phone = extractPhone(payload)

  if (!phone) {
    return NextResponse.json({ message: 'Telefone não identificado no payload.' }, { status: 400 })
  }

  const ownerId = resolveOwnerId({
    host: req.headers.get('x-forwarded-host') || req.headers.get('host'),
  })

  const body = extractBody(payload)
  const contactName = payload.pushName || null

  const { data: contact, error: contactError } = await supabaseAdmin
    .from('contacts')
    .upsert(
      {
        owner_id: ownerId,
        phone,
        name: contactName,
        is_whatsapp: true,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,phone' }
    )
    .select('id')
    .single()

  if (contactError || !contact) {
    return NextResponse.json(
      { message: contactError?.message || 'Erro ao salvar contato.' },
      { status: 500 }
    )
  }

  const { error: insertError } = await supabaseAdmin.from('messages').insert({
    owner_id: ownerId,
    contact_id: contact.id,
    direction: 'in',
    body,
    status: 'received',
    provider_message_id: payload.message?.id ?? null,
  })

  if (insertError) {
    return NextResponse.json({ message: insertError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contact.id)
    .eq('owner_id', ownerId)

  return NextResponse.json({ ok: true }, { status: 200 })
}

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}
