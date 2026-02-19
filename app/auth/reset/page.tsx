import ResetForm from './ResetForm'

export const metadata = {
  title: 'Redefinir senha | Radar Local',
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/70 bg-card/80 p-8 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Recuperação</p>
        <h1 className="text-2xl font-semibold text-foreground">Redefinir senha</h1>
        <p className="text-sm text-muted-foreground">
          Crie uma nova senha para continuar. Se o link expirou, solicite um novo envio no painel do Supabase.
        </p>
        <ResetForm />
      </div>
    </div>
  )
}

