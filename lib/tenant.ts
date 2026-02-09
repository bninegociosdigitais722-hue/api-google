import { optionalEnv } from './env'

export type HostRule = {
  host: string
  prefixes: string[]
  ownerId?: string
}

const parseAllowlist = (): HostRule[] => {
  const raw = optionalEnv('HOST_ALLOWLIST')
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('HOST_ALLOWLIST é obrigatória em produção para isolar hosts.')
    }
    // Dev fallback: allow localhost everything.
    const devHost = optionalEnv('DEV_HOST') || 'localhost:3000'
    return [{ host: devHost, prefixes: ['/'], ownerId: optionalEnv('DEFAULT_OWNER_ID') }]
  }

  try {
    const parsed = JSON.parse(raw) as HostRule[]
    return parsed.map((rule) => ({
      host: rule.host.toLowerCase(),
      prefixes: (rule.prefixes || []).map((p) => (p.endsWith('/') ? p.slice(0, -1) : p)),
      ownerId: rule.ownerId,
    }))
  } catch (err) {
    throw new Error('HOST_ALLOWLIST inválida. Use JSON com [{ host, prefixes, ownerId? }].')
  }
}

export const findHostRule = (host: string | null): HostRule | null => {
  if (!host) return null
  const normalized = host.toLowerCase()
  return parseAllowlist().find((rule) => rule.host === normalized) ?? null
}

export const pathAllowedForHost = (pathname: string, rule: HostRule | null): boolean => {
  if (!rule) return false
  const path = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  return rule.prefixes.some((prefix) =>
    prefix === '/'
      ? true
      : path === prefix || path.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
  )
}

export const resolveOwnerId = (opts: { host?: string | null; userOwnerId?: string | null }) => {
  const rule = findHostRule(opts.host ?? null)
  const defaultOwner = optionalEnv('DEFAULT_OWNER_ID')
  // Fallback “public” para ambientes sem owner configurado (modo demo).
  const owner = opts.userOwnerId || rule?.ownerId || defaultOwner || 'public'
  return owner
}
