export const assetProfiles: Record<string, { baseline: number; range: number; multiplier: number; type: string }> = {
  GBPUSD: { baseline: 1.254, range: 95, multiplier: 10000, type: 'Standard' },
  EURUSD: { baseline: 1.085, range: 72, multiplier: 10000, type: 'Standard' },
  USDJPY: { baseline: 156.2, range: 110, multiplier: 100, type: 'JPY' },
  AUDUSD: { baseline: 0.662, range: 60, multiplier: 10000, type: 'Standard' },
  USDCAD: { baseline: 1.365, range: 65, multiplier: 10000, type: 'Standard' },
  USDCHF: { baseline: 0.892, range: 58, multiplier: 10000, type: 'Standard' },
  NZDUSD: { baseline: 0.611, range: 55, multiplier: 10000, type: 'Standard' },
  EURGBP: { baseline: 0.852, range: 45, multiplier: 10000, type: 'Standard' },
  GBPJPY: { baseline: 195.8, range: 135, multiplier: 100, type: 'JPY' },
  EURJPY: { baseline: 169.1, range: 105, multiplier: 100, type: 'JPY' },
  XAUUSD: { baseline: 2325.0, range: 240, multiplier: 100, type: 'Gold' },
  BTCUSD: { baseline: 64200.0, range: 1800, multiplier: 1, type: 'Crypto' },
}

export function detectMultiplier(symbol: string): number {
  const upper = symbol.toUpperCase()
  if (assetProfiles[upper]) return assetProfiles[upper].multiplier
  if (upper.endsWith('JPY')) return 100
  if (upper.startsWith('BTC') || upper.startsWith('ETH')) return 1
  if (upper.startsWith('XAU') || upper.startsWith('GOLD')) return 100
  return 10000
}

export interface DayRow {
  date: string
  day: string
  high: number
  low: number
  range: number
}

export interface DayStats {
  sum: number
  count: number
  avg: number
}

export interface AnalyticsResult {
  rows: DayRow[]
  avgRange: number
  maxRange: number
  minRange: number
  dayStats: Record<string, DayStats>
  peakDay: string
}

export function generatePairData(symbol: string, multiplier: number): string {
  const upper = symbol.toUpperCase()
  const profile = assetProfiles[upper] || { baseline: 1.2, range: 80, multiplier, type: 'Standard' }
  const baselinePrice = profile.baseline
  const targetAvgRange = profile.range

  let dataset = 'Date\tHigh\tLow\n'
  const currentDate = new Date('2026-06-26')
  let simulatedPrice = baselinePrice
  let rowsGenerated = 0

  while (rowsGenerated < 65) {
    const dayNum = currentDate.getDay()
    if (dayNum !== 0 && dayNum !== 6) {
      let dayMultiplier = 1.0
      if (dayNum === 2 || dayNum === 4) dayMultiplier = 1.25
      if (dayNum === 1 || dayNum === 5) dayMultiplier = 0.8

      const seed = (rowsGenerated * 9301 + 49297) % 233280
      const rnd = seed / 233280
      const seed2 = ((rowsGenerated + 7) * 9301 + 49297) % 233280
      const rnd2 = seed2 / 233280

      const change = (rnd - 0.5) * (targetAvgRange / multiplier) * 0.4
      simulatedPrice += change

      const randomVolatility = (targetAvgRange + (rnd2 - 0.5) * targetAvgRange * 0.35) * dayMultiplier
      const dailySpread = randomVolatility / multiplier
      const dailyHigh = simulatedPrice + dailySpread / 2
      const dailyLow = simulatedPrice - dailySpread / 2

      const dateStr = currentDate.toISOString().split('T')[0]
      const decimals = multiplier === 10000 ? 5 : 2
      dataset += `${dateStr}\t${dailyHigh.toFixed(decimals)}\t${dailyLow.toFixed(decimals)}\n`
      rowsGenerated++
    }
    currentDate.setDate(currentDate.getDate() - 1)
  }

  return dataset
}

export function parseAndAnalyze(rawText: string, multiplier: number): AnalyticsResult | null {
  const lines = rawText.trim().split('\n')
  const rows: DayRow[] = []
  const dayOfWeekStats: Record<string, DayStats> = {
    Monday: { sum: 0, count: 0, avg: 0 },
    Tuesday: { sum: 0, count: 0, avg: 0 },
    Wednesday: { sum: 0, count: 0, avg: 0 },
    Thursday: { sum: 0, count: 0, avg: 0 },
    Friday: { sum: 0, count: 0, avg: 0 },
  }

  let totalRangeSum = 0
  let maxRange = -Infinity
  let minRange = Infinity

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.toLowerCase().includes('date')) continue
    const columns = trimmed.split(/\s+/)
    if (columns.length < 3) continue

    const parsedDate = new Date(columns[0])
    if (isNaN(parsedDate.getTime())) continue

    const high = parseFloat(columns[1])
    const low = parseFloat(columns[2])
    if (isNaN(high) || isNaN(low)) continue

    const range = Math.round(Math.abs(high - low) * multiplier * 10) / 10
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = daysMap[parsedDate.getDay()]

    if (dayOfWeekStats[dayName]) {
      dayOfWeekStats[dayName].sum += range
      dayOfWeekStats[dayName].count += 1
    }

    rows.push({ date: columns[0], day: dayName, high, low, range })
    totalRangeSum += range
    if (range > maxRange) maxRange = range
    if (range < minRange) minRange = range
  }

  if (rows.length === 0) return null

  const avgRange = Math.round((totalRangeSum / rows.length) * 10) / 10
  let peakDay = '-'
  let highestAvg = 0

  for (const [day, stats] of Object.entries(dayOfWeekStats)) {
    stats.avg = stats.count > 0 ? Math.round((stats.sum / stats.count) * 10) / 10 : 0
    if (stats.avg > highestAvg) {
      highestAvg = stats.avg
      peakDay = day
    }
  }

  return { rows, avgRange, maxRange, minRange, dayStats: dayOfWeekStats, peakDay }
}
