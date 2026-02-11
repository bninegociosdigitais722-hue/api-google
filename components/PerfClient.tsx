'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const enabled = () => process.env.NEXT_PUBLIC_PERF_LOG === '1'

const logPerf = (message: string, payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ level: 'info', message, ...payload }))
}

export default function PerfClient() {
  const pathname = usePathname()
  const didHydrate = useRef(false)

  useEffect(() => {
    if (!enabled()) return
    if (didHydrate.current) return
    didHydrate.current = true
    const hydrationMs = Math.round(performance.now())
    logPerf('perf:hydrate', { path: pathname, durationMs: hydrationMs })
    requestAnimationFrame(() => {
      const readyMs = Math.round(performance.now())
      logPerf('perf:hydrate-ready', { path: pathname, durationMs: readyMs })
    })
  }, [pathname])

  useEffect(() => {
    if (!enabled()) return
    const clickAt = (window as any).__navClick as number | undefined
    if (!clickAt) return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const durationMs = Math.round(performance.now() - clickAt)
        logPerf('perf:click-to-paint', { path: pathname, durationMs })
        ;(window as any).__navClick = undefined
      })
    })
  }, [pathname])

  return null
}
