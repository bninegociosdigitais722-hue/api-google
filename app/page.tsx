export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-surface text-slate-50">
      <div className="relative overflow-hidden pb-24 pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 lg:px-10">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Radar Local</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Encontre, contate e converta clientes locais
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-200">
            Plataforma SaaS multi-tenant com consultas a comércios, atendimento WhatsApp integrado (Z-API)
            e painel admin seguro. Subdomínios dedicados: admin.radarlocal.com.br e atendimento.radarlocal.com.br.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <a
              className="btn-primary px-5 py-3 text-base font-semibold"
              href="https://admin.radarlocal.com.br"
            >
              Ir para o Admin
            </a>
            <a
              className="rounded-full bg-white/10 px-5 py-3 text-base font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/20"
              href="https://atendimento.radarlocal.com.br"
            >
              Portal de Atendimento
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
