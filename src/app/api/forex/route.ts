import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.twelvedata.com'

export interface OhlcBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()
  const outputsize = searchParams.get('outputsize') || '120'

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not configured' }, { status: 500 })
  }

  // Twelve Data requires slash format for forex pairs: GBP/USD not GBPUSD
  // Only insert slash for standard 6-char forex symbols without an existing slash
  const formattedSymbol =
    !symbol.includes('/') && /^[A-Z]{6}$/.test(symbol)
      ? `${symbol.slice(0, 3)}/${symbol.slice(3)}`
      : symbol

  const url = `${BASE}/time_series?symbol=${encodeURIComponent(formattedSymbol)}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}&format=JSON`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
  }

  const data = await res.json()

  if (data.status === 'error') {
    return NextResponse.json({ error: data.message || 'API error' }, { status: 422 })
  }

  const raw: Array<{ datetime: string; open: string; high: string; low: string; close: string; volume?: string }> =
    data.values ?? []

  if (raw.length === 0) {
    return NextResponse.json({ error: 'No data returned for this symbol' }, { status: 404 })
  }

  // Twelve Data returns newest first — reverse to oldest first for charts
  const candles: OhlcBar[] = raw.reverse().map(v => ({
    time: v.datetime,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: v.volume ? parseFloat(v.volume) : undefined,
  }))

  const tsv =
    'Date\tHigh\tLow\n' +
    candles.map(v => `${v.time}\t${v.high}\t${v.low}`).join('\n')

  return NextResponse.json({ tsv, candles, count: candles.length })
}
