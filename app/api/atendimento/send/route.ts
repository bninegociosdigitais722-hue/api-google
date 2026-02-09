import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { normalizePhoneToBR, sendText } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logInfo, logWarn, resolveRequestId } from '../../../../lib/logger'

type BodyPayload = {
  phones?: string[]
  message?: string
  name?: string | null
  template?: string | null
  force?: boolean
}

type SendResult = { phone: string; status: 'sent' | 'failed' | 'skipped'; error?: string }

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

  const { phones = [], message, name, template, force }: BodyPayload = await req.json().catch(() => ({}))
  const templateId = template?.trim() || 'supercotacao_demo'
  const defaultMessage = `Olá, tudo bem? 😊

Me chamo Ítalo e sou do Super Cotação.

Vi seu estabelecimento no Google Maps e acredito que o Super Cotação pode te ajudar a economizar nas compras, comparando preços de fornecedores pelo WhatsApp.

Posso te explicar rapidinho como funciona?`
  const trimmedMessage = message?.trim() || defaultMessage

  if (!Array.isArray(phones) || phones.length === 0 || !trimmedMessage) {
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

      const resp = await sendText(phone, trimmedMessage)

      await db.from('messages').insert({
        owner_id: ownerId,
        contact_id: contactId,
        direction: 'out',
        body: trimmedMessage,
        status: 'sent',
        provider_message_id: resp.messageId ?? null,
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
