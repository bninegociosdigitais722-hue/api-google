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
  ids?: string[]
  isEdit?: boolean
  lastSeen?: string | number | null
  phone?: string
  from?: string
  remoteJid?: string
  pushName?: string
  senderName?: string
  chatName?: string
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

type MessageMedia = {
  type: 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'contact' | 'location'
  url?: string | null
  thumbnailUrl?: string | null
  mimeType?: string | null
  fileName?: string | null
  caption?: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  name?: string | null
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

const normalizeMessageStatus = (value?: string | null) => {
  if (!value) return null
  return value.trim().toLowerCase()
}

const normalizePresenceStatus = (value?: string | null) => {
  if (!value) return null
  return value.trim().toUpperCase()
}

const parsePresenceLastSeen = (value?: string | number | null) => {
  if (!value) return null
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

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

const extractMedia = (payload: ZapiIncoming): MessageMedia | null => {
  if (payload.image?.imageUrl) {
    return {
      type: 'image',
      url: payload.image.imageUrl,
      thumbnailUrl: payload.image.thumbnailUrl ?? null,
      mimeType: payload.image.mimeType ?? null,
      caption: payload.image.caption ?? null,
    }
  }
  if (payload.video?.videoUrl) {
    return {
      type: 'video',
      url: payload.video.videoUrl,
      mimeType: payload.video.mimeType ?? null,
      caption: payload.video.caption ?? null,
    }
  }
  if (payload.audio?.audioUrl) {
    return {
      type: 'audio',
      url: payload.audio.audioUrl,
      mimeType: payload.audio.mimeType ?? null,
    }
  }
  if (payload.document?.documentUrl) {
    return {
      type: 'document',
      url: payload.document.documentUrl,
      mimeType: payload.document.mimeType ?? null,
      fileName: payload.document.fileName ?? payload.document.title ?? null,
      caption: payload.document.title ?? null,
    }
  }
  if (payload.sticker?.stickerUrl) {
    return {
      type: 'sticker',
      url: payload.sticker.stickerUrl,
      mimeType: payload.sticker.mimeType ?? null,
    }
  }
  if (payload.contact?.vCard) {
    return {
      type: 'contact',
      name: payload.contact.displayName ?? null,
    }
  }
  if (payload.location?.latitude || payload.location?.longitude) {
    return {
      type: 'location',
      latitude: payload.location.latitude ?? null,
      longitude: payload.location.longitude ?? null,
      name: payload.location.name ?? null,
      address: payload.location.address ?? null,
    }
  }
  return null
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
  const isStatusCallback = callbackType === 'messagestatuscallback'
  const isPresenceCallback = callbackType === 'presencechatcallback'
  const hasMessage = hasMessagePayload(payload)

  if (isStatusCallback) {
    const ids = Array.isArray(payload.ids)
      ? payload.ids.filter(Boolean)
      : payload.messageId
        ? [payload.messageId]
        : []
    const normalizedStatus = normalizeMessageStatus(payload.status)

    if (!ids.length || !normalizedStatus) {
      logWarn('zapi webhook status missing ids/status', {
        tag: 'api/webhooks/zapi',
        requestId,
        host,
        ownerId,
        phone,
        status: payload.status,
      })
      return NextResponse.json({ ok: true, ignored: 'status_missing_data' }, { status: 200 })
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ status: normalizedStatus })
      .eq('owner_id', ownerId)
      .in('provider_message_id', ids)
      .is('deleted_at', null)

    if (error) {
      logError('zapi webhook status update_error', {
        tag: 'api/webhooks/zapi',
        requestId,
        host,
        ownerId,
        phone,
        status: normalizedStatus,
        error: error.message,
      })
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    logInfo('zapi webhook status updated', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      status: normalizedStatus,
      count: ids.length,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (isPresenceCallback) {
    const presence = normalizePresenceStatus(payload.status)
    if (!presence) {
      return NextResponse.json({ ok: true, ignored: 'presence_missing_status' }, { status: 200 })
    }

    const lastSeen = parsePresenceLastSeen(payload.lastSeen)

    await supabaseAdmin
      .from('contacts')
      .upsert(
        {
          owner_id: ownerId,
          phone,
          is_whatsapp: true,
          presence_status: presence,
          presence_last_seen: lastSeen,
          presence_updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id,phone' }
      )

    logInfo('zapi webhook presence updated', {
      tag: 'api/webhooks/zapi',
      requestId,
      host,
      ownerId,
      phone,
      presence,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  }

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

  if (payload.fromMe && !payload.isEdit) {
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
  const media = extractMedia(payload)
  const cleanBody = body.trim()
  const contactName = (() => {
    const candidate =
      payload.senderName ||
      payload.chatName ||
      payload.pushName ||
      (typeof payload.sender === 'object' ? payload.sender?.name || payload.sender?.pushName : null)
    if (typeof candidate !== 'string') return null
    const trimmed = candidate.trim()
    return trimmed || null
  })()

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
    const payload = {
      owner_id: ownerId,
      phone,
      is_whatsapp: true,
      last_message_at: new Date().toISOString(),
    } as Record<string, any>
    if (contactName) {
      payload.name = contactName
    }

    const resp = await supabaseAdmin
      .from('contacts')
      .upsert(payload, { onConflict: 'owner_id,phone' })
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

  if (payload.isEdit && providerMessageId) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        body: cleanBody,
        media,
        edited_at: new Date().toISOString(),
      })
      .eq('owner_id', ownerId)
      .eq('provider_message_id', providerMessageId)
      .select('id')

    if (!updateError && updated && updated.length > 0) {
      return NextResponse.json({ ok: true, edited: true }, { status: 200 })
    }
  }

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
    const isOutbound = Boolean(payload.fromMe)
    const resp = await supabaseAdmin.from('messages').insert({
      owner_id: ownerId,
      contact_id: contact.id,
      direction: isOutbound ? 'out' : 'in',
      body: cleanBody,
      status: isOutbound ? 'sent' : 'received',
      provider_message_id: providerMessageId,
      media,
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
    .update({
      last_message_at: new Date().toISOString(),
      chat_unread: true,
    })
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
