"use client"

import { useEffect, useMemo, useState } from 'react'
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
  const [blastPhones, setBlastPhones] = useState('')
  const [blastMessage, setBlastMessage] = useState(
    'Olá! Encontrei seu contato e queria te mostrar o radar de comércios perto de você. Posso te enviar mais detalhes?'
  )
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)

  const activeConversa = useMemo(
    () => conversas.find((c) => c.phone === activePhone) ?? null,
    [conversas, activePhone]
  )

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
    setLoadingMessages(true)
    try {
      const resp = await fetch(`/api/atendimento/messages?phone=${encodeURIComponent(phone)}`)
      const data = await resp.json()
      const cleaned = (data.messages ?? []).filter((m: Message) => m.body && m.body.trim())
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
      const preload = initialMessagesByPhone[activePhone]
      if (preload) {
        setMessages(preload)
      } else {
        loadMessages(activePhone)
      }
    }
  }, [activePhone]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!composer.trim() || !activePhone) return
    setSending(true)
    try {
      const resp = await fetch('/api/atendimento/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: [activePhone],
          message: composer,
          force: true,
          template: 'reply',
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.message || 'Erro ao enviar')
      setComposer('')
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

  return (
    <div className="min-h-screen bg-surface text-slate-50">
      <SidebarLayout
        title="Atendimento"
        description="Conversas via WhatsApp (Z-API). Dispare, acompanhe e responda."
      >
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Lista de conversas */}
          <div className="flex h-[78vh] flex-col rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Conversas</p>
                <h3 className="text-lg font-semibold text-white">Últimos contatos</h3>
              </div>
              <div className="flex items-center gap-2">
                {polling && <span className="h-2 w-2 animate-ping rounded-full bg-brand" />}
                <button
                  onClick={loadConversas}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 hover:bg-white/20"
                >
                  Atualizar
                </button>
              </div>
            </div>
            <div className="relative flex-1 overflow-y-auto">
              {!loadingConversas && conversas.length === 0 && (
                <p className="p-3 text-sm text-slate-400">Nenhuma conversa ainda.</p>
              )}
              {conversas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActivePhone(c.phone)}
                  className={`mb-2 w-full rounded-xl px-3 py-3 text-left transition ${
                    activePhone === c.phone
                      ? 'bg-gradient-to-r from-brand/15 to-accent/15 ring-1 ring-white/15'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{c.name || 'Contato sem nome'}</p>
                      <p className="text-xs text-slate-400">{formatPhone(c.phone)}</p>
                      {c.last_message && (
                        <p className="line-clamp-2 text-xs text-slate-300">
                          {c.last_message.direction === 'out' ? 'Você: ' : ''} {c.last_message.body}
                        </p>
                      )}
                    </div>
                    {c.is_whatsapp && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
                        WhatsApp
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="text-[11px] text-red-300 hover:text-red-200"
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
          <div className="flex h-[78vh] flex-col rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            {activeConversa ? (
              <>
                <header className="mb-3 flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Atendimento</p>
                    <h2 className="text-xl font-semibold text-white">
                      {activeConversa.name || 'Contato sem nome'}
                    </h2>
                    <p className="text-sm text-slate-400">{formatPhone(activeConversa.phone)}</p>
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
                        await loadConversas()
                      } catch (err) {
                        setToast((err as Error)?.message || 'Falha ao limpar conversa')
                      }
                    }}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 hover:bg-white/20"
                  >
                    Limpar conversa
                  </button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/5 p-4">
                  {!loadingMessages && messages.length === 0 && (
                    <p className="text-sm text-slate-400">Nenhuma mensagem ainda.</p>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === 'out'
                          ? 'ml-auto bg-gradient-to-r from-brand/30 to-accent/30 text-white'
                          : 'bg-white/10 text-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-snug">{m.body}</p>
                      <p className="mt-1 text-[11px] text-slate-300">
                        {new Date(m.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white/5 p-3">
                  <textarea
                    className="input-field min-h-[90px] w-full resize-none text-sm"
                    placeholder="Digite sua resposta..."
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Enter para enviar • Shift+Enter para nova linha</span>
                    <button
                      onClick={sendMessage}
                      disabled={sending || !composer.trim()}
                      className="btn-primary px-5 py-2 text-sm font-semibold"
                    >
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Selecione uma conversa na esquerda.
              </div>
            )}
          </div>
        </div>
      </SidebarLayout>

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-white/10 px-4 py-2 text-sm text-slate-100 shadow-xl backdrop-blur">
          {toast}
          <button className="ml-3 text-xs text-slate-300" onClick={() => setToast(null)}>
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}
