'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'

import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { isActiveRoute, resolveNavGroups } from '@/components/shellNav'

export default function MobileNav() {
  const pathname = usePathname()
  const groups = resolveNavGroups(pathname)

  const markNavClick = () => {
    if (process.env.NEXT_PUBLIC_PERF_LOG === '1') {
      ;(window as any).__navClick = performance.now()
    }
  }

  return (
    <>
      <div className="flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Radar Local
            </p>
            <p className="text-sm font-semibold text-foreground">Painel</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {groups.flatMap((group) =>
          group.items.map((item) => {
            const active = isActiveRoute(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={markNavClick}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition',
                  active
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border/70 bg-card/60 text-muted-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
