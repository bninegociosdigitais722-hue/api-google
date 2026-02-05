export const metadata = {
  title: 'Página não encontrada',
}

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-slate-50">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Erro 404</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-300">
          A rota acessada não existe ou não está liberada para este host.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/20"
        >
          Voltar ao dashboard
        </a>
      </div>
    </div>
  )
}
