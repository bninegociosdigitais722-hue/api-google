type ZapiBatchResponse = {
  exists: boolean
  inputPhone: string
  lid?: string | null
}
type SendTextResponse = {
  messageId?: string
  status?: string
  detail?: string
}

type ZapiConfig = {
  instanceId: string
  token: string
  clientToken: string
}

type ZapiProfilePictureResponse = {
  link?: string | null
}

const ensureEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`)
  }
  return value
}

export const hasZapiConfig = () =>
  Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN && process.env.ZAPI_CLIENT_TOKEN)

const getZapiConfig = (): ZapiConfig => ({
  instanceId: ensureEnv('ZAPI_INSTANCE_ID'),
  token: ensureEnv('ZAPI_TOKEN'),
  clientToken: ensureEnv('ZAPI_CLIENT_TOKEN'),
})

const zapiGet = async <T>(path: string): Promise<T> => {
  const { instanceId, token, clientToken } = getZapiConfig()
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/${path}`

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken,
    },
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Z-API respondeu ${resp.status}: ${text || resp.statusText}`)
  }

  return (await resp.json()) as T
}

const zapiPost = async <T>(path: string, payload: Record<string, any>): Promise<T> => {
  const { instanceId, token, clientToken } = getZapiConfig()
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/${path}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken,
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Z-API respondeu ${resp.status}: ${text || resp.statusText}`)
  }

  return (await resp.json()) as T
}

export const normalizePhoneToBR = (phone?: string | null): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Adiciona DDI 55 se não estiver presente.
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

export const getContactProfilePicture = async (phone?: string | null): Promise<string | null> => {
  const normalized = normalizePhoneToBR(phone)
  if (!normalized) return null
  if (!hasZapiConfig()) return null

  const data = await zapiGet<ZapiProfilePictureResponse[]>(
    `profile-picture?phone=${encodeURIComponent(normalized)}`
  )
  const link = Array.isArray(data) ? data[0]?.link : null
  return link ?? null
}

export const phoneExistsBatch = async (phones: string[]): Promise<Map<string, boolean>> => {
  if (phones.length === 0) return new Map()

  const { instanceId, token, clientToken } = getZapiConfig()

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

export const sendText = async (phone: string, message: string): Promise<SendTextResponse> => {
  return zapiPost<SendTextResponse>('send-text', { phone, message })
}

export const sendImage = async (
  phone: string,
  image: string,
  caption?: string | null
): Promise<SendTextResponse> => {
  const payload: Record<string, any> = { phone, image }
  if (caption) payload.caption = caption
  return zapiPost<SendTextResponse>('send-image', payload)
}

export const sendDocument = async (
  phone: string,
  document: string,
  extension: string,
  fileName?: string | null
): Promise<SendTextResponse> => {
  const payload: Record<string, any> = { phone, document }
  if (fileName) payload.fileName = fileName
  return zapiPost<SendTextResponse>(`send-document/${extension}`, payload)
}

export const sendAudio = async (phone: string, audio: string): Promise<SendTextResponse> =>
  zapiPost<SendTextResponse>('send-audio', { phone, audio })

export const sendVideo = async (
  phone: string,
  video: string,
  caption?: string | null
): Promise<SendTextResponse> => {
  const payload: Record<string, any> = { phone, video }
  if (caption) payload.caption = caption
  return zapiPost<SendTextResponse>('send-video', payload)
}
