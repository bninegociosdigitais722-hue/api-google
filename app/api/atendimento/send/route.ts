import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { normalizePhoneToBR, sendAudio, sendDocument, sendImage, sendText, sendVideo } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logInfo, resolveRequestId } from '../../../../lib/logger'

type BodyPayload = {
  phones?: string[]
  message?: string
  name?: string | null
  template?: string | null
  force?: boolean
  attachment?: {
    data: string
    mimeType?: string | null
    fileName?: string | null
    kind?: 'image' | 'audio' | 'video' | 'document' | 'auto'
  }
}

type SendResult = { phone: string; status: 'sent' | 'failed' | 'skipped'; error?: string }

const inferAttachmentKind = (mimeType?: string | null, fileName?: string | null) => {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType.startsWith('video/')) return 'video'
  }
  const ext = fileName?.split('.').pop()?.toLowerCase()
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image'
  if (ext && ['mp3', 'wav', 'ogg', 'opus', 'm4a'].includes(ext)) return 'audio'
  if (ext && ['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video'
  return 'document'
}

const inferDocumentExtension = (fileName?: string | null, mimeType?: string | null) => {
  const ext = fileName?.split('.').pop()?.toLowerCase()
  if (ext) return ext

  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
    'application/zip': 'zip',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  }
  if (mimeType && map[mimeType]) return map[mimeType]
  return 'bin'
}

const buildAttachmentFallback = (kind: string, fileName?: string | null) => {
  if (kind === 'image') return '[imagem]'
  if (kind === 'audio') return '[áudio]'
  if (kind === 'video') return '[vídeo]'
  if (kind === 'document') {
    const label = fileName ? `: ${fileName}` : ''
    return `[documento${label}]`
  }
  return '[anexo]'
}

export const runtime = 'nodejs'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const requestId = resolveRequestId(req.headers)
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const {
    phones = [],
    message,
    name,
    template,
    force,
    attachment,
  }: BodyPayload = await req.json().catch(() => ({}))
  const templateId = template?.trim() || 'supercotacao_demo'
  const defaultMessage = `Olá, tudo bem? 😊

Me chamo Ítalo e sou do Super Cotação.

Vi seu estabelecimento no Google Maps e acredito que o Super Cotação pode te ajudar a economizar nas compras, comparando preços de fornecedores pelo WhatsApp.

Posso te explicar rapidinho como funciona?`
  const rawMessage = message?.trim() || ''
  const hasAttachment = Boolean(attachment?.data)
  const trimmedMessage = !rawMessage && !hasAttachment && templateId === 'supercotacao_demo'
    ? defaultMessage
    : rawMessage

  if (!Array.isArray(phones) || phones.length === 0 || (!trimmedMessage && !hasAttachment)) {
    return NextResponse.json(
      { message: 'Envie um array de telefones e uma mensagem ou anexo.' },
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
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const payload: Record<string, any> = {
      owner_id: ownerId,
      phone,
      is_whatsapp: true,
      last_message_at: new Date().toISOString(),
    }
    if (trimmedName) {
      payload.name = trimmedName
    }

    const { data, error } = await db
      .from('contacts')
      .upsert(payload, { onConflict: 'owner_id,phone' })
      .select('id, last_outbound_template')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Erro ao salvar contato')
    }
    return { id: data.id as number, lastTemplate: (data as any).last_outbound_template as string | null }
  }

  const results: SendResult[] = []

  for (const phone of normalizedPhones) {
    try {
      const { id: contactId, lastTemplate } = await ensureContact(phone)

      if (!force && lastTemplate === templateId) {
        results.push({ phone, status: 'skipped' })
        continue
      }

      let resp: { messageId?: string } | null = null
      let media: Record<string, any> | null = null
      let storedBody = trimmedMessage

      if (hasAttachment) {
        const kind =
          attachment?.kind && attachment.kind !== 'auto'
            ? attachment.kind
            : inferAttachmentKind(attachment?.mimeType, attachment?.fileName)
        const caption = trimmedMessage || null
        const fallbackBody = buildAttachmentFallback(kind, attachment?.fileName)
        const rawData = attachment?.data?.trim()
        const base64 = rawData ? rawData.split(',').pop() : ''

        if (!base64) {
          throw new Error('Anexo inválido (base64 ausente).')
        }

        if (kind === 'image') {
          resp = await sendImage(phone, base64, caption)
        } else if (kind === 'audio') {
          resp = await sendAudio(phone, base64)
        } else if (kind === 'video') {
          resp = await sendVideo(phone, base64, caption)
        } else {
          const extension = inferDocumentExtension(attachment?.fileName, attachment?.mimeType)
          resp = await sendDocument(phone, base64, extension, attachment?.fileName)
        }

        media = {
          type: kind,
          mimeType: attachment?.mimeType ?? null,
          fileName: attachment?.fileName ?? null,
          caption,
        }
        storedBody = trimmedMessage || fallbackBody
      } else {
        resp = await sendText(phone, trimmedMessage)
      }

      await db.from('messages').insert({
        owner_id: ownerId,
        contact_id: contactId,
        direction: 'out',
        body: storedBody,
        status: 'sent',
        provider_message_id: resp?.messageId ?? null,
        media,
      })

      await db
        .from('contacts')
        .update({
          last_message_at: new Date().toISOString(),
          last_outbound_template: templateId,
          last_outbound_at: new Date().toISOString(),
        })
        .eq('id', contactId)
        .eq('owner_id', ownerId)

      results.push({ phone, status: 'sent' })
    } catch (err) {
      logError('atendimento/send failed', {
        tag: 'api/atendimento/send',
        requestId,
        host,
        ownerId,
        phone,
        error: (err as Error)?.message,
      })
      results.push({
        phone,
        status: 'failed',
        error: (err as Error)?.message || 'Falha ao enviar',
      })
    }
  }

  logInfo('atendimento/send done', {
    tag: 'api/atendimento/send',
    requestId,
    host,
    ownerId,
    success: results.filter((r) => r.status === 'sent').length,
    failed: results.filter((r) => r.status === 'failed').length,
  })

  return NextResponse.json({ results }, { status: 200 })
}
