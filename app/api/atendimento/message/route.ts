import { NextRequest, NextResponse } from 'next/server'

import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId, TenantResolutionError } from '../../../../lib/tenant'
import { logError, logInfo, resolveRequestId } from '../../../../lib/logger'
import { deleteMessage, hasZapiConfig, normalizePhoneToBR } from '../../../../lib/zapi'

export const runtime = 'nodejs'
export const revalidate = 0

export async function DELETE(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const requestId = resolveRequestId(req.headers)
  const noStoreHeaders = { 'Cache-Control': 'no-store' }
  const supabaseServer = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabaseServer.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  }
  const user = userData.user
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  let ownerId = ''
  try {
    ownerId = await resolveOwnerId({
      host,
      userId: user?.id ?? null,
      userOwnerId: ownerIdFromUser ?? null,
      supabase: supabaseServer,
    })
  } catch (err) {
    if (err instanceof TenantResolutionError) {
      return NextResponse.json({ message: err.message }, { status: 403, headers: noStoreHeaders })
    }
    throw err
  }

  const { phone, messageId, owner } = (await req.json().catch(() => ({}))) as {
    phone?: string
    messageId?: string
    owner?: boolean
  }

  if (!phone || !messageId || typeof owner !== 'boolean') {
    return NextResponse.json(
      { message: 'Informe phone, messageId e owner.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const normalized = normalizePhoneToBR(phone)
  if (!normalized) {
    return NextResponse.json(
      { message: 'Telefone inválido.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  if (!hasZapiConfig()) {
    return NextResponse.json(
      { message: 'Z-API não configurada.' },
      { status: 400, headers: noStoreHeaders }
    )
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
      { status: 500, headers: noStoreHeaders }
    )
  }

  const { error: updateError } = await supabaseServer
    .from('messages')
    .update({
      body: '[mensagem apagada]',
      media: null,
      status: 'deleted',
      deleted_at: new Date().toISOString(),
    })
    .eq('owner_id', ownerId)
    .eq('provider_message_id', messageId)

  if (updateError) {
    logError('atendimento/message update_error', {
      tag: 'api/atendimento/message',
      requestId,
      host,
      ownerId,
      phone: normalized,
      messageId,
      error: updateError.message,
    })
    return NextResponse.json(
      { message: updateError.message || 'Falha ao atualizar mensagem.' },
      { status: 500, headers: noStoreHeaders }
    )
  }

  logInfo('atendimento/message deleted', {
    tag: 'api/atendimento/message',
    requestId,
    host,
    ownerId,
    phone: normalized,
    messageId,
  })

  return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders })
}
