import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { normalizePhoneToBR } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logInfo, logWarn, resolveRequestId } from '../../../../lib/logger'

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

  const candidates = [
    req.headers.get('x-zapi-signature'),
    req.headers.get('x-zapi-webhook-token'),
    req.headers.get('x-client-token'),
    req.headers.get('client-token'),
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, ''),
    req.headers.get('x-api-key'),
  ].filter(Boolean) as string[]

  if (!candidates.length) return false

  const expectedBuf = Buffer.from(expected)
  for (const cand of candidates) {
    const providedBuf = Buffer.from(cand)
    if (expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf)) {
      return true
    }
  }
  return false
}

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req.headers)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')

  if (!verifySignature(req)) {
    logWarn('zapi webhook invalid signature', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      headers: {
        xzs: req.headers.get('x-zapi-signature') ? 'present' : 'missing',
        xzwt: req.headers.get('x-zapi-webhook-token') ? 'present' : 'missing',
        xclient: req.headers.get('x-client-token') ? 'present' : 'missing',
        auth: req.headers.get('authorization') ? 'present' : 'missing',
        xapikey: req.headers.get('x-api-key') ? 'present' : 'missing',
      },
    })
    // Modo permissivo: segue o processamento para não perder mensagens em ambiente demo
  }

  const payload = (await req.json().catch(() => ({}))) as ZapiIncoming
  const phone = extractPhone(payload)

  if (!phone) {
    logWarn('zapi webhook phone_missing', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      raw: payload,
    })
    return NextResponse.json({ message: 'Telefone não identificado no payload.' }, { status: 400 })
  }

  const ownerId = resolveOwnerId({ host })

  const body = extractBody(payload)
  const contactName = payload.pushName || null

  const withRetry = async <T>(fn: () => Promise<T>, attempts = 3, delayMs = 200): Promise<T> => {
    let lastError: any
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
        }
      }
    }
    throw lastError
  }

  const { data: contact, error: contactError } = await withRetry(async () => {
    const resp = await supabaseAdmin
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
    return resp
  })

  if (contactError || !contact) {
    logError('zapi webhook contact_error', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      error: contactError?.message,
    })
    return NextResponse.json(
      { message: contactError?.message || 'Erro ao salvar contato.' },
      { status: 500 }
    )
  }

  const { error: insertError } = await withRetry(async () => {
    const resp = await supabaseAdmin.from('messages').insert({
      owner_id: ownerId,
      contact_id: contact.id,
      direction: 'in',
      body,
      status: 'received',
      provider_message_id: payload.message?.id ?? null,
    })
    return resp
  })

  if (insertError) {
    logError('zapi webhook insert_error', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      contactId: contact.id,
      error: insertError.message,
    })
    return NextResponse.json({ message: insertError.message }, { status: 500 })
  }

  await supabaseAdmin
    .from('contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contact.id)
    .eq('owner_id', ownerId)

  logInfo('zapi webhook ok', {
    tag: 'api/webhooks/zapi',
    requestId,
    host,
    ownerId,
    phone,
    contactId: contact.id,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 })
}
