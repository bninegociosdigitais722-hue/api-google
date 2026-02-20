import type { SupabaseClient } from '@supabase/supabase-js'

import { optionalEnv } from './env'

export type HostRule = {
  host: string
  prefixes: string[]
  ownerId?: string
}

export class TenantResolutionError extends Error {
  status: number
  code: string

  constructor(message: string) {
    super(message)
    this.name = 'TenantResolutionError'
    this.status = 403
    this.code = 'TENANT_NOT_RESOLVED'
  }
}

type MembershipRow = {
  owner_id: string
  role?: string | null
}

export type TenantResolution = {
  ownerId: string
  role: string | null
  source: 'membership' | 'claim' | 'host' | 'dev'
}

const isProd = () => process.env.NODE_ENV === 'production'

const resolveDevFallbackOwner = () => {
  const fallback = optionalEnv('DEV_DEFAULT_OWNER_ID') || optionalEnv('DEFAULT_OWNER_ID')
  if (isProd() && fallback) {
    throw new Error('DEFAULT_OWNER_ID não pode ser usado em produção.')
  }
  return fallback
}

const logResolvePerf = (payload: Record<string, unknown>) => {
  if (process.env.PERF_LOG !== '1') return
  console.log(
    JSON.stringify({
      level: 'info',
      message: 'perf:resolveOwner',
      ...payload,
    })
  )
}

const parseAllowlist = (): HostRule[] => {
  const raw = optionalEnv('HOST_ALLOWLIST')
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('HOST_ALLOWLIST é obrigatória em produção para isolar hosts.')
    }
    // Dev fallback: allow localhost everything.
    const devHost = optionalEnv('DEV_HOST') || 'localhost:3000'
    return [{ host: devHost, prefixes: ['/'], ownerId: resolveDevFallbackOwner() }]
  }

  try {
    const parsed = JSON.parse(raw) as HostRule[]
    return parsed.map((rule) => ({
      host: rule.host.toLowerCase(),
      prefixes: (rule.prefixes || []).map((p) =>
        p === '/' ? '/' : p.endsWith('/') ? p.slice(0, -1) : p
      ),
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

const fetchMemberships = async (
  supabase: SupabaseClient,
  userId: string
): Promise<MembershipRow[]> => {
  const { data, error } = await supabase
    .from('memberships')
    .select('owner_id, role')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message || 'Falha ao consultar memberships.')
  }
  return (data as MembershipRow[]) ?? []
}

export const resolveTenant = async (opts: {
  host?: string | null
  userId?: string | null
  userOwnerId?: string | null
  supabase?: SupabaseClient
  allowUnauthenticated?: boolean
}): Promise<TenantResolution> => {
  const start = Date.now()
  const rule = findHostRule(opts.host ?? null)
  const hostOwnerId = rule?.ownerId ?? null
  const claimOwnerId = opts.userOwnerId ?? null
  const devFallback = resolveDevFallbackOwner()

  let memberships: MembershipRow[] = []
  if (opts.userId && opts.supabase) {
    memberships = await fetchMemberships(opts.supabase, opts.userId)
  }

  if (opts.userId && !memberships.length) {
    logResolvePerf({
      durationMs: Date.now() - start,
      host: opts.host ?? null,
      userId: opts.userId ?? null,
      resolved: false,
      reason: 'membership_required',
    })
    throw new TenantResolutionError('Memberships obrigatorias para este usuario.')
  }

  const membershipOwners = memberships.map((m) => m.owner_id)
  const membershipRoleByOwner = new Map(memberships.map((m) => [m.owner_id, m.role ?? null]))

  const pickMembership = (candidate: string | null) =>
    candidate && membershipOwners.includes(candidate) ? candidate : null

  let resolvedOwner: string | null = null
  let source: TenantResolution['source'] | null = null

  if (hostOwnerId) {
    if (!opts.userId) {
      resolvedOwner = hostOwnerId
      source = 'host'
    } else {
      if (!membershipOwners.length) {
        logResolvePerf({
          durationMs: Date.now() - start,
          host: opts.host ?? null,
          userId: opts.userId ?? null,
          resolved: false,
          reason: 'membership_required',
        })
        throw new TenantResolutionError('Memberships obrigatorias para este host.')
      }
      if (!membershipOwners.includes(hostOwnerId)) {
        logResolvePerf({
          durationMs: Date.now() - start,
          host: opts.host ?? null,
          userId: opts.userId ?? null,
          resolved: false,
          reason: 'host_owner_mismatch',
        })
        throw new TenantResolutionError('Usuario nao pertence ao tenant deste host.')
      }
      resolvedOwner = hostOwnerId
      source = 'membership'
    }
  }

  if (!resolvedOwner) {
    resolvedOwner = pickMembership(claimOwnerId)
    if (resolvedOwner) {
      source = 'membership'
    }
  }

  if (!resolvedOwner && membershipOwners.length === 1) {
    resolvedOwner = membershipOwners[0]
    source = 'membership'
  }

  if (!resolvedOwner && membershipOwners.length > 1) {
    logResolvePerf({
      durationMs: Date.now() - start,
      host: opts.host ?? null,
      userId: opts.userId ?? null,
      resolved: false,
      reason: 'multiple_memberships',
    })
    throw new TenantResolutionError('Multiplos tenants. Defina owner_id no app_metadata.')
  }

  if (!resolvedOwner && !isProd() && devFallback) {
    resolvedOwner = devFallback
    source = 'dev'
  }

  if (!resolvedOwner) {
    logResolvePerf({
      durationMs: Date.now() - start,
      host: opts.host ?? null,
      userId: opts.userId ?? null,
      resolved: false,
    })
    throw new TenantResolutionError('Tenant não resolvido. Complete o onboarding.')
  }

  const role = membershipRoleByOwner.get(resolvedOwner) ?? null

  logResolvePerf({
    durationMs: Date.now() - start,
    host: opts.host ?? null,
    userId: opts.userId ?? null,
    resolved: true,
    source,
  })

  return {
    ownerId: resolvedOwner,
    role,
    source: source ?? 'membership',
  }
}

export const resolveOwnerId = async (opts: {
  host?: string | null
  userId?: string | null
  userOwnerId?: string | null
  supabase?: SupabaseClient
  allowUnauthenticated?: boolean
}) => {
  const resolved = await resolveTenant(opts)
  return resolved.ownerId
}
