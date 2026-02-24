"use client"

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CalendarDays,
  Image as ImageIcon,
  Mail,
  MailOpen,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Video,
  X,
} from 'lucide-react'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type Conversa = {
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
  metadata_updated_at?: string | null
  photo_updated_at?: string | null
  presence_status?: string | null
  presence_updated_at?: string | null
  chat_unread?: boolean | null
  last_message?: {
    body: string
    direction: 'in' | 'out'
    created_at: string
  } | null
}

export type Message = {
  id: number
  contact_id: number
  body: string
  direction: 'in' | 'out'
  status: string | null
  created_at: string
  provider_message_id?: string | null
  edited_at?: string | null
  deleted_at?: string | null
  media?: MessageMedia | null
}

export type MessageMedia = {
  type: 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'contact' | 'location'
  url?: string | null
  thumbnailUrl?: string | null
  mimeType?: string | null
  fileName?: string | null
  caption?: string | null
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  name?: string | null
}

type Props = {
  initialConversas: Conversa[]
  initialMessagesByPhone: Record<string, Message[]>
}

const CONVERSAS_PAGE_SIZE = 20
const MESSAGES_PAGE_SIZE = 20
const POLL_INTERVAL_MS = 8000

const formatPhone = (phone: string) => {
  if (!phone.startsWith('55')) return phone
  const digits = phone.slice(2)
  if (digits.length === 11) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `+${phone}`
}

const normalizePhoneToBR = (phone?: string | null): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

const getInitials = (name: string | null, phone: string) => {
  const cleaned = (name ?? '').trim()
  if (cleaned) {
    const parts = cleaned.split(' ').filter(Boolean)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
    return `${first}${last}`.toUpperCase()
  }
  const digits = phone.replace(/\D/g, '')
  return digits.slice(-2) || 'RL'
}

const formatConversationTime = (value: string | null | undefined) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const formatLastActive = (value: string | null | undefined) => {
  if (!value) return 'Sem atividade recente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem atividade recente'
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 5) return 'Ativo agora'
  if (diffMinutes < 60) return `Ativo há ${diffMinutes} min`
  if (diffMinutes < 24 * 60) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }
  return `Último contato em ${date.toLocaleDateString('pt-BR')}`
}

const formatPresenceLabel = (
  status?: string | null,
  updatedAt?: string | null
): { label: string; tone: 'online' | 'typing' | 'recording' } | null => {
  if (!status || !updatedAt) return null
  const updated = new Date(updatedAt)
  if (Number.isNaN(updated.getTime())) return null
  const diffSeconds = (Date.now() - updated.getTime()) / 1000
  if (diffSeconds > 90) return null

  const normalized = status.trim().toUpperCase()
  if (normalized === 'AVAILABLE') {
    return { label: 'Online', tone: 'online' }
  }
  if (normalized === 'COMPOSING') {
    return { label: 'Digitando...', tone: 'typing' }
  }
  if (normalized === 'RECORDING') {
    return { label: 'Gravando áudio...', tone: 'recording' }
  }
  return null
}

const formatMessageStatus = (value?: string | null) => {
  if (!value) return ''
  const normalized = value.trim().toUpperCase()
  const map: Record<string, string> = {
    SENT: 'Enviada',
    RECEIVED: 'Entregue',
    READ: 'Lida',
    READ_BY_ME: 'Lida por você',
    PLAYED: 'Ouvida',
    DELETED: 'Apagada',
  }
  return map[normalized] ?? value
}

const MAX_ATTACHMENT_SIZE_MB = 8

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64 = result.split(',')[1] || ''
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const inferAttachmentKind = (file: File) => {
  const mimeType = file.type
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}

