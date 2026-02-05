type ZapiBatchResponse = {
  exists: boolean
  inputPhone: string
  lid?: string | null
}

const ensureEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`)
  }
  return value
}

export const normalizePhoneToBR = (phone?: string | null): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Adiciona DDI 55 se não estiver presente.
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

export const phoneExistsBatch = async (phones: string[]): Promise<Map<string, boolean>> => {
  if (phones.length === 0) return new Map()

  const instanceId = ensureEnv('ZAPI_INSTANCE_ID')
  const token = ensureEnv('ZAPI_TOKEN')
  const clientToken = ensureEnv('ZAPI_CLIENT_TOKEN')

  const unique = Array.from(new Set(phones))

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/phone-exists-batch`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken,
    },
    body: JSON.stringify({ phones: unique }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Z-API respondeu ${response.status}: ${text || response.statusText}`)
  }

  const data: ZapiBatchResponse[] = await response.json()
  const map = new Map<string, boolean>()
  data.forEach((entry) => {
    map.set(entry.inputPhone, Boolean(entry.exists))
  })
  return map
}
