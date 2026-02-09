import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../lib/supabase/server'
import { resolveOwnerId } from '../../../../lib/tenant'
import { logError, logWarn, resolveRequestId } from '../../../../lib/logger'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req.headers)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const supabase = await createSupabaseServerClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user ?? null

  if (!user) {
    logWarn('admin/overview no session', { tag: 'api/admin/overview', requestId, host })
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const ownerId = resolveOwnerId({
    host,
    userOwnerId: (user?.app_metadata as any)?.owner_id,
  })

  const baseSelect = { count: 'exact', head: true } as const

  const [{ count: contactsCount, error: contactsError }, { count: messagesCount, error: messagesError }] =
    await Promise.all([
      supabase.from('contacts').select('id', baseSelect).eq('owner_id', ownerId),
      supabase.from('messages').select('id', baseSelect).eq('owner_id', ownerId),
    ])

  if (contactsError || messagesError) {
    logError('admin/overview error', {
      tag: 'api/admin/overview',
      requestId,
      host,
      ownerId,
      contactsError: contactsError?.message,
      messagesError: messagesError?.message,
    })
    return NextResponse.json({ message: 'Erro ao obter métricas' }, { status: 500 })
  }

  return NextResponse.json(
    {
      contacts: contactsCount ?? 0,
      messages: messagesCount ?? 0,
    },
    { status: 200, headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=60' } }
  )
}

