export const metadata = {
  title: 'Erro interno',
}

import { Button } from '@/components/ui/button'

export default function ServerErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Erro 500</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro interno ao processar sua requisição. Tente novamente em instantes.
        </p>
        <Button asChild className="mt-6">
          <a href="/dashboard">Voltar ao dashboard</a>
        </Button>
      </div>
    </div>
  )
}
