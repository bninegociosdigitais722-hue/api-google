import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId, TenantResolutionError } from '../../../../lib/tenant'
import { logError, logInfo, logWarn, resolveRequestId } from '../../../../lib/logger'

type Conversa = {
  id: number
  phone: string
  name: string | null
  is_whatsapp: boolean | null
  last_message_at: string | null
  photo_url?: string | null
  about?: string | null
  notify?: string | null
  short?: string | null
  vname?: string | null
  presence_status?: string | null
  presence_updated_at?: string | null
  chat_unread?: boolean | null
  last_message?: {
    body: string
    direction: 'in' | 'out'
    created_at: string
  } | null
}

export const runtime = 'nodejs'

export const revalidate = 0

export async function GET(req: NextRequest) {
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

  const { data: contacts, error } = await db
    .from('contacts')
    .select(
      'id, phone, name, is_whatsapp, last_message_at, photo_url, about, notify, short, vname, presence_status, presence_updated_at, chat_unread'
    )
    .eq('owner_id', ownerId)
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (error) {
    logError('atendimento/conversas contacts_error', {
      tag: 'api/atendimento/conversas',
      requestId,
      host,
      ownerId,
      error: error.message,
    })
    return NextResponse.json(
      { message: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }

  const contactIds = contacts?.map((c) => c.id) ?? []
  let messagesMap = new Map<number, Conversa['last_message']>()

  if (contactIds.length) {
    const { data: msgs } = await supabaseAdmin
      .from('last_messages_by_contact')
      .select('contact_id, body, direction, created_at')
      .eq('owner_id', ownerId)
      .in('contact_id', contactIds)

    if (msgs) {
      for (const msg of msgs) {
        if (!msg.body || !String(msg.body).trim()) continue
        messagesMap.set(msg.contact_id, {
          body: msg.body,
          direction: msg.direction as 'in' | 'out',
          created_at: msg.created_at,
        })
      }
    }
  }

  const conversas: Conversa[] =
    contacts?.map((c) => ({
      ...c,
      last_message: messagesMap.get(c.id) ?? null,
    })) ?? []

  logInfo('atendimento/conversas ok', {
    tag: 'api/atendimento/conversas',
    requestId,
    host,
    ownerId,
    count: conversas.length,
  })

  return NextResponse.json({ conversas }, { status: 200, headers: noStoreHeaders })
}

export async function DELETE(req: NextRequest) {
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

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json(
      { message: 'Informe phone.' },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id')
    .eq('phone', phone)
    .eq('owner_id', ownerId)
    .single()

  if (contactError || !contact) {
    logWarn('atendimento/conversas contact_not_found', {
      tag: 'api/atendimento/conversas',
      requestId,
      host,
      ownerId,
      userId: user?.id ?? null,
      resourceId: null,
      phone,
      status: 'not_found',
      error: contactError?.message,
    })
    return NextResponse.json(
      { message: 'Contato não encontrado.' },
      { status: 404, headers: noStoreHeaders }
    )
  }

  const { error: deleteMsgError } = await db
    .from('messages')
    .delete()
    .eq('contact_id', contact.id)
    .eq('owner_id', ownerId)

  if (deleteMsgError) {
    logError('atendimento/conversas delete_messages_error', {
      tag: 'api/atendimento/conversas',
      requestId,
      host,
      ownerId,
      userId: user?.id ?? null,
      resourceId: contact.id,
      phone,
      status: 'error',
      error: deleteMsgError.message,
    })
    return NextResponse.json(
      { message: deleteMsgError.message },
      { status: 500, headers: noStoreHeaders }
    )
  }

  const { error: deleteContactError } = await db
    .from('contacts')
    .delete()
    .eq('id', contact.id)
    .eq('owner_id', ownerId)

  if (deleteContactError) {
    logError('atendimento/conversas delete_contact_error', {
      tag: 'api/atendimento/conversas',
      requestId,
      host,
      ownerId,
      userId: user?.id ?? null,
      resourceId: contact.id,
      phone,
      status: 'error',
      error: deleteContactError.message,
    })
    return NextResponse.json(
      { message: deleteContactError.message },
      { status: 500, headers: noStoreHeaders }
    )
  }

  logInfo('atendimento/conversas deleted', {
    tag: 'api/atendimento/conversas',
    requestId,
    host,
    ownerId,
    userId: user?.id ?? null,
    resourceId: contact.id,
    phone,
    status: 'success',
  })

  return NextResponse.json({ ok: true }, { status: 200, headers: noStoreHeaders })
}
