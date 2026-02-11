import SidebarLayout from '@/components/SidebarLayout'
import RecentActivityTable, { type ActivityRow } from '@/components/RecentActivityTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight,
  Download,
  MessageSquare,
  Plus,
  Search,
  Send,
  Timer,
} from 'lucide-react'

const kpis = [
  {
    label: 'Consultas realizadas',
    value: '—',
    hint: 'Em breve',
    icon: Search,
    tone: 'primary',
  },
  {
    label: 'Disparos enviados',
    value: '—',
    hint: 'Em breve',
    icon: Send,
    tone: 'accent',
  },
  {
    label: 'Respostas recebidas',
    value: '—',
    hint: 'Em breve',
    icon: MessageSquare,
    tone: 'primary',
  },
  {
    label: 'Tempo médio de resposta',
    value: '—',
    hint: 'Em breve',
    icon: Timer,
    tone: 'muted',
  },
]

const toneStyles: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  muted: 'bg-muted text-muted-foreground',
}

const activities: ActivityRow[] = [
  {
    id: '1',
    atividade: 'Busca por supermercados',
    contato: 'Supermercado Boa Compra',
    canal: 'WhatsApp',
    status: 'Concluído',
    data: 'Hoje • 09:12',
  },
  {
    id: '2',
    atividade: 'Disparo de convite',
    contato: 'Mercearia Central',
    canal: 'WhatsApp',
    status: 'Pendente',
    data: 'Hoje • 08:31',
  },
  {
    id: '3',
    atividade: 'Resposta recebida',
    contato: 'Padaria Primavera',
    canal: 'WhatsApp',
    status: 'Concluído',
    data: 'Ontem • 18:10',
  },
  {
    id: '4',
    atividade: 'Falha em envio',
    contato: 'Hortifruti Central',
    canal: 'WhatsApp',
    status: 'Alerta',
    data: 'Ontem • 17:42',
  },
]

export default function DashboardPage() {
  return (
    <SidebarLayout
      title="Dashboard"
      description="Visão geral do produto. Em breve: consultas, disparos e respostas consolidadas."
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Ações rápidas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Atalhos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="h-4 w-4" /> Exportar relatório
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ArrowUpRight className="h-4 w-4" /> Atualizar métricas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova consulta
          </Button>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border border-border/60 bg-card/80 shadow-card">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl shadow-soft',
                      toneStyles[card.tone]
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">Em breve</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.hint}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Resumo</p>
              <h3 className="text-lg font-semibold text-foreground">Painel diário</h3>
            </div>
            <Badge variant="secondary">Em breve</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Gráficos e métricas completas de consultas, disparos e respostas em tempo real.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {['Consultas locais', 'Mensagens enviadas', 'Respostas ao vivo', 'Times ativos'].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Próximos passos</p>
              <h3 className="text-lg font-semibold text-foreground">Checklist rápido</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              'Configure seus templates de WhatsApp.',
              'Defina filtros de localização prioritários.',
              'Crie um roteiro de atendimento padrão.',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Atividades</p>
            <h3 className="text-lg font-semibold text-foreground">Últimas atividades</h3>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Baixar CSV
          </Button>
        </div>
        <RecentActivityTable data={activities} />
      </section>
    </SidebarLayout>
  )
}
