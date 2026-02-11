import { Button } from '@/components/ui/button'

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden pb-24 pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 lg:px-10">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Radar Local</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Encontre, contate e converta clientes locais
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Plataforma SaaS multi-tenant com consultas a comércios, atendimento WhatsApp integrado (Z-API)
            e painel admin seguro. Subdomínios dedicados: admin.radarlocal.com.br e atendimento.radarlocal.com.br.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Button asChild size="lg">
              <a href="https://admin.radarlocal.com.br">Ir para o Admin</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="https://atendimento.radarlocal.com.br">Portal de Atendimento</a>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
