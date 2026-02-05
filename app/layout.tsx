import '../styles/globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Radar Local',
  description: 'Encontre comércios perto de você e fale direto no WhatsApp.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
