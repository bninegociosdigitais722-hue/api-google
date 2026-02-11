export default function LoadingAdmin() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-muted/40" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
    </div>
  )
}
