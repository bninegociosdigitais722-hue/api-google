export const metadata = {
  title: 'Login | Radar Local',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 text-slate-900">
      <div className="w-full max-w-md space-y-4 rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200/70">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Autenticação</p>
        <h1 className="text-2xl font-semibold text-slate-900">Entrar</h1>
        <p className="text-sm text-slate-600">
          Configure o Supabase Auth para emitir tokens com <code className="font-mono">app_metadata.owner_id</code> e
          roles. Após autenticar, o cookie <code className="font-mono">sb-access-token</code> será lido no server e
          usaremos o <code className="font-mono">owner_id</code> do JWT para isolar o tenant.
        </p>
        <ol className="list-decimal space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200/70">
          <li>Habilite um provedor (ou magic link) no Supabase Auth.</li>
          <li>Defina <code className="font-mono">owner_id</code> em <code className="font-mono">app_metadata</code> do usuário.</li>
          <li>Após login, volte para o app; as páginas protegidas usarão o JWT para filtrar por tenant.</li>
        </ol>
        <p className="text-xs text-slate-500">
          Dica rápida: use o dashboard do Supabase &gt; Authentication &gt; Users para criar um usuário e atribuir
          <code className="font-mono">app_metadata.owner_id</code> com o valor do seu tenant (ex.: <code className="font-mono">owner_default</code>).
        </p>
      </div>
    </div>
  )
}
