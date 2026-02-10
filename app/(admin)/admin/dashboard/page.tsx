import SidebarLayout from '../../../../components/SidebarLayout'

const cards = [
  { label: 'Consultas realizadas', value: '—', hint: 'Em breve' },
  { label: 'Disparos enviados', value: '—', hint: 'Em breve' },
  { label: 'Respostas recebidas', value: '—', hint: 'Em breve' },
  { label: 'Taxa de resposta', value: '—', hint: 'Em breve' },
]

export default function DashboardPage() {
  return (
    <SidebarLayout
      title="Dashboard"
      description="Visão geral do produto. Em breve: consultas, disparos e respostas consolidadas."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl bg-white/90 p-4 shadow-lg ring-1 ring-slate-200/70"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-3xl bg-white/90 p-5 shadow-lg ring-1 ring-slate-200/70">
        <h3 className="text-lg font-semibold text-slate-900">Próximos gráficos</h3>
        <p className="mt-2 text-sm text-slate-600">
          Espaço reservado para evolução diária de consultas, disparos e respostas.
        </p>
      </section>
    </SidebarLayout>
  )
}
