'use client'

type Props = {
  label: string
}

// Marca o tempo entre click (window.__navClick) e render do skeleton na UI,
// para acompanhar a meta click→skeleton < 100ms em Perf logs.
export default function PerfSkeletonMarker({ label }: Props) {
  if (typeof window === 'undefined') return null

  const clickAt = (window as any).__navClick as number | undefined
  if (clickAt) {
    const durationMs = Math.round(performance.now() - clickAt)
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'perf:skeleton',
        label,
        durationMs,
      })
    )
    ;(window as any).__navClick = undefined
  }

  return null
}
