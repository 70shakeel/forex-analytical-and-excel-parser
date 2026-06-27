import type { OhlcBar } from '@/app/api/forex/route'

export interface LinePoint { time: string; value: number }

export function ema(candles: OhlcBar[], period: number): LinePoint[] {
  const k = 2 / (period + 1)
  const result: LinePoint[] = []
  let prev: number | null = null

  for (const c of candles) {
    if (prev === null) {
      prev = c.close
    } else {
      prev = c.close * k + prev * (1 - k)
    }
    result.push({ time: c.time, value: Math.round(prev * 100000) / 100000 })
  }

  // Drop the first (period - 1) points so the line starts once warmed up
  return result.slice(period - 1)
}

export function sma(candles: OhlcBar[], period: number): LinePoint[] {
  const result: LinePoint[] = []
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1)
    const avg = slice.reduce((s, c) => s + c.close, 0) / period
    result.push({ time: candles[i].time, value: Math.round(avg * 100000) / 100000 })
  }
  return result
}

export interface BollingerPoint { time: string; upper: number; middle: number; lower: number }

export function bollingerBands(candles: OhlcBar[], period = 20, stdDev = 2): BollingerPoint[] {
  const result: BollingerPoint[] = []
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, c) => s + c.close, 0) / period
    const variance = slice.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / period
    const sd = Math.sqrt(variance)
    result.push({
      time: candles[i].time,
      upper: Math.round((mean + stdDev * sd) * 100000) / 100000,
      middle: Math.round(mean * 100000) / 100000,
      lower: Math.round((mean - stdDev * sd) * 100000) / 100000,
    })
  }
  return result
}

export interface RsiPoint { time: string; value: number }

export function rsi(candles: OhlcBar[], period = 14): RsiPoint[] {
  const result: RsiPoint[] = []
  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0

    if (i <= period) {
      avgGain += gain / period
      avgLoss += loss / period
      if (i === period) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        result.push({ time: candles[i].time, value: Math.round((100 - 100 / (1 + rs)) * 100) / 100 })
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push({ time: candles[i].time, value: Math.round((100 - 100 / (1 + rs)) * 100) / 100 })
    }
  }

  return result
}

export interface MacdPoint { time: string; macd: number; signal: number; histogram: number }

export function macd(candles: OhlcBar[], fast = 12, slow = 26, signal = 9): MacdPoint[] {
  const fastEma = ema(candles, fast)
  const slowEma = ema(candles, slow)

  // Align by time
  const slowTimes = new Set(slowEma.map(p => p.time))
  const fastMap = new Map(fastEma.map(p => [p.time, p.value]))

  const macdLine = slowEma
    .filter(p => slowTimes.has(p.time) && fastMap.has(p.time))
    .map(p => ({ time: p.time, value: (fastMap.get(p.time) ?? 0) - p.value }))

  // Signal = EMA of macdLine
  const k = 2 / (signal + 1)
  const result: MacdPoint[] = []
  let prevSignal: number | null = null

  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i].value
    if (prevSignal === null) {
      prevSignal = m
    } else {
      prevSignal = m * k + prevSignal * (1 - k)
    }
    if (i >= signal - 1) {
      result.push({
        time: macdLine[i].time,
        macd: Math.round(m * 100000) / 100000,
        signal: Math.round(prevSignal * 100000) / 100000,
        histogram: Math.round((m - prevSignal) * 100000) / 100000,
      })
    }
  }

  return result
}
