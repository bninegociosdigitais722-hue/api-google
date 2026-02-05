import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '../../../lib/supabase'
import { normalizePhoneToBR } from '../../../lib/zapi'

type Message = {
  id: number
  contact_id: number
  body: string
  direction: 'in' | 'out'
  status: string | null
  created_at: string
}

type ResponseData = {
  messages: Message[]
  contact?: { id: number; phone: string; name: string | null }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | { message: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ message: 'Método não permitido.' })
  }

  const { phone } = req.query
  if (!phone || Array.isArray(phone)) {
    return res.status(400).json({ message: 'Informe phone.' })
  }

  const normalized = normalizePhoneToBR(phone)
  if (!normalized) {
    return res.status(400).json({ message: 'Telefone inválido.' })
  }

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('id, phone, name')
    .eq('phone', normalized)
    .single()

  if (contactError || !contact) {
    return res.status(404).json({ message: 'Contato não encontrado.' })
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, contact_id, body, direction, status, created_at')
    .eq('contact_id', contact.id)
    .order('created_at', { ascending: true })

  if (error) {
    return res.status(500).json({ message: error.message })
  }

  return res.status(200).json({ messages: messages ?? [], contact })
}
