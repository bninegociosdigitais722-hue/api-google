import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

export const metadata = {
  title: 'Configurações | Radar Local',
}

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Área de ajustes estará disponível em breve. Aqui você vai gerenciar credenciais, webhooks e times."
        actions={
          <Button variant="outline" size="sm">
            Falar com suporte
          </Button>
        }
      />
      <EmptyState
        icon={Settings}
        title="Configurações em preparação"
        description="Estamos finalizando o painel de credenciais, notificações e integrações. Em breve você poderá controlar tudo por aqui."
        action={
          <Button size="sm" variant="soft">
            Solicitar acesso antecipado
          </Button>
        }
      />
    </div>
  )
}
