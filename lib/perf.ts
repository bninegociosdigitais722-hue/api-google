import { performance } from 'perf_hooks'

import { logInfo, type LogContext } from './logger'

const isEnabled = () => process.env.PERF_LOG === '1'

type PerfMark = {
  name: string
  atMs: number
}

export const createServerPerf = (label: string, ctx: LogContext = {}) => {
  if (!isEnabled()) {
    return {
      mark: (_name: string) => {},
      done: () => {},
    }
  }

  const start = performance.now()
  const marks: PerfMark[] = []

  const mark = (name: string) => {
    marks.push({ name, atMs: Math.round(performance.now() - start) })
  }

  const done = () => {
    logInfo(`perf:${label}`, {
      ...ctx,
      durationMs: Math.round(performance.now() - start),
      marks,
    })
  }

  return { mark, done }
}
