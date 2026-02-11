export default function ConsultasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
      <div className="h-10 animate-pulse rounded-2xl bg-muted/40" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-48 animate-pulse rounded-2xl bg-muted/40" />
        ))}
      </div>
    </div>
  )
}
