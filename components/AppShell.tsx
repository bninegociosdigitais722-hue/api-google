import { ReactNode } from 'react'

import MobileNav from '@/components/MobileNav'
import SidebarLayout from '@/components/SidebarLayout'

type AppShellProps = {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="page-shell">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-grid-surface opacity-[0.08]" />
        <div className="page-container">
          <SidebarLayout />
          <main className="flex-1 space-y-6">
            <MobileNav />
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
