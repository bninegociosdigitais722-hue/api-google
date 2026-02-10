/* eslint-disable @next/next/no-img-element */
"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

type NavItem = { href: string; label: string; badge?: string }
type SidebarLayoutProps = {
  title: string
  description?: string
  children: ReactNode
  navItems?: NavItem[]
}

const appNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/consultas', label: 'Consultas' },
  { href: '/atendimento', label: 'Atendimento' },
  { href: '/configuracoes', label: 'Configurações', badge: 'em breve' },
]

export default function SidebarLayout({ title, description, children, navItems }: SidebarLayoutProps) {
  const pathname = usePathname()
  const items = navItems ?? appNav

  return (
    <div className="min-h-screen bg-surface text-slate-900">
      <div className="mx-auto flex w-full gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <aside className="sticky top-4 hidden h-[92vh] w-64 flex-shrink-0 flex-col rounded-3xl bg-surface-2/80 p-5 shadow-xl ring-1 ring-slate-200/70 backdrop-blur lg:flex">
          <div className="mb-6 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Radar Local</p>
            <h1 className="text-xl font-semibold text-slate-900">Painel</h1>
          </div>
          <nav className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-gradient-to-r from-brand/15 to-accent/15 text-slate-900 ring-1 ring-brand/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-600">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 space-y-4 lg:space-y-6">
          <div className="space-y-1 border-b border-slate-200/70 pb-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Seção</p>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
            {description && <p className="max-w-3xl text-sm text-slate-600">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
