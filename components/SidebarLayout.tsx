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
    <aside className="sticky top-6 hidden h-[92vh] w-64 flex-shrink-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm lg:flex">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Radar Local</p>
              <p className="text-xs text-slate-500">Painel</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Separator className="bg-slate-200" />

        <nav className="space-y-5">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
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
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className={cn(active && 'bg-white/20 text-white')}
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
        <Separator className="bg-slate-200" />
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-slate-900 text-xs font-semibold text-white">
              RL
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Radar Local</p>
            <p className="text-xs text-slate-500">Conta principal</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl text-slate-500">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
