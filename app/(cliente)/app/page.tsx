import SidebarLayout from '../../../components/SidebarLayout'

export const metadata = {
  title: 'App | Radar Local',
}

const navItems = [
  { href: '/app', label: 'Home' },
  { href: '/app/consultas', label: 'Consultas', badge: 'em breve' },
  { href: '/app/suporte', label: 'Suporte', badge: 'em breve' },
]

export default function AppHomePage() {
  return (
    <SidebarLayout
      title="Portal do Cliente"
      description="Acesse consultas, acompanhamento de pedidos e suporte em um único lugar."
      navItems={navItems}
    >
      <div className="rounded-3xl bg-white/5 p-6 text-slate-200 shadow-lg ring-1 ring-white/5">
        <p className="text-sm">
          Bem-vindo ao portal do cliente. Aqui você vai acompanhar consultas, mensagens e suporte.
          As seções adicionais serão habilitadas conforme o onboarding.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Consultas</p>
            <p className="mt-1 text-base font-semibold text-white">Em breve</p>
            <p className="text-sm text-slate-300">Histórico e novas buscas de estabelecimentos.</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Suporte</p>
            <p className="mt-1 text-base font-semibold text-white">Em breve</p>
            <p className="text-sm text-slate-300">Abra tickets e fale com nosso time.</p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
