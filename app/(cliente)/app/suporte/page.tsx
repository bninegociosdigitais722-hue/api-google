import { headers } from 'next/headers'
import SidebarLayout from '../../../../components/SidebarLayout'
import supabaseAdmin from '../../../../lib/supabase/admin'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logWarn } from '../../../../lib/logger'

export const metadata = {
  title: 'Suporte | Portal do Cliente',
}

const navItems = [
  { href: '/app', label: 'Home' },
  { href: '/app/consultas', label: 'Consultas' },
  { href: '/app/suporte', label: 'Suporte' },
]

export default async function SuporteClientePage() {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const supabaseServer = await createSupabaseServerClient()
  const { data: sessionData } = await supabaseServer.auth.getSession()
  const user = sessionData.session?.user ?? null
  const ownerIdFromUser = (user?.app_metadata as any)?.owner_id as string | undefined
  const ownerId = resolveOwnerId({ host, userOwnerId: ownerIdFromUser })
  const db = user ? supabaseServer : supabaseAdmin

  const { data: messages } = await db
    .from('messages')
    .select('id, contact_id, body, direction, status, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <SidebarLayout
      title="Suporte"
      description="Abra chamados e acompanhe as últimas interações. Em breve: tickets e SLA."
      navItems={navItems}
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-card">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Ajuda</p>
          <h3 className="text-lg font-semibold text-foreground">Como podemos ajudar?</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Configure o Supabase Auth para seus usuários e roles.</li>
            <li>• Ajuste o HOST_ALLOWLIST para isolar cada subdomínio.</li>
            <li>• Verifique as chaves do Google Maps e Z-API em produção.</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Precisa de suporte humano? Envie um e-mail para{' '}
            <a className="text-primary" href="mailto:suporte@radarlocal.com.br">
              suporte@radarlocal.com.br
            </a>
            .
          </p>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Mensagens</p>
              <h3 className="text-lg font-semibold text-foreground">Histórico recente</h3>
            </div>
            <span className="text-sm text-muted-foreground">{messages?.length ?? 0} itens</span>
          </div>
          <div className="mt-3 space-y-3">
            {!messages?.length && (
              <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p>
            )}
            {messages?.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.direction === 'out'
                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/20'
                    : 'bg-background text-muted-foreground ring-1 ring-border/70'
                }`}
              >
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>{m.direction === 'out' ? 'Você' : 'Contato'}</span>
                  <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <p className="mt-1 whitespace-pre-line leading-snug text-muted-foreground">{m.body}</p>
                {m.status && <p className="text-[11px] text-muted-foreground">Status: {m.status}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
