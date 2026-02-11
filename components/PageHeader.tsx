import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
  className?: string
}

export default function PageHeader({
  title,
  description,
  actions,
  eyebrow = 'Seção',
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 shadow-card backdrop-blur animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      <div className="absolute inset-0 -z-10 bg-grid-surface opacity-[0.18]" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            {eyebrow}
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
