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
        <div className="rounded-3xl bg-surface-2/90 p-5 shadow-xl ring-1 ring-slate-200/70">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ajuda</p>
          <h3 className="text-lg font-semibold text-slate-900">Como podemos ajudar?</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Configure o Supabase Auth para seus usuários e roles.</li>
            <li>• Ajuste o HOST_ALLOWLIST para isolar cada subdomínio.</li>
            <li>• Verifique as chaves do Google Maps e Z-API em produção.</li>
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            Precisa de suporte humano? Envie um e-mail para{' '}
            <a className="text-brand" href="mailto:suporte@radarlocal.com.br">
              suporte@radarlocal.com.br
            </a>
            .
          </p>
        </div>

        <div className="rounded-3xl bg-surface-2/90 p-5 shadow-xl ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Mensagens</p>
              <h3 className="text-lg font-semibold text-slate-900">Histórico recente</h3>
            </div>
            <span className="text-sm text-slate-500">{messages?.length ?? 0} itens</span>
          </div>
          <div className="mt-3 space-y-3">
            {!messages?.length && (
              <p className="text-sm text-slate-500">Nenhuma mensagem registrada.</p>
            )}
            {messages?.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl px-3 py-2 text-sm ${
                  m.direction === 'out'
                    ? 'bg-gradient-to-r from-brand/15 to-accent/15 text-slate-900 ring-1 ring-brand/20'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between text-[12px] text-slate-500">
                  <span>{m.direction === 'out' ? 'Você' : 'Contato'}</span>
                  <span>{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                </div>
                <p className="mt-1 whitespace-pre-line leading-snug text-slate-700">{m.body}</p>
                {m.status && <p className="text-[11px] text-slate-500">Status: {m.status}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
