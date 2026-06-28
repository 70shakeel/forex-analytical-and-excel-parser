'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RangeBarChart } from '@/components/forex/range-bar-chart'
import { RangeLineChart } from '@/components/forex/range-line-chart'
import { TradingChart } from '@/components/forex/trading-chart'
import { generatePairData, parseAndAnalyze, detectMultiplier, type AnalyticsResult } from '@/lib/forex'
import type { OhlcBar } from '@/app/api/forex/route'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { TrendingUp, BarChart2, Copy, Wand2, RefreshCw, Wifi, WifiOff, Clock, X } from 'lucide-react'

const MULTIPLIER_OPTIONS = [
  { value: '10000', label: 'Standard (4/5 dec) — GBPUSD, EURUSD' },
  { value: '100', label: 'JPY / Gold (2/3 dec) — USDJPY, XAUUSD' },
  { value: '1', label: 'Crypto / Indices — BTCUSD, US30' },
]

// All known symbols for the suggestion list
const ALL_SYMBOLS = [
  { symbol: 'GBPUSD', label: 'GBP/USD', category: 'Major' },
  { symbol: 'EURUSD', label: 'EUR/USD', category: 'Major' },
  { symbol: 'USDJPY', label: 'USD/JPY', category: 'Major' },
  { symbol: 'AUDUSD', label: 'AUD/USD', category: 'Major' },
  { symbol: 'USDCAD', label: 'USD/CAD', category: 'Major' },
  { symbol: 'USDCHF', label: 'USD/CHF', category: 'Major' },
  { symbol: 'NZDUSD', label: 'NZD/USD', category: 'Major' },
  { symbol: 'GBPJPY', label: 'GBP/JPY', category: 'Cross' },
  { symbol: 'EURJPY', label: 'EUR/JPY', category: 'Cross' },
  { symbol: 'EURGBP', label: 'EUR/GBP', category: 'Cross' },
  { symbol: 'AUDCAD', label: 'AUD/CAD', category: 'Cross' },
  { symbol: 'AUDCHF', label: 'AUD/CHF', category: 'Cross' },
  { symbol: 'CADJPY', label: 'CAD/JPY', category: 'Cross' },
  { symbol: 'CHFJPY', label: 'CHF/JPY', category: 'Cross' },
  { symbol: 'XAUUSD', label: 'Gold (XAU/USD)', category: 'Commodity' },
  { symbol: 'XAGUSD', label: 'Silver (XAG/USD)', category: 'Commodity' },
  { symbol: 'BTCUSD', label: 'Bitcoin (BTC/USD)', category: 'Crypto' },
  { symbol: 'ETHUSD', label: 'Ethereum (ETH/USD)', category: 'Crypto' },
]

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('GBPUSD')
  const [multiplier, setMultiplier] = useState('10000')
  const [rawData, setRawData] = useState('')
  const [result, setResult] = useState<AnalyticsResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [dataSource, setDataSource] = useState<'simulated' | 'live' | null>(null)
  const [candles, setCandles] = useState<OhlcBar[]>([])
  const [days, setDays] = useState(120)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const symbolInputRef = useRef<HTMLDivElement>(null)

  // Filtered suggestions based on input
  const query = symbol.toUpperCase()
  const suggestions = query.length === 0
    ? ALL_SYMBOLS
    : ALL_SYMBOLS.filter(s =>
        s.symbol.includes(query) || s.label.toUpperCase().includes(query)
      )

  // Load recent searches from Supabase on mount
  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('search_history')
        .select('symbol')
        .eq('user_id', user.id)
        .order('searched_at', { ascending: false })
        .limit(10)
      if (data) {
        // Deduplicate while preserving order
        const seen = new Set<string>()
        setRecentSearches(data.map(r => r.symbol).filter(s => seen.has(s) ? false : seen.add(s) && true))
      }
    }
    loadHistory()
  }, [])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (symbolInputRef.current && !symbolInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function saveSearch(sym: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('search_history').insert({ user_id: user.id, symbol: sym })
    // Update local recent list
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== sym)
      return [sym, ...filtered].slice(0, 10)
    })
  }

  async function deleteSearch(sym: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('search_history').delete().eq('user_id', user.id).eq('symbol', sym)
    setRecentSearches(prev => prev.filter(s => s !== sym))
  }

  function handleSymbolChange(val: string) {
    setSymbol(val.toUpperCase())
    setMultiplier(detectMultiplier(val).toString())
  }

  function handlePickSymbol(sym: string) {
    setSymbol(sym)
    setMultiplier(detectMultiplier(sym).toString())
    setShowSuggestions(false)
  }

  function handleGenerate() {
    setGenerating(true)
    const data = generatePairData(symbol, parseFloat(multiplier))
    setRawData(data)
    const res = parseAndAnalyze(data, parseFloat(multiplier))
    if (res) {
      setResult(res)
      setDataSource('simulated')
      toast.success(`Simulated 65-day history for ${symbol}`)
    }
    setGenerating(false)
  }

  async function handleFetchLive(overrideSymbol?: string) {
    const sym = overrideSymbol ?? symbol
    if (!sym.trim()) { toast.error('Enter a symbol first'); return }
    setFetching(true)
    try {
      const res = await fetch(`/api/forex?symbol=${encodeURIComponent(sym)}&outputsize=${days}`)
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Failed to fetch live data'); return }
      setRawData(json.tsv)
      setCandles(json.candles ?? [])
      const parsed = parseAndAnalyze(json.tsv, parseFloat(detectMultiplier(sym).toString()))
      if (parsed) {
        setResult(parsed)
        setDataSource('live')
        toast.success(`Loaded ${json.count} days of live data for ${sym}`)
        await saveSearch(sym.toUpperCase())
      }
    } catch {
      toast.error('Network error — check your connection')
    } finally {
      setFetching(false)
    }
  }

  function handleParse() {
    if (!rawData.trim()) { toast.error('Paste data or fetch/generate first'); return }
    const res = parseAndAnalyze(rawData, parseFloat(multiplier))
    if (!res) { toast.error('Could not parse data — check format (Date High Low)'); return }
    setResult(res)
    toast.success('Statistics calculated')
  }

  function handleCopy() {
    if (!result) return
    const pairName = symbol.toUpperCase()
    let text = `Date\tDay of Week\tHigh (${pairName})\tLow (${pairName})\tRange (Pips)\n`
    result.rows.forEach(r => { text += `${r.date}\t${r.day}\t${r.high}\t${r.low}\t${r.range}\n` })
    navigator.clipboard.writeText(text)
    toast.success('Table copied — paste into Excel cell A1')
  }

  useEffect(() => {
    handleFetchLive()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Forex Statistical Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fetch live data or paste your own High/Low history to calculate pip range statistics.
          </p>
        </div>
        {dataSource && (
          <Badge
            variant="outline"
            className={`flex items-center gap-1.5 text-xs ${
              dataSource === 'live'
                ? 'text-emerald-400 border-emerald-500/40'
                : 'text-amber-400 border-amber-500/40'
            }`}
          >
            {dataSource === 'live' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {dataSource === 'live' ? 'Live data' : 'Simulated'}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-emerald-400" />
              Pair Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Symbol input with suggestions */}
            <div className="space-y-2" ref={symbolInputRef}>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Symbol</Label>
              <div className="relative">
                <Input
                  value={symbol}
                  onChange={e => handleSymbolChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { setShowSuggestions(false); handleFetchLive() }
                    if (e.key === 'Escape') setShowSuggestions(false)
                  }}
                  className="font-mono font-bold text-emerald-400 uppercase tracking-widest"
                  placeholder="GBPUSD"
                  autoComplete="off"
                />

                {/* Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-72 overflow-y-auto">

                    {/* Recent searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="px-3 py-2 flex items-center gap-1.5 border-b border-border">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent</span>
                        </div>
                        {recentSearches.map(s => (
                          <div key={s} className="flex items-center justify-between hover:bg-muted/40 transition-colors group">
                            <button
                              className="flex-1 text-left px-3 py-2 text-sm font-mono font-bold text-emerald-400"
                              onClick={() => { handlePickSymbol(s); handleFetchLive(s) }}
                            >
                              {s}
                            </button>
                            <button
                              className="px-2 py-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                              onClick={e => { e.stopPropagation(); deleteSearch(s) }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-border" />
                      </div>
                    )}

                    {/* Symbol suggestions */}
                    {suggestions.length > 0 ? (
                      suggestions.map(s => (
                        <button
                          key={s.symbol}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                          onClick={() => { handlePickSymbol(s.symbol); handleFetchLive(s.symbol) }}
                        >
                          <span className="text-sm font-mono font-bold text-foreground">{s.symbol}</span>
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-xs text-muted-foreground">No matches — press Enter to search anyway</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Decimals / Multiplier</Label>
              <Select value={multiplier} onValueChange={(v) => v && setMultiplier(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MULTIPLIER_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Days slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Days of History</Label>
                <span className="text-xs font-mono font-bold text-emerald-400">{days}d</span>
              </div>
              <input
                type="range" min={30} max={365} step={5} value={days}
                onChange={e => setDays(parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 rounded-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>30d</span><span>365d</span>
              </div>
            </div>

            {/* Live fetch */}
            <Button
              onClick={() => handleFetchLive()}
              disabled={fetching}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs"
            >
              <Wifi className="h-3 w-3 mr-1.5" />
              {fetching ? 'Fetching live data…' : 'Fetch Live Data'}
            </Button>

            {/* Simulate fallback */}
            <Button onClick={handleGenerate} disabled={generating} className="w-full text-xs" variant="outline">
              <Wand2 className="h-3 w-3 mr-1" />
              Simulate 65-Day History
            </Button>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Raw Data (Date High Low)
              </Label>
              <textarea
                className="w-full h-32 bg-muted/30 border border-border rounded-lg p-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 text-muted-foreground"
                placeholder={`Date\tHigh\tLow\n2026-06-25\t1.27300\t1.26100`}
                value={rawData}
                onChange={e => setRawData(e.target.value)}
              />
            </div>

            <Button onClick={handleParse} className="w-full text-xs" variant="secondary">
              Parse & Calculate Stats
            </Button>
          </CardContent>
        </Card>

        {/* Stats + charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Avg Daily Range', value: result ? `${result.avgRange} pips` : '—', color: 'text-emerald-400' },
              { label: 'Max Range', value: result ? `${result.maxRange} pips` : '—', color: 'text-foreground' },
              { label: 'Min Range', value: result ? `${result.minRange} pips` : '—', color: 'text-amber-400' },
              { label: 'Peak Day', value: result?.peakDay ?? '—', color: 'text-sky-400' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-3 px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className={`text-lg font-extrabold font-mono mt-1 ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="chart">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="h-8">
                    <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
                    <TabsTrigger value="bar" className="text-xs">Day-of-Week</TabsTrigger>
                    <TabsTrigger value="line" className="text-xs">Range History</TabsTrigger>
                    <TabsTrigger value="table" className="text-xs">Day Stats Table</TabsTrigger>
                  </TabsList>
                  <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/40">
                    {result ? `${result.rows.length} days` : 'No data'}
                  </Badge>
                </div>

                <TabsContent value="chart">
                  {candles.length > 0 ? (
                    <TradingChart candles={candles} symbol={symbol} />
                  ) : (
                    <div className="h-[380px] flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Wifi className="h-8 w-8 opacity-30" />
                      <span>Fetch live data to see the candlestick chart</span>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="bar">
                  {result ? (
                    <RangeBarChart dayStats={result.dayStats} avgRange={result.avgRange} />
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                      Fetch or simulate data to see chart
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="line">
                  {result ? (
                    <RangeLineChart rows={result.rows} avgRange={result.avgRange} />
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                      Fetch or simulate data to see chart
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="table">
                  {result ? (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Day</TableHead>
                            <TableHead className="text-xs">Days counted</TableHead>
                            <TableHead className="text-xs text-emerald-400">Avg Range</TableHead>
                            <TableHead className="text-xs">% of avg</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(result.dayStats).map(([day, stats]) => {
                            const pct = result.avgRange > 0 ? Math.round((stats.avg / result.avgRange) * 100) : 0
                            return (
                              <TableRow key={day}>
                                <TableCell className="font-semibold text-xs">{day}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{stats.count}</TableCell>
                                <TableCell className="text-xs text-emerald-400 font-bold font-mono">
                                  {stats.avg > 0 ? `${stats.avg} pips` : '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${pct > 110 ? 'bg-sky-500' : pct < 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-bold">{pct}%</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-8">No data parsed yet</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-emerald-400" />
                  Export to Excel
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  disabled={!result}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-7"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Full Table
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Copy then paste into Excel cell A1 with Ctrl+V</p>
            </CardHeader>
            <CardContent>
              <textarea
                readOnly
                className="w-full h-40 bg-muted/20 border border-border rounded-lg p-3 text-xs font-mono text-muted-foreground resize-none focus:outline-none"
                value={
                  result
                    ? `Date\tDay of Week\tHigh (${symbol})\tLow (${symbol})\tRange (Pips)\n` +
                      result.rows.map(r => `${r.date}\t${r.day}\t${r.high}\t${r.low}\t${r.range}`).join('\n')
                    : ''
                }
                placeholder="Parsed table will appear here…"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
