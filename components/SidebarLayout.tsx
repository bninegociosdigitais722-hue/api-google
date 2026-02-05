import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'

type SidebarLayoutProps = {
  title: string
  description?: string
  children: ReactNode
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/', label: 'Consultas' },
  { href: '/atendimento', label: 'Atendimento' },
  { href: '/configuracoes', label: 'Configurações' },
]

export default function SidebarLayout({ title, description, children }: SidebarLayoutProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-surface text-slate-50">
      <div className="mx-auto flex w-[98vw] max-w-screen-2xl gap-6 px-3 py-6 sm:px-5 lg:px-8">
        <aside className="sticky top-4 hidden h-[92vh] w-60 flex-shrink-0 flex-col rounded-3xl bg-white/5 p-4 shadow-xl ring-1 ring-white/5 lg:flex">
          <div className="mb-6 space-y-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Radar Local</p>
            <h1 className="text-xl font-semibold text-white">Painel</h1>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = router.pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-gradient-to-r from-brand/25 to-accent/25 text-white ring-1 ring-white/10'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                  {item.label === 'Configurações' && (
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                      em breve
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 space-y-4 lg:space-y-6">
          <header className="space-y-2 rounded-3xl bg-white/5 p-5 shadow-xl ring-1 ring-white/5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Seção</p>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
            {description && <p className="max-w-3xl text-sm text-slate-300">{description}</p>}
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
