import ConsultasClient from '@/app/(shell)/(admin)/admin/consultas/ConsultasClient'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { resolveRequestId } from '@/lib/logger'
import { createServerPerf } from '@/lib/perf'
import { TenantResolutionError } from '@/lib/tenant'
import { getConsultasSummary } from '@/lib/summary'

type ConsultasDataProps = {
  apiPrefix: string
  perfLabel: string
  path: string
}

export default async function ConsultasData({ apiPrefix, perfLabel, path }: ConsultasDataProps) {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  const perf = createServerPerf(perfLabel, {
    requestId: resolveRequestId(headersList),
    path,
    host,
  })
  perf.mark('start')

  let contatos: any[] = []
  let hasError: { message?: string } | null = null
  try {
    const summary = await getConsultasSummary(host, 10)
    contatos = summary.contacts
  } catch (err) {
    if (err instanceof TenantResolutionError) {
      redirect('/403')
    }
    hasError = err as { message?: string }
  }
  perf.mark('summary')

  const sentMap = Object.fromEntries(
    contatos
      .filter((c) => c.phone)
      .map((c) => [
        String(c.phone),
        {
          template: (c as any).last_outbound_template as string | null,
          lastOutboundAt: null,
        },
      ])
  )
  perf.mark('render')
  perf.done()

  return (
    <ConsultasClient
      initialResults={contatos.map((c) => ({
        id: String(c.id),
        nome: c.name ?? 'Contato',
        endereco: 'Endereço não informado',
        telefone: c.phone,
        nota: null,
        mapsUrl: '#',
        fotoUrl: (c as any).photo_url ?? null,
        temWhatsapp: c.is_whatsapp ?? undefined,
        lastOutboundTemplate: (c as any).last_outbound_template ?? null,
      }))}
      sentMap={sentMap}
      total={null}
      error={hasError?.message}
      apiPrefix={apiPrefix}
    />
  )
}
