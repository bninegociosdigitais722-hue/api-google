import type { NextApiRequest, NextApiResponse } from 'next'
import supabase from '../../../lib/supabase'
import { normalizePhoneToBR, sendText } from '../../../lib/zapi'

type BodyPayload = {
  phones?: string[]
  message?: string
  name?: string | null
}

type SendResult = { phone: string; status: 'sent' | 'failed'; error?: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ results: SendResult[] } | { message: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ message: 'Método não permitido.' })
  }

  const { phones = [], message, name }: BodyPayload = req.body || {}

  if (!Array.isArray(phones) || phones.length === 0 || !message?.trim()) {
    return res
      .status(400)
      .json({ message: 'Envie um array de telefones e uma mensagem.' })
  }

  const normalizedPhones = phones
    .map((p) => normalizePhoneToBR(p))
    .filter((p): p is string => Boolean(p))

  if (normalizedPhones.length === 0) {
    return res.status(400).json({ message: 'Nenhum telefone válido após normalização.' })
  }

  const ensureContact = async (phone: string) => {
    const { data, error } = await supabase
      .from('contacts')
      .upsert(
        { phone, name: name ?? null, is_whatsapp: true, last_message_at: new Date().toISOString() },
        { onConflict: 'phone' }
      )
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(error?.message || 'Erro ao salvar contato')
    }
    return data.id as number
  }

  const results: SendResult[] = []

  for (const phone of normalizedPhones) {
    try {
      const contactId = await ensureContact(phone)
      const resp = await sendText(phone, message.trim())

      await supabase.from('messages').insert({
        contact_id: contactId,
        direction: 'out',
        body: message.trim(),
        status: 'sent',
        provider_message_id: resp.messageId ?? null,
      })

      await supabase
        .from('contacts')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', contactId)

      results.push({ phone, status: 'sent' })
    } catch (err) {
      results.push({
        phone,
        status: 'failed',
        error: (err as Error)?.message || 'Falha ao enviar',
      })
    }
  }

  return res.status(200).json({ results })
}
