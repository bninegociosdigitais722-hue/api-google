import { Suspense } from 'react'

import AtendimentoData from '@/components/atendimento/AtendimentoData'
import AtendimentoSkeleton from '@/components/atendimento/AtendimentoSkeleton'

export const metadata = {
  title: 'Atendimento | Radar Local',
}

export const revalidate = 0

export default async function AtendimentoPage() {
  return (
    <Suspense fallback={<AtendimentoSkeleton />}>
      <AtendimentoData />
    </Suspense>
  )
}
