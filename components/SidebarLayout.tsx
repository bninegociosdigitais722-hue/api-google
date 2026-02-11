/* eslint-disable @next/next/no-img-element */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import {
  LayoutDashboard,
  Search,
  MessagesSquare,
  Settings,
  Home,
  LifeBuoy,
  Sparkles,
} from 'lucide-react'

import PageHeader from '@/components/PageHeader'
import ThemeToggle from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; badge?: string; icon?: typeof LayoutDashboard }
type NavGroup = { label: string; items: NavItem[] }
type SidebarLayoutProps = {
  title: string
  description?: string
  children: ReactNode
  navItems?: NavItem[]
  actions?: ReactNode
  eyebrow?: string
}

const defaultNav: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/consultas', label: 'Consultas', icon: Search },
      { href: '/atendimento', label: 'Atendimento', icon: MessagesSquare },
    ],
  },
  {
    label: 'Gestão',
    items: [{ href: '/configuracoes', label: 'Configurações', icon: Settings, badge: 'Em breve' }],
  },
]

const iconByLabel: Record<string, typeof LayoutDashboard> = {
  Home,
  Consultas: Search,
  Suporte: LifeBuoy,
}

const resolveNavGroups = (navItems?: NavItem[]): NavGroup[] => {
  if (!navItems?.length) return defaultNav
  return [
    {
      label: 'Navegação',
      items: navItems.map((item) => ({
        ...item,
        icon: item.icon ?? iconByLabel[item.label] ?? LayoutDashboard,
      })),
    },
  ]
}

const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`)

export default function SidebarLayout({
  title,
  description,
  children,
  navItems,
  actions,
  eyebrow,
}: SidebarLayoutProps) {
  const pathname = usePathname()
  const groups = resolveNavGroups(navItems)

  return (
    <div className="page-shell">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-grid-surface opacity-[0.08]" />
        <div className="page-container">
          <aside className="sticky top-6 hidden h-[92vh] w-72 flex-shrink-0 flex-col justify-between rounded-3xl border border-sidebar-border/70 bg-sidebar/80 p-5 shadow-soft backdrop-blur lg:flex">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-soft">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      Radar Local
                    </p>
                    <h1 className="text-lg font-semibold text-sidebar-foreground">Painel</h1>
                  </div>
                </div>
                <ThemeToggle />
              </div>

              <Separator />

              <nav className="space-y-5">
                {groups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
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
                            className={cn(
                              'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                              active
                                ? 'bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/25'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent transition',
                                active
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted/40 text-muted-foreground group-hover:text-foreground'
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3">
                <Avatar>
                  <AvatarFallback>RL</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Radar Local</p>
                  <p className="text-xs text-muted-foreground">Conta principal</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
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

            <PageHeader title={title} description={description} actions={actions} eyebrow={eyebrow} />
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
