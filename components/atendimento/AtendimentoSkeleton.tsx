export default function AtendimentoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-44 animate-pulse rounded-2xl bg-muted/40" />
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="h-[520px] animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-[520px] animate-pulse rounded-2xl bg-muted/40" />
        <div className="hidden h-[520px] animate-pulse rounded-2xl bg-muted/40 xl:block" />
      </div>
    </div>
  )
}
