import { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import AppShell from '@/components/AppShell'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    redirect('/login')
  }

  return <AppShell>{children}</AppShell>
}
