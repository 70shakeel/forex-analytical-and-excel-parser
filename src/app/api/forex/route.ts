import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.twelvedata.com'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()
  const outputsize = searchParams.get('outputsize') || '65'

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not configured' }, { status: 500 })
  }

  const url = `${BASE}/time_series?symbol=${symbol}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}&format=JSON`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
  }

  const data = await res.json()

  if (data.status === 'error') {
    return NextResponse.json({ error: data.message || 'API error' }, { status: 422 })
  }

  // Normalise to the same tab-separated format the parser already understands
  const values: Array<{ datetime: string; high: string; low: string }> = data.values ?? []
  if (values.length === 0) {
    return NextResponse.json({ error: 'No data returned for this symbol' }, { status: 404 })
  }

  const tsv =
    'Date\tHigh\tLow\n' +
    values.map(v => `${v.datetime}\t${v.high}\t${v.low}`).join('\n')

  return NextResponse.json({ tsv, count: values.length })
}