const renderMedia = (
  media: MessageMedia | null | undefined,
  onOpenImage?: (src: string, label: string) => void
) => {
  if (!media) return null
  const label = media.fileName || media.mimeType || media.name || 'Anexo'

  if (media.type === 'image' && (media.url || media.thumbnailUrl)) {
    const src = media.url || media.thumbnailUrl || ''
    return (
      <button
        type="button"
        onClick={() => {
          if (src && onOpenImage) onOpenImage(src, label)
        }}
        className="mt-2 block w-full text-left"
      >
        <img
          src={src}
          alt={label}
          className="max-h-64 w-full cursor-zoom-in rounded-xl bg-card object-contain ring-1 ring-border/70"
          loading="lazy"
        />
      </button>
    )
  }
  if (media.type === 'video' && media.url) {
    return <video className="mt-2 w-full rounded-xl ring-1 ring-border/70" controls src={media.url} />
  }
  if (media.type === 'audio' && media.url) {
    return <audio className="mt-2 w-full" controls src={media.url} />
  }
  if (media.type === 'document' && media.url) {
    return (
      <a
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/70 hover:bg-muted/40"
        href={media.url}
        target="_blank"
        rel="noreferrer"
      >
        Baixar {label}
      </a>
    )
  }
  if (media.type === 'location' && (media.latitude || media.longitude)) {
    return (
      <div className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/70">
        Localização: {media.latitude}, {media.longitude}
      </div>
    )
  }
  if (media.url) {
    return (
      <a
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/70 hover:bg-muted/40"
        href={media.url}
        target="_blank"
        rel="noreferrer"
      >
        Abrir anexo
      </a>
    )
  }
  return (
    <div className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/70">
      Anexo: {label}
    </div>
  )
}

