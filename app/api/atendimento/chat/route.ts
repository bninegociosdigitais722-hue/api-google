import { NextRequest, NextResponse } from 'next/server'

import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId, TenantResolutionError } from '../../../../lib/tenant'
import { logError, logInfo, resolveRequestId } from '../../../../lib/logger'
import { hasZapiConfig, modifyChat, normalizePhoneToBR } from '../../../../lib/zapi'

export const runtime = 'nodejs'
export const revalidate = 0

type ChatAction = 'read' | 'unread' | 'clear'

export async function POST(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const requestId = resolveRequestId(req.headers)
  const noStoreHeaders = { 'Cache-Control': 'no-store' }
  const supabaseServer = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabaseServer.auth.getUser()
  const user = userError ? null : userData.user ?? null
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
  const db = user ? supabaseServer : supabaseAdmin

  const { phone, action } = (await req.json().catch(() => ({}))) as {
    phone?: string
    action?: ChatAction
  }

  if (!phone || !action) {
    return NextResponse.json(
      { message: 'Informe phone e action.' },
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
    await modifyChat(normalized, action)
  } catch (err) {
    logError('atendimento/chat modify_error', {
      tag: 'api/atendimento/chat',
      requestId,
      host,
      ownerId,
      phone: normalized,
      action,
      error: (err as Error)?.message,
    })
    return NextResponse.json(
      { message: (err as Error)?.message || 'Falha ao executar ação.' },
      { status: 500, headers: noStoreHeaders }
    )
  }

  if (action === 'clear') {
    const { data: contact } = await db
      .from('contacts')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('phone', normalized)
      .single()

    if (contact?.id) {
      await db.from('messages').delete().eq('owner_id', ownerId).eq('contact_id', contact.id)
      await db
        .from('contacts')
        .update({ last_message_at: null, chat_unread: false })
        .eq('owner_id', ownerId)
        .eq('id', contact.id)
    }
  }

  if (action === 'read') {
    await db
      .from('contacts')
      .update({ chat_unread: false })
      .eq('owner_id', ownerId)
      .eq('phone', normalized)
  }

  if (action === 'unread') {
    await db
      .from('contacts')
      .update({ chat_unread: true })
      .eq('owner_id', ownerId)
      .eq('phone', normalized)
  }

  logInfo('atendimento/chat ok', {
    tag: 'api/atendimento/chat',
    requestId,
    host,
    ownerId,
    phone: normalized,
    action,
  })

  return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders })
}
