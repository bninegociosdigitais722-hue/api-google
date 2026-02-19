"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch (err) {
      // ignore, still clear cookies
    }

    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Sessão encerrada.')
    router.push('/login')
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-xl text-muted-foreground"
      onClick={handleLogout}
      disabled={loading}
      title="Sair"
      aria-label="Sair"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  )
}

