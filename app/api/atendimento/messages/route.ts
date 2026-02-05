import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { normalizePhoneToBR } from '../../../../lib/zapi'
import { resolveOwnerId } from '../../../../lib/tenant'

type Message = {
  id: number
  contact_id: number
  body: string
  direction: 'in' | 'out'
  status: string | null
  created_at: string
}

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const ownerId = resolveOwnerId({
    host: req.headers.get('x-forwarded-host') || req.headers.get('host'),
  })

  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) {
    return NextResponse.json({ message: 'Informe phone.' }, { status: 400 })
  }

  const normalized = normalizePhoneToBR(phone)
  if (!normalized) {
    return NextResponse.json({ message: 'Telefone inválido.' }, { status: 400 })
  }

  const { data: contact, error: contactError } = await supabaseAdmin
    .from('contacts')
    .select('id, phone, name')
    .eq('phone', normalized)
    .eq('owner_id', ownerId)
    .single()

  if (contactError || !contact) {
    return NextResponse.json({ message: 'Contato não encontrado.' }, { status: 404 })
  }

  const { data: messages, error } = await supabaseAdmin
    .from('messages')
    .select('id, contact_id, body, direction, status, created_at')
    .eq('contact_id', contact.id)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages ?? [], contact }, { status: 200 })
}
