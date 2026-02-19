import { NextRequest, NextResponse } from 'next/server'

import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId, TenantResolutionError } from '../../../../lib/tenant'
import { logError, logInfo, resolveRequestId } from '../../../../lib/logger'
import {
  getContactMetadata,
  getContactProfilePicture,
  hasZapiConfig,
  normalizePhoneToBR,
} from '../../../../lib/zapi'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const requestId = resolveRequestId(req.headers)
  const noStoreHeaders = { 'Cache-Control': 'no-store' }
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
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

  const phoneParam = req.nextUrl.searchParams.get('phone')
  if (!phoneParam) {
    return NextResponse.json(
      { message: 'Informe phone.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const normalized = normalizePhoneToBR(phoneParam)
  if (!normalized) {
    return NextResponse.json(
      { message: 'Telefone inválido.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select(
      'id, phone, name, is_whatsapp, last_message_at, photo_url, about, notify, short, vname, metadata_updated_at, photo_updated_at, presence_status, presence_updated_at, chat_unread'
    )
    .eq('phone', normalized)
    .eq('owner_id', ownerId)
    .single()

  if (contactError || !contact) {
    return NextResponse.json(
      { message: 'Contato não encontrado.' },
      { status: 404, headers: noStoreHeaders }
    )
  }

  if (!hasZapiConfig()) {
    return NextResponse.json({ contact }, { status: 200, headers: noStoreHeaders })
  }

  const [metadata, profilePhoto] = await Promise.all([
    getContactMetadata(normalized).catch(() => null),
    getContactProfilePicture(normalized).catch(() => null),
  ])

  const now = new Date().toISOString()
  const updates: Record<string, any> = {
    metadata_updated_at: now,
  }

  if (metadata) {
    updates.about = metadata.about ?? contact.about ?? null
    updates.notify = metadata.notify ?? contact.notify ?? null
    updates.short = metadata.short ?? contact.short ?? null
    updates.vname = metadata.vname ?? contact.vname ?? null
    if (!contact.name && metadata.name) {
      updates.name = metadata.name
    }
  }

  const photoUrl = profilePhoto ?? metadata?.imgUrl ?? null
  if (photoUrl) {
    updates.photo_url = photoUrl
    updates.photo_updated_at = now
  }

  const { data: updated, error: updateError } = await db
    .from('contacts')
    .update(updates)
    .eq('id', contact.id)
    .eq('owner_id', ownerId)
    .select(
      'id, phone, name, is_whatsapp, last_message_at, photo_url, about, notify, short, vname, metadata_updated_at, photo_updated_at, presence_status, presence_updated_at, chat_unread'
    )
    .single()

  if (updateError) {
    logError('atendimento/contact update_error', {
      tag: 'api/atendimento/contact',
      requestId,
      host,
      ownerId,
      phone: normalized,
      error: updateError.message,
    })
    return NextResponse.json(
      { message: updateError.message },
      { status: 500, headers: noStoreHeaders }
    )
  }

  logInfo('atendimento/contact ok', {
    tag: 'api/atendimento/contact',
    requestId,
    host,
    ownerId,
    phone: normalized,
  })

  return NextResponse.json({ contact: updated }, { status: 200, headers: noStoreHeaders })
}
