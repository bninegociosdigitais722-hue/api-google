import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { normalizePhoneToBR } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logInfo, logWarn, resolveRequestId } from '../../../../lib/logger'

type ZapiIncoming = {
  type?: string
  status?: string
  notification?: string
  waitingMessage?: boolean
  phone?: string
  from?: string
  remoteJid?: string
  pushName?: string
  sender?: any
  participant?: string
  chatId?: string
  chatid?: string
  fromMe?: boolean
  messageId?: string
  message?: {
    id?: string
    messageId?: string
    from?: string
    phone?: string
    body?: string
    text?: string
  }
  text?: { message?: string } | string
  image?: { caption?: string; imageUrl?: string; thumbnailUrl?: string; mimeType?: string }
  audio?: { audioUrl?: string; mimeType?: string }
  video?: { videoUrl?: string; caption?: string; mimeType?: string }
  document?: { documentUrl?: string; title?: string; fileName?: string; mimeType?: string }
  contact?: { displayName?: string; vCard?: string }
  location?: { name?: string; address?: string; latitude?: number; longitude?: number }
  sticker?: { stickerUrl?: string; mimeType?: string }
  reaction?: { text?: string }
  listResponse?: { title?: string }
  buttonResponse?: { selectedDisplayText?: string }
  body?: string
}

const extractPhone = (payload: ZapiIncoming): string | null => {
  const candidates = [
    payload.phone,
    payload.from,
    payload.remoteJid?.split('@')[0],
    payload.message?.phone,
    payload.message?.from,
    typeof payload.sender === 'string' ? payload.sender : payload.sender?.phone,
    payload.participant,
    payload.chatId,
    payload.chatid,
  ].filter(Boolean) as string[]

  for (const cand of candidates) {
    const digits = cand.replace(/\D/g, '')
    if (digits.length >= 10 && digits.length <= 13) {
      const normalized = normalizePhoneToBR(digits)
      if (normalized) return normalized
    }
  }
  return null
}

const normalizeCallbackType = (value?: string | null) =>
  value ? value.replace(/\s+/g, '').toLowerCase() : ''

const hasMessagePayload = (payload: ZapiIncoming): boolean => {
  const textValue =
    typeof payload.text === 'string' ? payload.text.trim() : payload.text?.message?.trim()
  return Boolean(
    textValue ||
      payload.message?.body?.trim() ||
      payload.message?.text?.trim() ||
      payload.image?.imageUrl ||
      payload.image?.caption ||
      payload.audio?.audioUrl ||
      payload.video?.videoUrl ||
      payload.video?.caption ||
      payload.document?.documentUrl ||
      payload.document?.title ||
      payload.document?.fileName ||
      payload.contact?.displayName ||
      payload.contact?.vCard ||
      payload.location?.latitude ||
      payload.location?.longitude ||
      payload.sticker?.stickerUrl ||
      payload.reaction?.text ||
      payload.listResponse?.title ||
      payload.buttonResponse?.selectedDisplayText
  )
}

const extractBody = (payload: ZapiIncoming): string => {
  const textValue =
    typeof payload.text === 'string' ? payload.text.trim() : payload.text?.message?.trim()
  const candidates = [
    textValue,
    payload.message?.body?.trim(),
    payload.message?.text?.trim(),
    payload.image?.caption?.trim(),
    payload.video?.caption?.trim(),
    payload.document?.title?.trim(),
    payload.document?.fileName?.trim(),
    payload.contact?.displayName?.trim(),
    payload.listResponse?.title?.trim(),
    payload.buttonResponse?.selectedDisplayText?.trim(),
  ].filter((v): v is string => Boolean(v && v.trim()))

  if (candidates.length > 0) {
    return candidates[0].trim()
  }

  if (payload.image?.imageUrl) return '[imagem]'
  if (payload.video?.videoUrl) return '[vídeo]'
  if (payload.audio?.audioUrl) return '[áudio]'
  if (payload.document?.documentUrl) {
    const label = payload.document.fileName ? `: ${payload.document.fileName}` : ''
    return `[documento${label}]`
  }
  if (payload.contact?.vCard) return '[contato]'
  if (payload.location?.latitude || payload.location?.longitude) return '[localização]'
  if (payload.sticker?.stickerUrl) return '[sticker]'
  if (payload.reaction?.text) return `Reação: ${payload.reaction.text}`

  return ''
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

  const callbackType = normalizeCallbackType(payload.type)
  const isReceivedCallback = callbackType === 'receivedcallback'
  const hasMessage = hasMessagePayload(payload)

  if (!isReceivedCallback && !hasMessage) {
    logInfo('zapi webhook ignored non-message event', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      type: payload.type,
      status: payload.status,
      notification: payload.notification,
    })
    return NextResponse.json({ ok: true, ignored: 'non-message' }, { status: 200 })
  }

  if (!hasMessage) {
    logWarn('zapi webhook ignored unsupported message', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      type: payload.type,
      status: payload.status,
      notification: payload.notification,
      keys: Object.keys(payload),
    })
    return NextResponse.json({ ok: true, ignored: 'unsupported message' }, { status: 200 })
  }

  if (payload.fromMe) {
    logInfo('zapi webhook ignored fromMe message', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      type: payload.type,
    })
    return NextResponse.json({ ok: true, ignored: 'fromMe' }, { status: 200 })
  }

  const body = extractBody(payload)
  const cleanBody = body.trim()
  const contactName = payload.pushName || null

  if (!cleanBody) {
    logWarn('zapi webhook ignored empty body', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      type: payload.type,
      status: payload.status,
      keys: Object.keys(payload),
      messageKeys: payload.message ? Object.keys(payload.message) : [],
    })
    return NextResponse.json({ ok: true, ignored: 'empty body' }, { status: 200 })
  }

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

  const providerMessageId =
    payload.message?.id ?? payload.message?.messageId ?? payload.messageId ?? null

  if (providerMessageId) {
    const { data: existing } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('provider_message_id', providerMessageId)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({ ok: true, deduped: true }, { status: 200 })
    }
  }

  const { error: insertError } = await withRetry(async () => {
    const resp = await supabaseAdmin.from('messages').insert({
      owner_id: ownerId,
      contact_id: contact.id,
      direction: 'in',
      body: cleanBody,
      status: 'received',
      provider_message_id: providerMessageId,
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
