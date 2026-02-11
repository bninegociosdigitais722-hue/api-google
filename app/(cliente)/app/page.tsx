import SidebarLayout from '../../../components/SidebarLayout'

export const metadata = {
  title: 'App | Radar Local',
}

const navItems = [
  { href: '/app', label: 'Home' },
  { href: '/app/consultas', label: 'Consultas' },
  { href: '/app/suporte', label: 'Suporte' },
]

export default function AppHomePage() {
  return (
    <SidebarLayout
      title="Portal do Cliente"
      description="Acesse consultas, acompanhamento de pedidos e suporte em um único lugar."
      navItems={navItems}
    >
      <div className="rounded-3xl border border-border/70 bg-card/80 p-6 text-muted-foreground shadow-card">
        <p className="text-sm">
          Bem-vindo ao portal do cliente. Aqui você vai acompanhar consultas, mensagens e suporte.
          As seções adicionais serão habilitadas conforme o onboarding.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Consultas</p>
            <p className="mt-1 text-base font-semibold text-foreground">Disponível</p>
            <p className="text-sm text-muted-foreground">
              Veja consultas e contatos mais recentes filtrados pelo seu tenant.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Suporte</p>
            <p className="mt-1 text-base font-semibold text-foreground">Disponível</p>
            <p className="text-sm text-muted-foreground">Acompanhe mensagens e saiba como falar com o time.</p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
