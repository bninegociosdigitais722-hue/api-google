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

export type ZapiContactMetadata = {
  phone?: string | null
  name?: string | null
  short?: string | null
  vname?: string | null
  notify?: string | null
  imgUrl?: string | null
  about?: string | null
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

const zapiDelete = async <T>(path: string, payload: Record<string, any>): Promise<T> => {
  const { instanceId, token, clientToken } = getZapiConfig()
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/${path}`

  const resp = await fetch(url, {
    method: 'DELETE',
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

  return (await resp.json().catch(() => ({}))) as T
}

export const normalizePhoneToBR = (phone?: string | null): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Adiciona DDI 55 se não estiver presente.
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

const parseProfilePictureLink = (data: unknown): string | null => {
  if (Array.isArray(data)) {
    const link = (data[0] as ZapiProfilePictureResponse | undefined)?.link
    return link ?? null
  }
  if (data && typeof data === 'object' && 'link' in (data as any)) {
    return (data as ZapiProfilePictureResponse).link ?? null
  }
  return null
}

const buildPhoneCandidates = (phone?: string | null): string[] => {
  if (!phone) return []
  const digits = phone.replace(/\D/g, '')
  const normalized = normalizePhoneToBR(digits)
  const candidates = new Set<string>()
  if (normalized) candidates.add(normalized)
  if (digits) candidates.add(digits)
  if (normalized && normalized.startsWith('55')) {
    candidates.add(normalized.slice(2))
  }
  return Array.from(candidates)
}

export const getContactProfilePicture = async (phone?: string | null): Promise<string | null> => {
  if (!hasZapiConfig()) return null
  const candidates = buildPhoneCandidates(phone)
  for (const candidate of candidates) {
    const data = await zapiGet<unknown>(
      `profile-picture?phone=${encodeURIComponent(candidate)}`
    ).catch(() => null)
    const link = parseProfilePictureLink(data)
    if (link) return link
  }
  return null
}

export const getContactMetadata = async (
  phone?: string | null
): Promise<ZapiContactMetadata | null> => {
  if (!hasZapiConfig()) return null
  const candidates = buildPhoneCandidates(phone)
  for (const candidate of candidates) {
    const data = await zapiGet<ZapiContactMetadata>(
      `contacts/${encodeURIComponent(candidate)}`
    ).catch(() => null)
    if (data) return data
  }
  return null
}

export const modifyChat = async (
  phone: string,
  action: 'read' | 'unread' | 'clear'
): Promise<{ value?: boolean }> => {
  return zapiPost<{ value?: boolean }>('modify-chat', { phone, action })
}

export const readMessage = async (phone: string, messageId: string): Promise<Record<string, any>> => {
  return zapiPost<Record<string, any>>('read-message', { phone, messageId })
}

export const deleteMessage = async (
  phone: string,
  messageId: string,
  owner: boolean
): Promise<Record<string, any>> => {
  return zapiDelete<Record<string, any>>('messages', { phone, messageId, owner })
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
