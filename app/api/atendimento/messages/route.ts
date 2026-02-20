import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { normalizePhoneToBR } from '../../../../lib/zapi'
import { resolveOwnerId, TenantResolutionError } from '../../../../lib/tenant'
import { logError, logInfo, logWarn, resolveRequestId } from '../../../../lib/logger'

type Message = {
  id: number
  contact_id: number
  body: string
  direction: 'in' | 'out'
  status: string | null
  created_at: string
  media?: Record<string, any> | null
}

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
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

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json(
      { message: 'Informe phone.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 200)
  const before = req.nextUrl.searchParams.get('before')
  const beforeValue = before && !Number.isNaN(Date.parse(before)) ? before : null

  const normalized = normalizePhoneToBR(phone)
  if (!normalized) {
    return NextResponse.json(
      { message: 'Telefone inválido.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const { data: contact, error: contactError } = await supabaseServer
    .from('contacts')
    .select(
      'id, phone, name, photo_url, about, notify, short, vname, presence_status, presence_updated_at, chat_unread'
    )
    .eq('phone', normalized)
    .eq('owner_id', ownerId)
    .single()

  if (contactError || !contact) {
    logWarn('atendimento/messages contact_not_found', {
      tag: 'api/atendimento/messages',
      requestId,
      host,
      ownerId,
      phone: normalized,
      error: contactError?.message,
    })
    return NextResponse.json(
      { message: 'Contato não encontrado.' },
      { status: 404, headers: noStoreHeaders }
    )
  }

  let query = supabaseServer
    .from('messages')
    .select(
      'id, contact_id, body, direction, status, created_at, media, provider_message_id, edited_at, deleted_at'
    )
    .eq('contact_id', contact.id)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (beforeValue) {
    query = query.lt('created_at', beforeValue)
  }

  const { data: messages, error } = await query

  if (error) {
    logError('atendimento/messages list_error', {
      tag: 'api/atendimento/messages',
      requestId,
      host,
      ownerId,
      contactId: contact.id,
      error: error.message,
    })
    return NextResponse.json(
      { message: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }

  logInfo('atendimento/messages ok', {
    tag: 'api/atendimento/messages',
    requestId,
    host,
    ownerId,
    contactId: contact.id,
    limit,
    before: beforeValue,
    count: messages?.length ?? 0,
  })

  return NextResponse.json(
    { messages: messages ?? [], contact },
    { status: 200, headers: noStoreHeaders }
  )
}

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
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json(
      { message: 'Informe phone.' },
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

  const { data: contact, error: contactError } = await supabaseServer
    .from('contacts')
    .select('id')
    .eq('phone', normalized)
    .eq('owner_id', ownerId)
    .single()

  if (contactError || !contact) {
    logWarn('atendimento/messages contact_not_found', {
      tag: 'api/atendimento/messages',
      requestId,
      host,
      ownerId,
      userId: user?.id ?? null,
      resourceId: null,
      phone: normalized,
      status: 'not_found',
      error: contactError?.message,
    })
    return NextResponse.json(
      { message: 'Contato não encontrado.' },
      { status: 404, headers: noStoreHeaders }
    )
  }

  const { error } = await supabaseServer
    .from('messages')
    .delete()
    .eq('contact_id', contact.id)
    .eq('owner_id', ownerId)

  if (error) {
    logError('atendimento/messages delete_error', {
      tag: 'api/atendimento/messages',
      requestId,
      host,
      ownerId,
      userId: user?.id ?? null,
      contactId: contact.id,
      resourceId: contact.id,
      status: 'error',
      error: error.message,
    })
    return NextResponse.json(
      { message: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }

  logInfo('atendimento/messages deleted', {
    tag: 'api/atendimento/messages',
    requestId,
    host,
    ownerId,
    userId: user?.id ?? null,
    resourceId: contact.id,
    phone: normalized,
    status: 'success',
  })

  return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders })
}
