import { headers } from 'next/headers'
import SidebarLayout from '../../../../components/SidebarLayout'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logWarn } from '../../../../lib/logger'

export const metadata = {
  title: 'Consultas | Portal do Cliente',
}

const navItems = [
  { href: '/app', label: 'Home' },
  { href: '/app/consultas', label: 'Consultas' },
  { href: '/app/suporte', label: 'Suporte' },
]

export default async function ConsultasClientePage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const [contactsRes, messagesRes] = await Promise.all([
    db
      .from('contacts')
      .select('id, name, phone, is_whatsapp, last_message_at')
      .eq('owner_id', ownerId)
      .order('last_message_at', { ascending: false })
      .limit(50),
    db
      .from('messages')
      .select('id, contact_id, body, direction, status, created_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const contacts = contactsRes.data ?? []
  const messages = messagesRes.data ?? []
  const contactById = new Map(contacts.map((c) => [c.id, c]))

  return (
    <SidebarLayout
      title="Consultas recentes"
      description="Veja os últimos contatos encontrados e acompanhe mensagens recentes."
      navItems={navItems}
    >
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl bg-white/5 p-5 shadow-xl ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Contatos</p>
              <h3 className="text-lg font-semibold text-white">Últimas consultas</h3>
            </div>
            <span className="text-sm text-slate-300">{contacts.length} itens</span>
          </div>
          <div className="mt-3 divide-y divide-white/5">
            {contacts.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum contato encontrado para este tenant.</p>
            )}
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{c.name || 'Contato sem nome'}</p>
                  <p className="text-xs text-slate-400">{c.phone}</p>
                  <p className="text-xs text-slate-400">
                    Última mensagem:{' '}
                    {c.last_message_at
                      ? new Date(c.last_message_at).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-emerald-200">
                  {c.is_whatsapp ? 'WhatsApp' : 'Contato'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 shadow-xl ring-1 ring-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Mensagens</p>
              <h3 className="text-lg font-semibold text-white">Últimas interações</h3>
            </div>
            <span className="text-sm text-slate-300">{messages.length} itens</span>
          </div>
          <div className="mt-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma mensagem registrada.</p>
            )}
            {messages.map((m) => {
              const contact = contactById.get(m.contact_id)
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    m.direction === 'out'
                      ? 'bg-gradient-to-r from-brand/20 to-accent/20 text-white'
                      : 'bg-white/5 text-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-[12px] text-slate-300">
                    <span>{contact?.name || 'Contato'}</span>
                    <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line leading-snug text-slate-100">{m.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </SidebarLayout>
  )
}
