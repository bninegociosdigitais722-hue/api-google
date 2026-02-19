/* eslint-disable @next/next/no-img-element */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard,
  Settings,
  Sparkles,
} from 'lucide-react'

import ThemeToggle from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { isActiveRoute, resolveNavGroups } from '@/components/shellNav'
import LogoutButton from '@/components/LogoutButton'

export default function SidebarLayout() {
  const pathname = usePathname()
  const groups = resolveNavGroups(pathname)

  useEffect(() => {
    console.log('[SidebarLayout] mounted')
  }, [])

  const markNavClick = () => {
    if (process.env.NEXT_PUBLIC_PERF_LOG === '1') {
      ;(window as any).__navClick = performance.now()
    }
  }

  return (
    <aside className="sticky top-6 hidden h-[92vh] w-64 flex-shrink-0 flex-col justify-between rounded-2xl border border-sidebar-border bg-sidebar/90 px-4 py-5 shadow-card backdrop-blur lg:flex">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Radar Local</p>
              <p className="text-xs text-muted-foreground">Painel</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Separator className="bg-border/60" />

        <nav className="space-y-5">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href)
                  const Icon = item.icon ?? LayoutDashboard
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={markNavClick}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                        active
                          ? 'bg-primary text-primary-foreground shadow-card'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className={cn(active && 'bg-primary-foreground/20 text-primary-foreground')}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        <Separator className="bg-border/60" />
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-foreground text-xs font-semibold text-background">
              RL
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Radar Local</p>
            <p className="text-xs text-muted-foreground">Conta principal</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground">
              <Settings className="h-4 w-4" />
            </Button>
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  )
}
