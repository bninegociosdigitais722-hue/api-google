import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { normalizePhoneToBR } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logInfo, logWarn, resolveRequestId } from '../../../../lib/logger'

type Message = {
  id: number
  contact_id: number
  body: string
  direction: 'in' | 'out'
  status: string | null
  created_at: string
}

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const requestId = resolveRequestId(req.headers)
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json({ message: 'Informe phone.' }, { status: 400 })
  }

  const normalized = normalizePhoneToBR(phone)
  if (!normalized) {
    return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 })
  }

  const { data: contact, error: contactError } = await db
    .from('contacts')
    .select('id, phone, name')
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
    return NextResponse.json({ message: 'Contato não encontrado.' }, { status: 404 })
  }

  const { data: messages, error } = await db
    .from('messages')
    .select('id, contact_id, body, direction, status, created_at')
    .eq('contact_id', contact.id)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })

  if (error) {
    logError('atendimento/messages list_error', {
      tag: 'api/atendimento/messages',
      requestId,
      host,
      ownerId,
      contactId: contact.id,
      error: error.message,
    })
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  logInfo('atendimento/messages ok', {
    tag: 'api/atendimento/messages',
    requestId,
    host,
    ownerId,
    contactId: contact.id,
    count: messages?.length ?? 0,
  })

  return NextResponse.json({ messages: messages ?? [], contact }, { status: 200 })
}
