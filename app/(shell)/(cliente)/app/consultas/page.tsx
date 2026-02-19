import { headers } from 'next/headers'
import PageHeader from '@/components/PageHeader'
import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { getPortalConsultasSummary } from '@/lib/summary'
import { TenantResolutionError } from '@/lib/tenant'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Consultas | Portal do Cliente',
}

export default async function ConsultasClientePage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const perf = createServerPerf('portal.consultas', {
    requestId: resolveRequestId(headersList),
    path: '/app/consultas',
    host,
  })
  perf.mark('start')
  let contacts: any[] = []
  let messages: any[] = []
  try {
    const summary = await getPortalConsultasSummary(host)
    contacts = summary.contacts
    messages = summary.messages
  } catch (err) {
    if (err instanceof TenantResolutionError) {
      redirect('/403')
    }
    throw err
  }
  perf.mark('summary')
  const contactById = new Map(contacts.map((c) => [c.id, c]))
  perf.mark('render')
  perf.done()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultas recentes"
        description="Veja os últimos contatos encontrados e acompanhe mensagens recentes."
      />
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Contatos</p>
              <h3 className="text-lg font-semibold text-foreground">Últimas consultas</h3>
            </div>
            <span className="text-sm text-muted-foreground">{contacts.length} itens</span>
          </div>
          <div className="mt-3 divide-y divide-border/70">
            {contacts.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum contato encontrado para este tenant.</p>
            )}
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.name || 'Contato sem nome'}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    Última mensagem:{' '}
                    {c.last_message_at
                      ? new Date(c.last_message_at).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    c.is_whatsapp ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.is_whatsapp ? 'WhatsApp' : 'Contato'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Mensagens</p>
              <h3 className="text-lg font-semibold text-foreground">Últimas interações</h3>
            </div>
            <span className="text-sm text-muted-foreground">{messages.length} itens</span>
          </div>
          <div className="mt-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p>
            )}
            {messages.map((m) => {
              const contact = contactById.get(m.contact_id)
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    m.direction === 'out'
                      ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                      : 'bg-background text-muted-foreground ring-1 ring-border/70'
                  }`}
                >
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                    <span>{contact?.name || 'Contato'}</span>
                    <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line leading-snug text-muted-foreground">{m.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
