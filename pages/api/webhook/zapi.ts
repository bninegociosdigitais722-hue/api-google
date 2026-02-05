import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '../../../lib/supabase'
import { normalizePhoneToBR } from '../../../lib/zapi'

type ZapiIncoming = {
  phone?: string
  from?: string
  remoteJid?: string
  pushName?: string
  message?: {
    id?: string
    from?: string
    phone?: string
    body?: string
    text?: string
  }
  body?: string
  text?: string
}

const extractPhone = (payload: ZapiIncoming): string | null => {
  const candidates = [
    payload.phone,
    payload.from,
    payload.remoteJid,
    payload.message?.phone,
    payload.message?.from,
  ].filter(Boolean) as string[]

  for (const cand of candidates) {
    const digits = cand.replace(/\\D/g, '')
    if (digits.length >= 10) {
      const normalized = normalizePhoneToBR(digits)
      if (normalized) return normalized
    }
  }
  return null
}

const extractBody = (payload: ZapiIncoming): string => {
  return (
    payload.message?.body ||
    payload.message?.text ||
    payload.body ||
    payload.text ||
    '[mensagem sem texto]'
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Método não permitido.' })
  }

  const payload = (req.body || {}) as ZapiIncoming
  const phone = extractPhone(payload)

  if (!phone) {
    return res.status(400).json({ message: 'Telefone não identificado no payload.' })
  }

  const body = extractBody(payload)
  const contactName = payload.pushName || null

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert(
      { phone, name: contactName, is_whatsapp: true, last_message_at: new Date().toISOString() },
      { onConflict: 'phone' }
    )
    .select('id')
    .single()

  if (contactError || !contact) {
    return res.status(500).json({ message: contactError?.message || 'Erro ao salvar contato.' })
  }

  await supabase.from('messages').insert({
    contact_id: contact.id,
    direction: 'in',
    body,
    status: 'received',
    provider_message_id: payload.message?.id ?? null,
  })

  await supabase
    .from('contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contact.id)

  return res.status(200).json({ ok: true })
}
