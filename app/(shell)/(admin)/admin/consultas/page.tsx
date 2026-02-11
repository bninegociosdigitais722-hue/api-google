import { Suspense } from 'react'
import ConsultasData from '@/components/consultas/ConsultasData'
import ConsultasSkeleton from '@/components/consultas/ConsultasSkeleton'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export const metadata = {
  title: 'Consultas | Radar Local',
}

export default function ConsultasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultas"
        description="Busque comércios, filtre apenas quem tem WhatsApp ativo e abra rotas no Maps."
        actions={
          <Button variant="outline" size="sm" type="button">
            <Download className="h-4 w-4" />
            Exportar últimos resultados
          </Button>
        }
      />
      <Suspense fallback={<ConsultasSkeleton />}>
        <ConsultasData apiPrefix="/api/admin" perfLabel="consultas.admin" path="/admin/consultas" />
      </Suspense>
    </div>
  )
}
