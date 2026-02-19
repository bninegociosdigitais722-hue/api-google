"use client"

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const hasEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const type = params.get('type')
    const accessToken = params.get('access_token')
    if (type === 'recovery' && accessToken) {
      router.replace(`/auth/reset${hash}`)
    }
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasEnv) {
      toast.error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      return
    }
    if (!email || !password) {
      toast.error('Informe email e senha.')
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session) {
        throw new Error(error?.message || 'Falha ao autenticar.')
      }

      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        }),
      })
      if (!resp.ok) {
        const payload = await resp.json().catch(() => ({}))
        throw new Error(payload?.message || 'Falha ao salvar sessão.')
      }

      router.push('/admin/dashboard')
      router.refresh()
    } catch (err) {
      toast.error((err as Error)?.message || 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!hasEnv && (
        <div className="rounded-2xl border border-amber-300/50 bg-amber-100/40 p-3 text-xs text-amber-800">
          Configure <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no ambiente.
        </div>
      )}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Email
        </label>
        <Input
          type="email"
          placeholder="voce@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Senha
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
