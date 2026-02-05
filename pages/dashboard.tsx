import SidebarLayout from '../components/SidebarLayout'

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
      description="Acompanhe consultas, disparos e respostas. Em breve vamos popular estes dados."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl bg-white/5 p-4 shadow-lg ring-1 ring-white/5"
          >
            <p className="text-sm text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
            <p className="text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-3xl bg-white/5 p-5 shadow-lg ring-1 ring-white/5">
        <h3 className="text-lg font-semibold text-white">Próximos gráficos</h3>
        <p className="mt-2 text-sm text-slate-300">
          Espaço reservado para evolução diária de consultas, disparos e respostas.
        </p>
      </section>
    </SidebarLayout>
  )
}
