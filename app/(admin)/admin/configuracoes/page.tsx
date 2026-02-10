import SidebarLayout from '../../../../components/SidebarLayout'

export const metadata = {
  title: 'Configurações | Radar Local',
}

export default function ConfiguracoesPage() {
  return (
    <SidebarLayout
      title="Configurações"
      description="Área de ajustes estará disponível em breve. Aqui você vai gerenciar credenciais, webhooks e times."
    >
      <div className="rounded-3xl bg-white/90 p-6 text-slate-700 shadow-lg ring-1 ring-slate-200/70">
        <p className="text-sm">
          Em breve: parâmetros do Google Maps, Z-API, Supabase, preferências de notificações e times de atendimento.
        </p>
      </div>
    </SidebarLayout>
  )
}
