export const metadata = {
  title: 'Página não encontrada',
}

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Erro 404</p>
        <h1 className="mt-3 text-3xl font-semibold text-foreground">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A rota acessada não existe ou não está liberada para este host.
        </p>
        <Button asChild className="mt-6">
          <a href="/dashboard">Voltar ao dashboard</a>
        </Button>
      </div>
    </div>
  )
}
