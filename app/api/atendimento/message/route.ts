import { NextRequest, NextResponse } from 'next/server'

import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logInfo, resolveRequestId } from '../../../../lib/logger'
import { deleteMessage, hasZapiConfig, normalizePhoneToBR } from '../../../../lib/zapi'

export const runtime = 'nodejs'
export const revalidate = 0

export async function DELETE(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const requestId = resolveRequestId(req.headers)
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const { phone, messageId, owner } = (await req.json().catch(() => ({}))) as {
    phone?: string
    messageId?: string
    owner?: boolean
  }

  if (!phone || !messageId || typeof owner !== 'boolean') {
    return NextResponse.json(
      { message: 'Informe phone, messageId e owner.' },
      { status: 400 }
    )
  }

  const normalized = normalizePhoneToBR(phone)
  if (!normalized) {
    return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 })
  }

  if (!hasZapiConfig()) {
    return NextResponse.json({ message: 'Z-API não configurada.' }, { status: 400 })
  }

  try {
    await deleteMessage(normalized, messageId, owner)
  } catch (err) {
    logError('atendimento/message delete_error', {
      tag: 'api/atendimento/message',
      requestId,
      host,
      ownerId,
      phone: normalized,
      messageId,
      error: (err as Error)?.message,
    })
    return NextResponse.json(
      { message: (err as Error)?.message || 'Falha ao apagar mensagem.' },
      { status: 500 }
    )
  }

  await db
    .from('messages')
    .update({
      body: '[mensagem apagada]',
      media: null,
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    })
    .eq('owner_id', ownerId)
    .eq('provider_message_id', messageId)

  logInfo('atendimento/message deleted', {
    tag: 'api/atendimento/message',
    requestId,
    host,
    ownerId,
    phone: normalized,
    messageId,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
