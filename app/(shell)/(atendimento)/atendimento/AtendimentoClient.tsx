"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Send,
  Trash2,
  X,
} from 'lucide-react'

import EmptyState from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type Conversa = {
  id: number
  phone: string
  name: string | null
  is_whatsapp: boolean | null
  last_message_at: string | null
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
          className="max-h-64 w-full cursor-zoom-in rounded-xl bg-white object-contain ring-1 ring-border/70"
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
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/70 hover:bg-muted/40"
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
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border/70 hover:bg-muted/40"
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
  const [conversas, setConversas] = useState<Conversa[]>(initialConversas)
  const [loadingConversas, setLoadingConversas] = useState(false)
  const [activePhone, setActivePhone] = useState<string | null>(
    initialConversas[0]?.phone ?? null
  )
  const [messages, setMessages] = useState<Message[]>(
    activePhone ? initialMessagesByPhone[activePhone] || [] : []
  )
  const [loadingMessages, setLoadingMessages] = useState(false)
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

  const activeConversa = useMemo(
    () => conversas.find((c) => c.phone === activePhone) ?? null,
    [conversas, activePhone]
  )

  useEffect(() => {
    activePhoneRef.current = activePhone
  }, [activePhone])

  const loadConversas = async () => {
    setPolling(true)
    setLoadingConversas(true)
    try {
      const resp = await fetch('/api/atendimento/conversas')
      const data = await resp.json()
      setConversas(data.conversas ?? [])
      if (!activePhone && data.conversas?.[0]?.phone) {
        setActivePhone(data.conversas[0].phone)
      }
    } catch (err) {
      toast.error('Não foi possível atualizar as conversas.')
    } finally {
      setLoadingConversas(false)
      setPolling(false)
    }
  }

  const loadMessages = async (phone: string | null) => {
    if (!phone) return
    const requestPhone = phone
    setLoadingMessages(true)
    try {
      const resp = await fetch(
        `/api/atendimento/messages?phone=${encodeURIComponent(phone)}&limit=100`
      )
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        if (activePhoneRef.current === requestPhone) {
          toast.error(data.message || 'Não foi possível carregar as mensagens.')
        }
        return
      }
      if (activePhoneRef.current !== requestPhone) return
      const cleaned = (data.messages ?? []).filter(
        (m: Message) => (m.body && m.body.trim()) || m.media
      )
      messagesCacheRef.current[requestPhone] = cleaned
      setMessages(cleaned)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (!conversas.length) {
      loadConversas()
    }
    const interval = setInterval(() => {
      loadConversas()
    }, 5000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activePhone) return
    const interval = setInterval(() => {
      loadMessages(activePhone)
    }, 5000)
    return () => clearInterval(interval)
  }, [activePhone]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activePhone) {
      const cached = messagesCacheRef.current[activePhone]
      setMessages(cached ?? [])
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
      setComposer('')
      setAttachment(null)
      setAttachmentError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await loadMessages(activePhone)
      await loadConversas()
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Conversas</p>
              <h3 className="text-lg font-semibold text-foreground">Últimos contatos</h3>
            </div>
            <div className="flex items-center gap-2">
              {polling && <span className="h-2 w-2 animate-ping rounded-full bg-primary" />}
              <Button variant="outline" size="sm" onClick={loadConversas}>
                <RefreshCw className={cn('h-4 w-4', polling && 'animate-spin')} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0 overflow-y-auto pr-1">
            {!loadingConversas && conversas.length === 0 && (
              <EmptyState
                icon={MessageCircle}
                title="Nenhuma conversa ainda"
                description="Assim que um contato responder, ele aparece nesta lista."
                className="mt-6"
              />
            )}
            {conversas.map((c) => (
              <button
                key={c.id}
                onClick={() => setActivePhone(c.phone)}
                className={cn(
                  'mb-2 w-full rounded-2xl border border-transparent px-3 py-3 text-left transition',
                  activePhone === c.phone
                    ? 'bg-primary/10 text-foreground shadow-soft ring-1 ring-primary/20'
                    : 'hover:bg-muted/60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{c.name || 'Contato sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(c.phone)}</p>
                    {c.last_message && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {c.last_message.direction === 'out' ? 'Você: ' : ''}
                        {c.last_message.body}
                      </p>
                    )}
                  </div>
                  {c.is_whatsapp && <Badge variant="success">WhatsApp</Badge>}
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const ok = window.confirm('Excluir conversa e contato?')
                      if (!ok) return
                      try {
                        const resp = await fetch(
                          `/api/atendimento/conversas?phone=${encodeURIComponent(c.phone)}`,
                          { method: 'DELETE' }
                        )
                        const data = await resp.json()
                        if (!resp.ok) throw new Error(data.message || 'Erro ao excluir conversa')
                        setConversas((prev) => prev.filter((item) => item.phone !== c.phone))
                        delete messagesCacheRef.current[c.phone]
                        if (activePhone === c.phone) {
                          setActivePhone(null)
                          setMessages([])
                        }
                        toast.success('Conversa removida.')
                      } catch (err) {
                        toast.error((err as Error)?.message || 'Falha ao excluir conversa')
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col rounded-2xl border border-border/60 bg-card/80 p-4 shadow-card">
          {activeConversa ? (
            <>
              <header className="mb-3 flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Atendimento</p>
                  <h2 className="text-xl font-semibold text-foreground">
                    {activeConversa.name || 'Contato sem nome'}
                  </h2>
                  <p className="text-sm text-muted-foreground">{formatPhone(activeConversa.phone)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!activeConversa?.phone) return
                    const ok = window.confirm('Tem certeza que deseja limpar a conversa?')
                    if (!ok) return
                    try {
                      const resp = await fetch(
                        `/api/atendimento/messages?phone=${encodeURIComponent(activeConversa.phone)}`,
                        { method: 'DELETE' }
                      )
                      const data = await resp.json()
                      if (!resp.ok) throw new Error(data.message || 'Erro ao limpar conversa')
                      setMessages([])
                      if (activeConversa?.phone) {
                        messagesCacheRef.current[activeConversa.phone] = []
                      }
                      await loadConversas()
                      toast.success('Conversa limpa.')
                    } catch (err) {
                      toast.error((err as Error)?.message || 'Falha ao limpar conversa')
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Limpar conversa
                </Button>
              </header>

              <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-2xl bg-muted/40 p-4">
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
                      'max-w-[76%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                      m.direction === 'out'
                        ? 'ml-auto bg-primary/10 text-foreground ring-1 ring-primary/20'
                        : 'bg-card text-muted-foreground ring-1 ring-border/60'
                    )}
                  >
                    {m.body && <p className="whitespace-pre-line leading-snug">{m.body}</p>}
                    {renderMedia(m.media, (src, label) => setLightbox({ src, label }))}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-border/60 bg-background p-3">
                <Textarea
                  className="min-h-[110px] resize-none"
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
                {attachment && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/70">
                    <div className="flex items-center gap-2">
                      {attachmentPreview ? (
                        <img
                          src={attachmentPreview}
                          alt={attachment.name}
                          className="h-10 w-10 rounded-lg object-cover ring-1 ring-border/70"
                        />
                      ) : (
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-border/70">
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
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/40">
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
                    <span>Enter para enviar • Shift+Enter para nova linha</span>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={sending || (!composer.trim() && !attachment)}
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Enviando...' : 'Enviar'}
                  </Button>
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
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-4 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-muted-foreground shadow-lg"
              aria-label="Fechar imagem"
            >
              ×
            </button>
            <img
              src={lightbox.src}
              alt={lightbox.label}
              className="max-h-[90vh] w-full rounded-2xl bg-white object-contain ring-1 ring-border/70"
            />
            <p className="mt-2 text-center text-xs text-white/80">{lightbox.label}</p>
          </div>
        </div>
      )}
    </div>
  )
}
