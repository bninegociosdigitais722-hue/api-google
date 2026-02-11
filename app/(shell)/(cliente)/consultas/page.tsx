import { Suspense } from 'react'
import ConsultasData from '@/components/consultas/ConsultasData'
import ConsultasCount from '@/components/consultas/ConsultasCount'
import ConsultasSkeleton from '@/components/consultas/ConsultasSkeleton'
import PageHeader from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
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
          <>
            <Button variant="outline" size="sm" type="button">
              <Download className="h-4 w-4" />
              Exportar últimos resultados
            </Button>
            <Suspense fallback={<Badge variant="secondary">...</Badge>}>
              <ConsultasCount perfLabel="consultas.cliente.count" path="/consultas" />
            </Suspense>
          </>
        }
      />
      <Suspense fallback={<ConsultasSkeleton />}>
        <ConsultasData apiPrefix="/api" perfLabel="consultas.cliente" path="/consultas" />
      </Suspense>
    </div>
  )
}
