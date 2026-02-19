"use client"

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Status = 'loading' | 'ready' | 'error'

export default function ResetForm() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const hasEnv = useMemo(
    () =>
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    []
  )

  useEffect(() => {
    if (!hasEnv) {
      setErrorMessage('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      setStatus('error')
      return
    }

    const supabase = createSupabaseBrowserClient()
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    const hydrateFromCode = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code || '')
      if (error) {
        setErrorMessage(error.message || 'Link inválido ou expirado.')
        setStatus('error')
        return
      }
      setStatus('ready')
    }

    const hydrateFromHash = async () => {
      const hash = window.location.hash.replace(/^#/, '')
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (!accessToken || !refreshToken || type !== 'recovery') {
        setErrorMessage('Link inválido ou expirado.')
        setStatus('error')
        return
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        setErrorMessage(error.message || 'Link inválido ou expirado.')
        setStatus('error')
        return
      }

      setStatus('ready')
    }

    if (code) {
      hydrateFromCode()
      return
    }

    if (window.location.hash) {
      hydrateFromHash()
      return
    }

    setErrorMessage('Link inválido ou expirado.')
    setStatus('error')
  }, [hasEnv])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password || password.length < 6) {
      toast.error('Use uma senha com pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      toast.error('As senhas não conferem.')
      return
    }

    setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        throw new Error(error.message || 'Falha ao atualizar senha.')
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (session) {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
          }),
        })
      }

      toast.success('Senha atualizada com sucesso.')
      router.push('/admin/dashboard')
      router.refresh()
    } catch (err) {
      toast.error((err as Error)?.message || 'Falha ao atualizar senha.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
  }

  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-red-200/60 bg-red-50/60 p-4 text-sm text-red-700">
        {errorMessage || 'Link inválido.'}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Nova senha
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Confirmar senha
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Salvando...' : 'Atualizar senha'}
      </Button>
    </form>
  )
}

