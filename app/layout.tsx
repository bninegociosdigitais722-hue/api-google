import '../styles/globals.css'
import { ReactNode } from 'react'
import { Toaster } from 'sonner'

import PerfClient from '@/components/PerfClient'
import ThemeProvider from '@/components/ThemeProvider'

export const metadata = {
  title: 'Radar Local',
  description: 'Encontre comércios perto de você e fale direto no WhatsApp.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <PerfClient />
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{ className: 'rounded-2xl border border-border bg-card text-foreground shadow-card' }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
