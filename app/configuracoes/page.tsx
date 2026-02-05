import SidebarLayout from '../../components/SidebarLayout'

export const metadata = {
  title: 'Configurações | Radar Local',
}

export default function ConfiguracoesPage() {
  return (
    <SidebarLayout
      title="Configurações"
      description="Área de ajustes estará disponível em breve. Aqui você vai gerenciar credenciais, webhooks e times."
    >
      <div className="rounded-3xl bg-white/5 p-6 text-slate-200 shadow-lg ring-1 ring-white/5">
        <p className="text-sm">
          Em breve: parâmetros do Google Maps, Z-API, Supabase, preferências de notificações e times de atendimento.
        </p>
      </div>
    </SidebarLayout>
  )
}
