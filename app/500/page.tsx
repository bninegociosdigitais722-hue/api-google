export const metadata = {
  title: 'Erro interno',
}

export default function ServerErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-slate-900">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Erro 500</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ocorreu um erro interno ao processar sua requisição. Tente novamente em instantes.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200/70 transition hover:bg-slate-50"
        >
          Voltar ao dashboard
        </a>
      </div>
    </div>
  )
}
