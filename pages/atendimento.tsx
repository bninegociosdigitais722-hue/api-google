import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'
import SidebarLayout from '../components/SidebarLayout'

type Conversa = {
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

type Message = {
  id: number
  contact_id: number
  body: string
  direction: 'in' | 'out'
  status: string | null
  created_at: string
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

export default function AtendimentoPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [loadingConversas, setLoadingConversas] = useState(false)
  const [activePhone, setActivePhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [composer, setComposer] = useState('')
  const [blastPhones, setBlastPhones] = useState('')
  const [blastMessage, setBlastMessage] = useState(
    'Olá! Encontrei seu contato e queria te mostrar o radar de comércios perto de você. Posso te enviar mais detalhes?'
  )
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const activeConversa = useMemo(
    () => conversas.find((c) => c.phone === activePhone) ?? null,
    [conversas, activePhone]
  )

  const loadConversas = async () => {
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
    }
  }

  const loadMessages = async (phone: string | null) => {
    if (!phone) return
    setLoadingMessages(true)
    try {
      const resp = await fetch(`/api/atendimento/messages?phone=${encodeURIComponent(phone)}`)
      const data = await resp.json()
      setMessages(data.messages ?? [])
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadConversas()
  }, [])

  useEffect(() => {
    if (activePhone) loadMessages(activePhone)
  }, [activePhone])

  const sendMessage = async () => {
    if (!composer.trim() || !activePhone) return
    setSending(true)
    try {
      const resp = await fetch('/api/atendimento/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phones: [activePhone], message: composer }),
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
      .split(/\\n|,|;|\\s+/)
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
      <Head>
        <title>Portal de Atendimento | Radar Local</title>
      </Head>

      <SidebarLayout
        title="Atendimento"
        description="Gerencie disparos iniciais, veja conversas e responda direto pelo WhatsApp (Z-API)."
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-5">
          <section className="w-full lg:w-[34%]">
          <div className="glass-panel rounded-3xl border border-white/5 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Disparo</p>
                <h2 className="text-xl font-semibold text-white">Mensagem inicial</h2>
              </div>
            </div>
            <textarea
              className="input-field mb-3 h-24 w-full resize-none text-sm"
              placeholder="Cole telefones separados por quebra de linha, vírgula ou espaço"
              value={blastPhones}
              onChange={(e) => setBlastPhones(e.target.value)}
            />
            <textarea
              className="input-field mb-3 h-28 w-full resize-none text-sm"
              placeholder="Sua mensagem inicial"
              value={blastMessage}
              onChange={(e) => setBlastMessage(e.target.value)}
            />
            <button
              onClick={sendBlast}
              disabled={sending}
              className="btn-primary w-full text-sm font-semibold"
            >
              {sending ? 'Enviando...' : 'Disparar mensagem'}
            </button>
          </div>

          <div className="mt-5 glass-panel rounded-3xl border border-white/5 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Conversas</p>
                <h3 className="text-lg font-semibold text-white">Últimos contatos</h3>
              </div>
              <button
                onClick={loadConversas}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-100 hover:bg-white/20"
              >
                Atualizar
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {loadingConversas && <p className="text-sm text-slate-400">Carregando...</p>}
              {!loadingConversas && conversas.length === 0 && (
                <p className="text-sm text-slate-400">Nenhuma conversa ainda.</p>
              )}
              {conversas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActivePhone(c.phone)}
                  className={`w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/5 ${
                    activePhone === c.phone ? 'bg-white/10 ring-1 ring-white/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {c.name || 'Contato sem nome'}
                      </p>
                      <p className="text-xs text-slate-400">{formatPhone(c.phone)}</p>
                      {c.last_message && (
                        <p className="line-clamp-2 text-xs text-slate-300">
                          {c.last_message.direction === 'out' ? 'Você: ' : ''} {c.last_message.body}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] uppercase text-emerald-300">
                      {c.is_whatsapp ? 'WhatsApp' : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          </section>

          <section className="glass-panel w-full flex-1 rounded-3xl border border-white/5 p-5 shadow-xl">
          {activeConversa ? (
            <div className="flex h-full flex-col gap-4">
              <header className="flex items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Atendimento
                  </p>
                  <h2 className="text-xl font-semibold text-white">
                    {activeConversa.name || 'Contato sem nome'}
                  </h2>
                  <p className="text-sm text-slate-400">{formatPhone(activeConversa.phone)}</p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white/5 p-4">
                {loadingMessages && <p className="text-sm text-slate-400">Carregando...</p>}
                {!loadingMessages && messages.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhuma mensagem ainda.</p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
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

              <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-3">
                <textarea
                  className="input-field min-h-[90px] w-full resize-none text-sm"
                  placeholder="Digite sua resposta..."
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={sendMessage}
                    disabled={sending || !composer.trim()}
                    className="btn-primary px-5 py-2 text-sm font-semibold"
                  >
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              Selecione uma conversa ao lado.
            </div>
          )}
          </section>
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
