import fs from 'fs'

const readLines = (path) =>
  fs
    .readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

const collectStats = (path) => {
  const map = new Map()
  for (const line of readLines(path)) {
    let payload
    try {
      payload = JSON.parse(line)
    } catch {
      continue
    }
    if (typeof payload?.message !== 'string') continue
    if (!payload.message.startsWith('perf:')) continue
    const label = payload.message.slice('perf:'.length)
    const duration = Number(payload.durationMs)
    if (!Number.isFinite(duration)) continue
    if (!map.has(label)) {
      map.set(label, { count: 0, total: 0, durations: [] })
    }
    const entry = map.get(label)
    entry.count += 1
    entry.total += duration
    entry.durations.push(duration)
  }

  const stats = new Map()
  for (const [label, entry] of map.entries()) {
    const sorted = entry.durations.slice().sort((a, b) => a - b)
    const count = entry.count
    const avg = count ? entry.total / count : 0
    const p95Index = Math.max(0, Math.floor(0.95 * (sorted.length - 1)))
    const p95 = sorted[p95Index] ?? 0
    stats.set(label, { count, avg, p95 })
  }
  return stats
}

const format = (value) => `${Math.round(value)}ms`

const [beforePath, afterPath] = process.argv.slice(2)
if (!beforePath) {
  console.log('Usage: node scripts/perf-rank.mjs <before.jsonl> [after.jsonl]')
  process.exit(1)
}

const before = collectStats(beforePath)
const after = afterPath ? collectStats(afterPath) : null

const labels = new Set([...before.keys(), ...(after ? after.keys() : [])])
const rows = []

for (const label of labels) {
  const b = before.get(label)
  const a = after ? after.get(label) : null
  rows.push({
    label,
    beforeAvg: b?.avg ?? null,
    afterAvg: a?.avg ?? null,
    beforeP95: b?.p95 ?? null,
    afterP95: a?.p95 ?? null,
    beforeCount: b?.count ?? 0,
    afterCount: a?.count ?? 0,
  })
}

rows.sort((a, b) => (b.afterAvg ?? b.beforeAvg ?? 0) - (a.afterAvg ?? a.beforeAvg ?? 0))

const header =
  'label'.padEnd(32) +
  'before_avg'.padStart(12) +
  'after_avg'.padStart(12) +
  'delta'.padStart(10) +
  'before_p95'.padStart(12) +
  'after_p95'.padStart(12) +
  'count'.padStart(8)

console.log(header)
for (const row of rows) {
  const beforeAvg = row.beforeAvg
  const afterAvg = row.afterAvg
  const delta =
    beforeAvg != null && afterAvg != null ? Math.round(afterAvg - beforeAvg) : null

  console.log(
    row.label.padEnd(32) +
      String(beforeAvg != null ? format(beforeAvg) : '-').padStart(12) +
      String(afterAvg != null ? format(afterAvg) : '-').padStart(12) +
      String(delta != null ? `${delta}ms` : '-').padStart(10) +
      String(row.beforeP95 != null ? format(row.beforeP95) : '-').padStart(12) +
      String(row.afterP95 != null ? format(row.afterP95) : '-').padStart(12) +
      String(row.afterCount || row.beforeCount).padStart(8)
  )
}
