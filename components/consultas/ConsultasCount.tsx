import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { TenantResolutionError } from '@/lib/tenant'
import { getConsultasCount } from '@/lib/summary'

type ConsultasCountProps = {
  perfLabel: string
  path: string
}

export default async function ConsultasCount({ perfLabel, path }: ConsultasCountProps) {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const perf = createServerPerf(perfLabel, {
    requestId: resolveRequestId(headersList),
    path,
    host,
  })
  perf.mark('start')

  let count: number | null = null
  try {
    count = await getConsultasCount(host)
  } catch (err) {
    if (err instanceof TenantResolutionError) {
      redirect('/403')
    }
  }
  perf.mark('summary')
  perf.mark('render')
  perf.done()

  if (typeof count !== 'number') {
    return <Badge variant="secondary">—</Badge>
  }

  return <Badge variant="secondary">{count} resultados</Badge>
}
