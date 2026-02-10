"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import SidebarLayout from '../../../components/SidebarLayout'

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
          className="max-h-64 w-full cursor-zoom-in rounded-xl bg-white object-contain ring-1 ring-slate-200/70"
          loading="lazy"
        />
      </button>
    )
  }
  if (media.type === 'video' && media.url) {
    return <video className="mt-2 w-full rounded-xl ring-1 ring-slate-200/70" controls src={media.url} />
  }
  if (media.type === 'audio' && media.url) {
    return <audio className="mt-2 w-full" controls src={media.url} />
  }
  if (media.type === 'document' && media.url) {
    return (
      <a
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200/70 hover:bg-slate-50"
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
      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200/70">
        Localização: {media.latitude}, {media.longitude}
      </div>
    )
  }
  if (media.url) {
    return (
      <a
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200/70 hover:bg-slate-50"
        href={media.url}
        target="_blank"
        rel="noreferrer"
      >
        Abrir anexo
      </a>
    )
  }
  return (
    <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200/70">
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
  const [blastPhones, setBlastPhones] = useState('')
  const [blastMessage, setBlastMessage] = useState(
    'Olá! Encontrei seu contato e queria te mostrar o radar de comércios perto de você. Posso te enviar mais detalhes?'
  )
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
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
      const resp = await fetch(`/api/atendimento/messages?phone=${encodeURIComponent(phone)}`)
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        if (activePhoneRef.current === requestPhone) {
          setToast(data.message || 'Não foi possível carregar as mensagens.')
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
    // se não veio inicial, busca
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
      setToast('Digite uma mensagem ou selecione um anexo.')
      return
    }
    if (attachmentError && !attachment && !trimmed) {
      setToast(attachmentError)
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
      setToast('Mensagem enviada')
    } catch (err) {
      setToast((err as Error)?.message || 'Falha ao enviar')
    } finally {
      setSending(false)
    }
  }

  const sendBlast = async () => {
    const list = blastPhones
      .split(/\n|,|;|\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!list.length || !blastMessage.trim()) {
      setToast('Informe pelo menos um telefone e a mensagem.')
      return
    }
    setSending(true)
    try {
      const resp = await fetch('/api/atendimento/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: list, message: blastMessage }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'Erro no disparo')
      setToast('Disparo iniciado. Consulte as conversas ao lado.')
      await loadConversas()
    } catch (err) {
      setToast((err as Error)?.message || 'Falha no disparo')
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
    <div className="min-h-screen bg-surface text-slate-900">
      <SidebarLayout
        title="Atendimento"
        description="Conversas via WhatsApp (Z-API). Dispare, acompanhe e responda."
      >
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Lista de conversas */}
          <div className="flex h-[78vh] flex-col rounded-2xl bg-white/90 p-3 ring-1 ring-slate-200/70 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Conversas</p>
                <h3 className="text-lg font-semibold text-slate-900">Últimos contatos</h3>
              </div>
              <div className="flex items-center gap-2">
                {polling && <span className="h-2 w-2 animate-ping rounded-full bg-brand" />}
                <button
                  onClick={loadConversas}
                  className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200/70 hover:bg-slate-50"
                >
                  Atualizar
                </button>
              </div>
            </div>
            <div className="relative flex-1 overflow-y-auto">
              {!loadingConversas && conversas.length === 0 && (
                <p className="p-3 text-sm text-slate-500">Nenhuma conversa ainda.</p>
              )}
              {conversas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActivePhone(c.phone)}
                  className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${
                    activePhone === c.phone
                      ? 'bg-gradient-to-r from-brand/15 to-accent/15 ring-1 ring-brand/20'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{c.name || 'Contato sem nome'}</p>
                      <p className="text-xs text-slate-500">{formatPhone(c.phone)}</p>
                      {c.last_message && (
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {c.last_message.direction === 'out' ? 'Você: ' : ''} {c.last_message.body}
                        </p>
                      )}
                    </div>
                    {c.is_whatsapp && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        WhatsApp
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] text-red-600 hover:text-red-700"
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
                        } catch (err) {
                          setToast((err as Error)?.message || 'Falha ao excluir conversa')
                        }
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex h-[78vh] flex-col rounded-2xl bg-white/90 p-4 ring-1 ring-slate-200/70 shadow-sm">
            {activeConversa ? (
              <>
                <header className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Atendimento</p>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {activeConversa.name || 'Contato sem nome'}
                    </h2>
                    <p className="text-sm text-slate-500">{formatPhone(activeConversa.phone)}</p>
                  </div>
                  <button
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
                      } catch (err) {
                        setToast((err as Error)?.message || 'Falha ao limpar conversa')
                      }
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 ring-1 ring-slate-200/70 hover:bg-slate-50"
                  >
                    Limpar conversa
                  </button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {!loadingMessages && messages.length === 0 && (
                    <p className="text-sm text-slate-500">Nenhuma mensagem ainda.</p>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === 'out'
                          ? 'ml-auto bg-gradient-to-r from-brand/20 to-accent/20 text-slate-900 ring-1 ring-brand/20'
                          : 'bg-white text-slate-700 ring-1 ring-slate-200/70'
                      }`}
                    >
                      {m.body && <p className="whitespace-pre-line leading-snug">{m.body}</p>}
                      {renderMedia(m.media, (src, label) => setLightbox({ src, label }))}
                      <p className="mt-1 text-[11px] text-slate-500">
                        {new Date(m.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
                  <textarea
                    className="input-field min-h-[90px] w-full resize-none text-sm"
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
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200/70">
                      <div className="flex items-center gap-2">
                        {attachmentPreview ? (
                          <img
                            src={attachmentPreview}
                            alt={attachment.name}
                            className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200/70"
                          />
                        ) : (
                          <span className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-500 ring-1 ring-slate-200/70">
                            Anexo
                          </span>
                        )}
                        <span className="font-semibold text-slate-700">{attachment.name}</span>
                        <span className="text-slate-500">{formatBytes(attachment.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={() => {
                          setAttachment(null)
                          setAttachmentError(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                  {attachmentError && <p className="text-xs text-red-600">{attachmentError}</p>}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 hover:bg-slate-50">
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
                    <button
                      onClick={sendMessage}
                      disabled={sending || (!composer.trim() && !attachment)}
                      className="btn-primary px-5 py-2 text-sm font-semibold"
                    >
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500">
                Selecione uma conversa na esquerda.
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-4 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-700 shadow-lg"
              aria-label="Fechar imagem"
            >
              ×
            </button>
            <img
              src={lightbox.src}
              alt={lightbox.label}
              className="max-h-[90vh] w-full rounded-2xl bg-white object-contain ring-1 ring-slate-200/70"
            />
            <p className="mt-2 text-center text-xs text-white/80">{lightbox.label}</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-xl ring-1 ring-slate-200/70 backdrop-blur">
          {toast}
          <button className="ml-3 text-xs text-slate-500" onClick={() => setToast(null)}>
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}