export default function AtendimentoClient({ initialConversas, initialMessagesByPhone }: Props) {
  const initialActivePhone = initialConversas[0]?.phone ?? null
  const initialActiveMessages = initialActivePhone
    ? initialMessagesByPhone[initialActivePhone] || []
    : []
  const [conversas, setConversas] = useState<Conversa[]>(initialConversas)
  const [loadingConversas, setLoadingConversas] = useState(false)
  const [loadingMoreConversas, setLoadingMoreConversas] = useState(false)
  const [hasMoreConversas, setHasMoreConversas] = useState(
    initialConversas.length === CONVERSAS_PAGE_SIZE
  )
  const [conversasOffset, setConversasOffset] = useState(initialConversas.length)
  const [searchTerm, setSearchTerm] = useState('')
  const [activePhone, setActivePhone] = useState<string | null>(initialActivePhone)
  const [messages, setMessages] = useState<Message[]>(initialActiveMessages)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(
    initialActiveMessages.length === MESSAGES_PAGE_SIZE
  )
  const [oldestMessageAt, setOldestMessageAt] = useState<string | null>(
    initialActiveMessages[0]?.created_at ?? null
  )
  const [loadingContactMeta, setLoadingContactMeta] = useState(false)
  const [composer, setComposer] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [polling, setPolling] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const activePhoneRef = useRef<string | null>(activePhone)
  const messagesCacheRef = useRef<Record<string, Message[]>>({ ...initialMessagesByPhone })
  const messagesMetaRef = useRef<Record<string, { oldest: string | null; hasMore: boolean }>>(
    initialActivePhone
      ? {
          [initialActivePhone]: {
            oldest: initialActiveMessages[0]?.created_at ?? null,
            hasMore: initialActiveMessages.length === MESSAGES_PAGE_SIZE,
          },
        }
      : {}
  )
  const didInitialMessagesRef = useRef(false)

  const activeConversa = useMemo(
    () => conversas.find((c) => c.phone === activePhone) ?? null,
    [conversas, activePhone]
  )

  const filteredConversas = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return conversas
    return conversas.filter((c) => {
      const name = (c.name ?? '').toLowerCase()
      const phone = c.phone.toLowerCase()
      const lastMessage = (c.last_message?.body ?? '').toLowerCase()
      return name.includes(term) || phone.includes(term) || lastMessage.includes(term)
    })
  }, [conversas, searchTerm])

  const sharedMedia = useMemo(() => {
    return messages
      .map((m) => m.media)
      .filter(
        (media): media is MessageMedia =>
          Boolean(media && media.type === 'image' && (media.thumbnailUrl || media.url))
      )
      .slice(0, 4)
  }, [messages])

  const activeStatusLabel = useMemo(
    () => formatLastActive(activeConversa?.last_message_at),
    [activeConversa?.last_message_at]
  )

  const activePresence = useMemo(
    () =>
      formatPresenceLabel(activeConversa?.presence_status, activeConversa?.presence_updated_at),
    [activeConversa?.presence_status, activeConversa?.presence_updated_at]
  )

  useEffect(() => {
    if (!activePhone) return
    const controller = new AbortController()
    setLoadingContactMeta(true)

    const loadContactMeta = async () => {
      try {
        const resp = await fetch(
          `/api/atendimento/contact?phone=${encodeURIComponent(activePhone)}`,
          { signal: controller.signal }
        )
        if (!resp.ok) return
        const data = await resp.json().catch(() => ({}))
        if (data?.contact) {
          setConversas((prev) =>
            prev.map((c) => (c.phone === activePhone ? { ...c, ...data.contact } : c))
          )
        }
      } catch (err) {
        // ignore abort errors
      } finally {
        setLoadingContactMeta(false)
      }
    }

    loadContactMeta()
    return () => controller.abort()
  }, [activePhone])

  useEffect(() => {
    activePhoneRef.current = activePhone
  }, [activePhone])

  const loadConversas = async (reset = false) => {
    if (reset) {
      setPolling(true)
      setLoadingConversas(true)
    } else {
      setLoadingMoreConversas(true)
    }

    try {
      const offset = reset ? 0 : conversasOffset
      const params = new URLSearchParams({
        limit: String(CONVERSAS_PAGE_SIZE),
        offset: String(offset),
      })
      const resp = await fetch(`/api/atendimento/conversas?${params.toString()}`)
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(data.message || 'Não foi possível carregar as conversas.')
      }
      const nextConversas = data.conversas ?? []

      if (reset) {
        setConversas(nextConversas)
        setConversasOffset(nextConversas.length)
        setHasMoreConversas(nextConversas.length === CONVERSAS_PAGE_SIZE)
        if (!activePhone && nextConversas[0]?.phone) {
          setActivePhone(nextConversas[0].phone)
        }
      } else {
        setConversas((prev) => [...prev, ...nextConversas])
        setConversasOffset((prev) => prev + nextConversas.length)
        setHasMoreConversas(nextConversas.length === CONVERSAS_PAGE_SIZE)
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Não foi possível atualizar as conversas.')
    } finally {
      if (reset) {
        setLoadingConversas(false)
        setPolling(false)
      } else {
        setLoadingMoreConversas(false)
      }
    }
  }

  const refreshConversas = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: String(CONVERSAS_PAGE_SIZE),
        offset: '0',
      })
      const resp = await fetch(`/api/atendimento/conversas?${params.toString()}`)
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) return
      const nextConversas = (data.conversas ?? []) as Conversa[]
      setConversas((prev) => {
        if (nextConversas.length === 0) return prev
        const nextPhones = new Set(nextConversas.map((c) => c.phone))
        const merged = [
          ...nextConversas,
          ...prev.filter((c) => !nextPhones.has(c.phone)),
        ]
        return merged
      })
      setConversasOffset((prev) => Math.max(prev, nextConversas.length))
    } catch (err) {
      // silent refresh
    }
  }, [])

  const loadMoreConversas = async () => {
    if (loadingMoreConversas || !hasMoreConversas) return
    await loadConversas(false)
  }

  useEffect(() => {
    if (initialConversas.length > 0) return
    loadConversas(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activePhone) return
    let intervalId: number | null = null

    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      if (sending || loadingMessages || loadingMoreMessages) return
      await loadMessages(activePhone)
      await refreshConversas()
    }

    tick()
    intervalId = window.setInterval(tick, POLL_INTERVAL_MS)

    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [activePhone, sending, loadingMessages, loadingMoreMessages, refreshConversas])

  const deleteConversa = async (phone: string) => {
    const ok = window.confirm('Excluir conversa e contato?')
    if (!ok) return
    try {
      const resp = await fetch(`/api/atendimento/conversas?phone=${encodeURIComponent(phone)}`, {
        method: 'DELETE',
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'Erro ao excluir conversa')
      setConversas((prev) => prev.filter((item) => item.phone !== phone))
      delete messagesCacheRef.current[phone]
      delete messagesMetaRef.current[phone]
      if (activePhone === phone) {
        setActivePhone(null)
        setMessages([])
        setHasMoreMessages(false)
        setOldestMessageAt(null)
      }
      toast.success('Conversa removida.')
    } catch (err) {
      toast.error((err as Error)?.message || 'Falha ao excluir conversa')
    }
  }

  const loadMessages = async (phone: string | null, opts?: { before?: string; append?: boolean }) => {
    if (!phone) return
    const requestPhone = phone
    const append = Boolean(opts?.append)
    if (append) {
      setLoadingMoreMessages(true)
    } else {
      setLoadingMessages(true)
    }
    try {
      const params = new URLSearchParams({
        phone,
        limit: String(MESSAGES_PAGE_SIZE),
      })
      if (opts?.before) {
        params.set('before', opts.before)
      }
      const resp = await fetch(`/api/atendimento/messages?${params.toString()}`)
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        if (activePhoneRef.current === requestPhone) {
          toast.error(data.message || 'Não foi possível carregar as mensagens.')
        }
        return
      }
      if (activePhoneRef.current !== requestPhone) return
      const received = (data.messages ?? []) as Message[]
      const cleaned = received.filter((m: Message) => (m.body && m.body.trim()) || m.media)
      const ordered = cleaned.slice().reverse()
      const hasMore = received.length === MESSAGES_PAGE_SIZE
      const previousMeta = messagesMetaRef.current[requestPhone]
      const previousOldest = previousMeta?.oldest ?? null
      const nextOldest = ordered[0]?.created_at ?? previousOldest

      if (append) {
        setMessages((prev) => {
          const merged = [...ordered, ...prev]
          messagesCacheRef.current[requestPhone] = merged
          return merged
        })
      } else {
        messagesCacheRef.current[requestPhone] = ordered
        setMessages(ordered)
      }

      messagesMetaRef.current[requestPhone] = {
        oldest: nextOldest ?? null,
        hasMore,
      }
      setOldestMessageAt(nextOldest ?? null)
      setHasMoreMessages(hasMore)
    } finally {
      if (append) {
        setLoadingMoreMessages(false)
      } else {
        setLoadingMessages(false)
      }
    }
  }

  const loadMoreMessages = async () => {
    if (!activePhone || !hasMoreMessages || loadingMoreMessages) return
    if (!oldestMessageAt) return
    await loadMessages(activePhone, { before: oldestMessageAt, append: true })
  }

  useEffect(() => {
    if (activePhone) {
      const cached = messagesCacheRef.current[activePhone]
      setMessages(cached ?? [])
      const meta = messagesMetaRef.current[activePhone]
      const derivedOldest = cached?.[0]?.created_at ?? null
      const derivedHasMore = cached ? cached.length === MESSAGES_PAGE_SIZE : false
      setOldestMessageAt(meta?.oldest ?? derivedOldest)
      setHasMoreMessages(meta?.hasMore ?? derivedHasMore)
      if (!meta && cached) {
        messagesMetaRef.current[activePhone] = {
          oldest: derivedOldest,
          hasMore: derivedHasMore,
        }
      }
      if (!didInitialMessagesRef.current) {
        didInitialMessagesRef.current = true
        if (cached && cached.length > 0) return
      }
      loadMessages(activePhone)
    }
  }, [activePhone]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (attachment && attachment.type.startsWith('image/')) {
      const url = URL.createObjectURL(attachment)
      setAttachmentPreview(url)
      return () => URL.revokeObjectURL(url)
    }
    setAttachmentPreview(null)
    return undefined
  }, [attachment])

  useEffect(() => {
    if (!lightbox) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightbox(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  const sendMessage = async () => {
    if (!activePhone) return
    if (sending) return
    const trimmed = composer.trim()
    if (!trimmed && !attachment) {
      toast.error('Digite uma mensagem ou selecione um anexo.')
      return
    }
    if (attachmentError && !attachment && !trimmed) {
      toast.error(attachmentError)
      return
    }
    setSending(true)
    try {
      let attachmentPayload: {
        data: string
        mimeType?: string | null
        fileName?: string | null
        kind?: 'image' | 'audio' | 'video' | 'document'
      } | null = null

      if (attachment) {
        const base64 = await fileToBase64(attachment)
        attachmentPayload = {
          data: base64,
          mimeType: attachment.type || null,
          fileName: attachment.name || null,
          kind: inferAttachmentKind(attachment),
        }
      }

      const resp = await fetch('/api/atendimento/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: [activePhone],
          message: trimmed || undefined,
          force: true,
          template: 'reply',
          attachment: attachmentPayload ?? undefined,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'Erro ao enviar')
      const result = Array.isArray(data?.results)
        ? data.results.find((r: any) => normalizePhoneToBR(r.phone) === activePhone)
        : null
      if (result?.status === 'failed') {
        throw new Error(result.error || 'Erro ao enviar')
      }
      setComposer('')
      setAttachment(null)
      setAttachmentError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadMessages(activePhone)
      await loadConversas(true)
      toast.success('Mensagem enviada.')
    } catch (err) {
      toast.error((err as Error)?.message || 'Falha ao enviar')
    } finally {
      setSending(false)
    }
  }

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setAttachment(null)
      setAttachmentError(null)
      return
    }
    const sizeMb = file.size / (1024 * 1024)
    if (sizeMb > MAX_ATTACHMENT_SIZE_MB) {
      setAttachment(null)
      setAttachmentError(
        `O anexo tem ${formatBytes(file.size)}. Limite atual: ${MAX_ATTACHMENT_SIZE_MB} MB.`
      )
      return
    }
    setAttachment(file)
    setAttachmentError(null)
  }

  const runChatAction = async (action: 'read' | 'unread' | 'clear') => {
    if (!activeConversa?.phone) return
    if (action === 'clear') {
      const ok = window.confirm('Tem certeza que deseja limpar a conversa?')
      if (!ok) return
    }
    try {
      const resp = await fetch('/api/atendimento/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activeConversa.phone, action }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data.message || 'Falha ao atualizar conversa')

      if (action === 'clear') {
        setMessages([])
        messagesCacheRef.current[activeConversa.phone] = []
        messagesMetaRef.current[activeConversa.phone] = { oldest: null, hasMore: false }
        setHasMoreMessages(false)
        setOldestMessageAt(null)
        setConversas((prev) =>
          prev.map((c) =>
            c.phone === activeConversa.phone
              ? { ...c, last_message: null, last_message_at: null, chat_unread: false }
              : c
          )
        )
        toast.success('Conversa limpa.')
      }

      if (action === 'read') {
        setConversas((prev) =>
          prev.map((c) =>
            c.phone === activeConversa.phone ? { ...c, chat_unread: false } : c
          )
        )
        toast.success('Conversa marcada como lida.')
      }

      if (action === 'unread') {
        setConversas((prev) =>
          prev.map((c) =>
            c.phone === activeConversa.phone ? { ...c, chat_unread: true } : c
          )
        )
        toast.success('Conversa marcada como não lida.')
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Falha ao atualizar conversa')
    }
  }

  const deleteMessageItem = async (message: Message) => {
    if (!activeConversa?.phone) return
    if (!message.provider_message_id) {
      toast.error('Mensagem sem identificador para exclusão.')
      return
    }
    const ok = window.confirm('Excluir esta mensagem?')
    if (!ok) return

    try {
      const resp = await fetch('/api/atendimento/message', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeConversa.phone,
          messageId: message.provider_message_id,
          owner: message.direction === 'out',
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data.message || 'Erro ao excluir mensagem')

      const deletedAt = new Date().toISOString()
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                body: '[mensagem apagada]',
                media: null,
                status: 'deleted',
                deleted_at: deletedAt,
              }
            : m
        )
      )
      if (activeConversa.phone) {
        messagesCacheRef.current[activeConversa.phone] = (messagesCacheRef.current[
          activeConversa.phone
        ] || []).map((m) =>
          m.id === message.id
            ? {
                ...m,
                body: '[mensagem apagada]',
                media: null,
                status: 'deleted',
                deleted_at: deletedAt,
              }
            : m
        )
      }
    } catch (err) {
      toast.error((err as Error)?.message || 'Falha ao excluir mensagem')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atendimento"
        description="Acompanhe conversas, envie mensagens e organize o histórico com seus clientes."
      />
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <section className="panel-card flex min-h-[520px] flex-col p-4 lg:h-[calc(100vh-12rem)] lg:min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  RL
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">Equipe Radar</p>
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Disponível
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => loadConversas(true)}>
                <RefreshCw className={cn('h-4 w-4', polling && 'animate-spin')} />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="h-10 pl-9"
              />
            </div>
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
            {!loadingConversas && filteredConversas.length === 0 && (
              <EmptyState
                icon={MessageCircle}
                title="Nenhuma conversa ainda"
                description="Assim que um contato responder, ele aparece nesta lista."
                className="mt-6"
              />
            )}
            {filteredConversas.map((c) => {
              const active = activePhone === c.phone
              const presence = formatPresenceLabel(
                c.presence_status,
                c.presence_updated_at
              )
              const timeLabel =
                c.last_message?.created_at || c.last_message_at
                  ? formatConversationTime(c.last_message?.created_at ?? c.last_message_at)
                  : ''
              const preview =
                presence?.label ||
                c.last_message?.body?.trim() ||
                (c.last_message ? '' : 'Sem mensagens ainda')
              const showPrefix = !presence && c.last_message?.direction === 'out'
              return (
                <div key={c.id} className="group relative mb-2">
                  <button
                    type="button"
                    onClick={() => setActivePhone(c.phone)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left transition',
                      active
                        ? 'border-primary/30 bg-primary text-primary-foreground shadow-card'
                        : 'border-transparent hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {c.photo_url && (
                          <AvatarImage src={c.photo_url} alt={c.name ?? 'Contato'} />
                        )}
                        <AvatarFallback
                          className={cn(
                            'text-xs font-semibold',
                            active ? 'bg-white/15 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {getInitials(c.name, c.phone)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              'truncate text-sm font-semibold',
                              active ? 'text-primary-foreground' : 'text-foreground'
                            )}
                          >
                            {c.name || 'Contato sem nome'}
                          </p>
                          {c.chat_unread && !active && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                          {timeLabel && (
                            <span
                              className={cn(
                                'text-xs',
                                active ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}
                            >
                              {timeLabel}
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            'line-clamp-1 text-xs',
                            presence
                              ? active
                                ? 'text-primary-foreground/80'
                                : 'text-emerald-600'
                              : active
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                          )}
                        >
                          {showPrefix ? 'Você: ' : ''}
                          {preview || formatPhone(c.phone)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      {c.is_whatsapp && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            active
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-emerald-50 text-emerald-600'
                          )}
                        >
                          WhatsApp
                        </span>
                      )}
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7 text-muted-foreground opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    onClick={() => deleteConversa(c.phone)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
            {hasMoreConversas && searchTerm.trim().length === 0 && (
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMoreConversas}
                  onClick={loadMoreConversas}
                >
                  {loadingMoreConversas ? 'Carregando...' : 'Carregar mais conversas'}
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="panel-card flex min-h-[520px] flex-col p-4 lg:h-[calc(100vh-12rem)] lg:min-h-0">
          {activeConversa ? (
            <>
              <header className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    {activeConversa.photo_url && (
                      <AvatarImage
                        src={activeConversa.photo_url}
                        alt={activeConversa.name ?? 'Contato'}
                      />
                    )}
                    <AvatarFallback className="bg-foreground text-sm font-semibold text-background">
                      {getInitials(activeConversa.name, activeConversa.phone)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {activeConversa.name || 'Contato sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activePresence?.label ?? activeStatusLabel}
                      {loadingContactMeta && <span className="ml-2 text-[10px]">Atualizando...</span>}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatPhone(activeConversa.phone)}</span>
                      {activeConversa.is_whatsapp && <span>• WhatsApp</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => runChatAction('read')}>
                    <MailOpen className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => runChatAction('unread')}>
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-600"
                    onClick={() => runChatAction('clear')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              <div className="mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto rounded-2xl bg-muted/40 p-4">
                {hasMoreMessages && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingMoreMessages}
                      onClick={loadMoreMessages}
                    >
                      {loadingMoreMessages ? 'Carregando...' : 'Carregar mensagens anteriores'}
                    </Button>
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <EmptyState
                    icon={AlertTriangle}
                    title="Sem mensagens"
                    description="Essa conversa ainda não teve mensagens registradas."
                  />
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'flex items-end gap-2',
                      m.direction === 'out' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {m.direction === 'in' && (
                      <Avatar className="h-7 w-7">
                        {activeConversa.photo_url && (
                          <AvatarImage
                            src={activeConversa.photo_url}
                            alt={activeConversa.name ?? 'Contato'}
                          />
                        )}
                        <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                          {getInitials(activeConversa.name, activeConversa.phone)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'group relative max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-card',
                        m.direction === 'out'
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border/60 bg-card text-foreground'
                      )}
                    >
                      {m.provider_message_id && (
                        <button
                          type="button"
                          onClick={() => deleteMessageItem(m)}
                          className={cn(
                            'absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:text-red-600 group-hover:inline-flex',
                            m.direction === 'out' && 'bg-primary text-primary-foreground'
                          )}
                          aria-label="Excluir mensagem"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}

                      {m.deleted_at ? (
                        <p className="italic text-muted-foreground">Mensagem apagada</p>
                      ) : (
                        <>
                          {m.body && <p className="whitespace-pre-line leading-snug">{m.body}</p>}
                          {renderMedia(m.media, (src, label) => setLightbox({ src, label }))}
                        </>
                      )}
                      <p
                        className={cn(
                          'mt-2 text-[10px]',
                          m.direction === 'out'
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {new Date(m.created_at).toLocaleString('pt-BR')}
                        {m.direction === 'out' && (
                          <>
                            {m.deleted_at
                              ? ' • Apagada'
                              : m.status && ` • ${formatMessageStatus(m.status)}`}
                          </>
                        )}
                        {m.edited_at && !m.deleted_at && <span> • Editada</span>}
                      </p>
                    </div>
                    {m.direction === 'out' && (
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                          EU
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-border/60 bg-card p-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-end gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/60">
                      <Paperclip className="h-3 w-3" />
                      Anexar
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                        onChange={handleAttachmentChange}
                      />
                    </label>
                    <Textarea
                      className="min-h-[70px] flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                      placeholder="Digite sua resposta..."
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      disabled={sending || (!composer.trim() && !attachment)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  {attachment && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/60">
                      <div className="flex items-center gap-2">
                        {attachmentPreview ? (
                          <img
                            src={attachmentPreview}
                            alt={attachment.name}
                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-border/60"
                          />
                        ) : (
                          <span className="rounded-full bg-card px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-border/60">
                            Anexo
                          </span>
                        )}
                        <span className="font-semibold text-foreground">{attachment.name}</span>
                        <span className="text-muted-foreground">{formatBytes(attachment.size)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setAttachment(null)
                          setAttachmentError(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  )}
                  {attachmentError && <p className="text-xs text-red-600">{attachmentError}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>Enter para enviar • Shift+Enter para nova linha</span>
                    {sending && <span>Enviando...</span>}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={ImageIcon}
                title="Selecione uma conversa"
                description="Escolha um contato na coluna à esquerda para abrir o histórico."
              />
            </div>
          )}
        </section>

        <aside className="panel-card hidden min-h-[520px] flex-col p-4 lg:h-[calc(100vh-12rem)] lg:min-h-0 xl:flex">
          {activeConversa ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Sobre</h3>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 flex flex-col items-center text-center">
                <Avatar className="h-20 w-20">
                  {activeConversa.photo_url && (
                    <AvatarImage
                      src={activeConversa.photo_url}
                      alt={activeConversa.name ?? 'Contato'}
                    />
                  )}
                  <AvatarFallback className="bg-foreground text-lg font-semibold text-background">
                    {getInitials(activeConversa.name, activeConversa.phone)}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-3 text-base font-semibold text-foreground">
                  {activeConversa.name || 'Contato sem nome'}
                </p>
                <p className="text-xs text-muted-foreground">Contato</p>
              </div>

              <div className="mt-5 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </div>
                  <span className="font-medium text-foreground">
                    {formatPhone(activeConversa.phone)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    Canal
                  </div>
                  <span className="font-medium text-foreground">
                    {activeConversa.is_whatsapp ? 'WhatsApp' : 'Mensagem'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Último contato
                  </div>
                  <span className="font-medium text-foreground">
                    {activeConversa.last_message_at
                      ? new Date(activeConversa.last_message_at).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
                {activeConversa.notify && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      Nome WhatsApp
                    </div>
                    <span className="font-medium text-foreground">{activeConversa.notify}</span>
                  </div>
                )}
                {activeConversa.short && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      Short
                    </div>
                    <span className="font-medium text-foreground">{activeConversa.short}</span>
                  </div>
                )}
                {activeConversa.vname && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      Nome salvo
                    </div>
                    <span className="font-medium text-foreground">{activeConversa.vname}</span>
                  </div>
                )}
                {activeConversa.about && (
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Recado
                    </span>
                    <p className="mt-1 text-sm text-foreground">{activeConversa.about}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-foreground">Arquivos compartilhados</p>
                {sharedMedia.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {sharedMedia.map((media, idx) => {
                      const src = media.thumbnailUrl || media.url || ''
                      const label = media.fileName || media.mimeType || 'Imagem'
                      return (
                        <button
                          key={`${src}-${idx}`}
                          type="button"
                          className="overflow-hidden rounded-xl border border-border/60 bg-card"
                          onClick={() => {
                            if (src) setLightbox({ src, label })
                          }}
                        >
                          <img src={src} alt={label} className="h-24 w-full object-cover" />
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nenhuma mídia compartilhada até agora.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Selecione uma conversa para ver os detalhes.
            </div>
          )}
        </aside>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-4 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg font-semibold text-muted-foreground shadow-lg"
              aria-label="Fechar imagem"
            >
              ×
            </button>
            <img
              src={lightbox.src}
              alt={lightbox.label}
              className="max-h-[90vh] w-full rounded-2xl bg-card object-contain ring-1 ring-border/60"
            />
            <p className="mt-2 text-center text-xs text-white/80">{lightbox.label}</p>
          </div>
        </div>
      )}
    </div>
  )
}
