export default function LoadingAtendimento() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="h-[70vh] animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-[70vh] animate-pulse rounded-2xl bg-muted/40" />
      </div>
    </div>
  )
}
