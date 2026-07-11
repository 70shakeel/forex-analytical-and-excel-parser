'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Upload, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

export default function NewTradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const portfolioId = searchParams.get('portfolio') ?? ''

  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entry, setEntry] = useState('')
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [qty, setQty] = useState('')

  const [tradedAt, setTradedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [notes, setNotes] = useState('')
  const [chartFile, setChartFile] = useState<File | null>(null)
  const [chartPreview, setChartPreview] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const symbolWrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const query = symbol.toUpperCase()
  const suggestions = query.length === 0
    ? ALL_SYMBOLS
    : ALL_SYMBOLS.filter(s => s.symbol.includes(query) || s.label.toUpperCase().includes(query))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (symbolWrapRef.current && !symbolWrapRef.current.contains(e.target as Node))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Global paste handler
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (file) handleFile(file)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFile(file: File) {
    setChartFile(file)
    setChartPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!portfolioId) { toast.error('No portfolio selected'); return }
    setLoading(true)

    let chartUrl: string | null = null
    if (chartFile) {
      const form = new FormData()
      form.append('file', chartFile)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Upload failed'); setLoading(false); return }
      chartUrl = json.url
    }

    const entryNum = parseFloat(entry)
    const tpNum = tp ? parseFloat(tp) : null
    const slNum = sl ? parseFloat(sl) : null
    const qtyNum = parseFloat(qty)
    const supabase = createClient()
    const { error } = await supabase.from('trades').insert({
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      direction,
      entry: entryNum,
      tp: tpNum,
      sl: slNum,
      order_quantity: qtyNum,
      chart_url: chartUrl,
      notes: notes || null,
      traded_at: new Date(tradedAt).toISOString(),
    })

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Trade logged')
    router.push(`/journal?portfolio=${portfolioId}`)
  }

  const backUrl = `/journal${portfolioId ? `?portfolio=${portfolioId}` : ''}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8 px-4"
      onClick={() => router.push(backUrl)}
    >
      <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <Link href={backUrl}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs"><ArrowLeft className="h-3.5 w-3.5" />Back</Button>
          </Link>
          <h1 className="text-xl font-bold">Log Trade</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5" ref={symbolWrapRef}>
                  <Label>Symbol</Label>
                  <div className="relative">
                    <Input
                      value={symbol}
                      onChange={e => setSymbol(e.target.value.toUpperCase())}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={e => { if (e.key === 'Escape') setShowSuggestions(false) }}
                      placeholder="GBPUSD" required
                      autoComplete="off"
                      className="font-mono font-bold text-emerald-400 uppercase tracking-widest h-10"
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {suggestions.map(s => (
                          <button
                            key={s.symbol} type="button"
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors text-left"
                            onMouseDown={e => { e.preventDefault(); setSymbol(s.symbol); setShowSuggestions(false) }}
                          >
                            <span className="text-sm font-mono font-bold">{s.symbol}</span>
                            <span className="text-xs text-muted-foreground">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Direction</Label>
                  <Select value={direction} onValueChange={v => setDirection(v as 'long' | 'short')}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long (Buy)</SelectItem>
                      <SelectItem value="short">Short (Sell)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Entry</Label>
                  <Input value={entry} onChange={e => setEntry(e.target.value)} placeholder="1.2345" required type="number" step="any" className="h-10 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Take Profit</Label>
                  <Input value={tp} onChange={e => setTp(e.target.value)} placeholder="1.2500" type="number" step="any" className="h-10 font-mono text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <Label>Stop Loss</Label>
                  <Input value={sl} onChange={e => setSl(e.target.value)} placeholder="1.2200" type="number" step="any" className="h-10 font-mono text-red-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Order Quantity (lots)</Label>
                  <Input value={qty} onChange={e => setQty(e.target.value)} placeholder="0.1" required type="number" step="any" min="0" className="h-10 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Date &amp; Time</Label>
                  <Input value={tradedAt} onChange={e => setTradedAt(e.target.value)} type="datetime-local" required className="h-10" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Setup, confluences, thoughts…"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              {/* Chart upload */}
              <div className="space-y-1.5">
                <Label>Chart Screenshot</Label>
                {chartPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border">
                    <img
                      src={chartPreview} alt="chart"
                      className="w-full object-cover max-h-64 cursor-zoom-in"
                      onClick={() => setLightbox(true)}
                    />
                    <button type="button" onClick={() => { setChartFile(null); setChartPreview(null) }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
                  >
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & drop, click, or <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">⌘V</kbd> to paste</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>

              <Button type="submit" disabled={loading}
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                {loading ? 'Saving…' : 'Log Trade'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {/* Lightbox */}
      {lightbox && chartPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={chartPreview}
            alt="chart fullscreen"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

