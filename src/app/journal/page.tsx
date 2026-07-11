'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, TrendingUp, TrendingDown, BookOpen, Settings, X, Pencil, Trash2, Upload } from 'lucide-react'
import type { Portfolio, Trade } from '@/lib/types'

function pnlColor(v: number | null) {
  if (v === null) return 'text-muted-foreground'
  return v >= 0 ? 'text-emerald-400' : 'text-red-400'
}

function statusBadge(status: string) {
  if (status === 'tp_hit') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">TP Hit</Badge>
  if (status === 'sl_hit') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">SL Hit</Badge>
  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Open</Badge>
}

interface ActionPopupProps {
  trade: Trade
  onClose: () => void
  onSave: (updated: Trade) => void
  onDelete: (id: string) => void
}

const ALL_SYMBOLS = [
  { symbol: 'GBPUSD', label: 'GBP/USD' },
  { symbol: 'EURUSD', label: 'EUR/USD' },
  { symbol: 'USDJPY', label: 'USD/JPY' },
  { symbol: 'AUDUSD', label: 'AUD/USD' },
  { symbol: 'USDCAD', label: 'USD/CAD' },
  { symbol: 'USDCHF', label: 'USD/CHF' },
  { symbol: 'NZDUSD', label: 'NZD/USD' },
  { symbol: 'GBPJPY', label: 'GBP/JPY' },
  { symbol: 'EURJPY', label: 'EUR/JPY' },
  { symbol: 'EURGBP', label: 'EUR/GBP' },
  { symbol: 'AUDCAD', label: 'AUD/CAD' },
  { symbol: 'AUDCHF', label: 'AUD/CHF' },
  { symbol: 'CADJPY', label: 'CAD/JPY' },
  { symbol: 'CHFJPY', label: 'CHF/JPY' },
  { symbol: 'XAUUSD', label: 'Gold (XAU/USD)' },
  { symbol: 'XAGUSD', label: 'Silver (XAG/USD)' },
  { symbol: 'BTCUSD', label: 'Bitcoin (BTC/USD)' },
  { symbol: 'ETHUSD', label: 'Ethereum (ETH/USD)' },
]

function ActionPopup({ trade, onClose, onSave, onDelete }: ActionPopupProps) {
  const [symbol, setSymbol] = useState(trade.symbol)
  const [direction, setDirection] = useState<'long' | 'short'>(trade.direction)
  const [entry, setEntry] = useState(trade.entry.toString())
  const [tp, setTp] = useState(trade.tp?.toString() ?? '')
  const [sl, setSl] = useState(trade.sl?.toString() ?? '')
  const [qty, setQty] = useState(trade.order_quantity.toString())

  const status = trade.status
  const [notes, setNotes] = useState(trade.notes ?? '')
  const [tradedAt, setTradedAt] = useState(() => new Date(trade.traded_at).toISOString().slice(0, 16))
  const [chartFile, setChartFile] = useState<File | null>(null)
  const [chartPreview, setChartPreview] = useState<string | null>(trade.chart_url)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  function handleFile(file: File) {
    setChartFile(file)
    setChartPreview(URL.createObjectURL(file))
  }

  function calcPnl(outcome: 'tp_hit' | 'sl_hit') {
    const tpNum = tp ? parseFloat(tp) : null
    const slNum = sl ? parseFloat(sl) : null
    const entryNum = parseFloat(entry) || trade.entry
    const qtyNum = parseFloat(qty) || trade.order_quantity
    const price = outcome === 'tp_hit' ? (tpNum ?? entryNum) : (slNum ?? entryNum)
    return Math.round(qtyNum * (price - entryNum) * (direction === 'short' ? -1 : 1) * 100) / 100
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let chartUrl = trade.chart_url
    if (chartFile) {
      const form = new FormData()
      form.append('file', chartFile)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Upload failed'); setSaving(false); return }
      chartUrl = json.url
    }

    const tpNum = tp ? parseFloat(tp) : null
    const slNum = sl ? parseFloat(sl) : null
    const entryNum = parseFloat(entry)
    const qtyNum = parseFloat(qty)

    let pnl = trade.pnl
    if (status !== 'open') {
      pnl = calcPnl(status as 'tp_hit' | 'sl_hit')
    } else {
      pnl = null
    }

    const supabase = createClient()
    const { error } = await supabase.from('trades').update({
      symbol: symbol.toUpperCase(),
      direction,
      entry: entryNum,
      tp: tpNum,
      sl: slNum,
      order_quantity: qtyNum,
      status,
      pnl,
      notes: notes || null,
      traded_at: new Date(tradedAt).toISOString(),
      chart_url: chartUrl,
    }).eq('id', trade.id)

    if (error) { toast.error(error.message); setSaving(false); return }
    onSave({ ...trade, symbol: symbol.toUpperCase(), direction, entry: entryNum, tp: tpNum, sl: slNum, order_quantity: qtyNum, status, pnl, notes: notes || null, traded_at: new Date(tradedAt).toISOString(), chart_url: chartUrl })
    toast.success('Trade updated')
    onClose()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('trades').delete().eq('id', trade.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    onDelete(trade.id)
    toast.success('Trade deleted')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="font-bold text-base">Edit Trade</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Symbol + Direction */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5" ref={symbolWrapRef}>
              <Label>Symbol</Label>
              <div className="relative">
                <Input
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSuggestions(false) }}
                  placeholder="GBPUSD" required autoComplete="off"
                  className="font-mono font-bold text-emerald-400 uppercase tracking-widest h-10"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto">
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
                <SelectTrigger className="h-10">
                  <span>{{ long: 'Long (Buy)', short: 'Short (Sell)' }[direction]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">Long (Buy)</SelectItem>
                  <SelectItem value="short">Short (Sell)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entry / TP / SL */}
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

          {/* Qty / Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Quantity (lots)</Label>
              <Input value={qty} onChange={e => setQty(e.target.value)} placeholder="0.1" required type="number" step="any" min="0" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Date &amp; Time</Label>
              <Input value={tradedAt} onChange={e => setTradedAt(e.target.value)} type="datetime-local" required className="h-10" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Setup, confluences, thoughts…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Chart */}
          <div className="space-y-1.5">
            <Label>Chart Screenshot</Label>
            {chartPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={chartPreview} alt="chart" className="w-full object-cover max-h-48" />
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
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
              >
                <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              variant="outline"
              className="h-10 px-4 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
            >
              {deleting ? '…' : 'Delete'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface LogTradePopupProps {
  portfolioId: string
  onClose: () => void
  onSave: (trade: Trade) => void
}

function LogTradePopup({ portfolioId, onClose, onSave }: LogTradePopupProps) {
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
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      if (!item) return
      const file = item.getAsFile()
      if (file) { setChartFile(file); setChartPreview(URL.createObjectURL(file)) }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let chartUrl: string | null = null
    if (chartFile) {
      const form = new FormData()
      form.append('file', chartFile)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Upload failed'); setSaving(false); return }
      chartUrl = json.url
    }

    const entryNum = parseFloat(entry)
    const tpNum = tp ? parseFloat(tp) : null
    const slNum = sl ? parseFloat(sl) : null
    const qtyNum = parseFloat(qty)

    const supabase = createClient()
    const { data, error } = await supabase.from('trades').insert({
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
    }).select().single()

    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Trade logged')
    onSave(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="font-bold text-base">Log Trade</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5" ref={symbolWrapRef}>
              <Label>Symbol</Label>
              <div className="relative">
                <Input
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSuggestions(false) }}
                  placeholder="GBPUSD" required autoComplete="off"
                  className="font-mono font-bold text-emerald-400 uppercase tracking-widest h-10"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto">
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
                <SelectTrigger className="h-10">
                  <span>{{ long: 'Long (Buy)', short: 'Short (Sell)' }[direction]}</span>
                </SelectTrigger>
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
              <Label>Quantity (lots)</Label>
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

          <div className="space-y-1.5">
            <Label>Chart Screenshot</Label>
            {chartPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={chartPreview} alt="chart" className="w-full object-cover max-h-48" />
                <button type="button" onClick={() => { setChartFile(null); setChartPreview(null) }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setChartFile(f); setChartPreview(URL.createObjectURL(f)) } }}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
              >
                <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setChartFile(f); setChartPreview(URL.createObjectURL(f)) } }} />
          </div>

          <Button type="submit" disabled={saving} className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
            {saving ? 'Saving…' : 'Log Trade'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function JournalPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('viewer')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [actionTrade, setActionTrade] = useState<Trade | null>(null)
  const [statusTrade, setStatusTrade] = useState<Trade | null>(null)
  const [showLogTrade, setShowLogTrade] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const portfolioId = searchParams.get('portfolio')

  const loadPortfolios = useCallback(async () => {
    const supabase = createClient()
    await supabase.rpc('accept_pending_invites')
    const { data } = await supabase.from('portfolios').select('*').order('created_at')
    setPortfolios(data ?? [])
    return data ?? []
  }, [])

  const loadTrades = useCallback(async (pid: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('trades').select('*')
      .eq('portfolio_id', pid)
      .order('traded_at', { ascending: false })
    setTrades(data ?? [])
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      const list = await loadPortfolios()
      if (list.length === 0) { setLoading(false); return }
      const target = portfolioId ? list.find(p => p.id === portfolioId) ?? list[0] : list[0]
      setActivePortfolio(target)
      await loadTrades(target.id)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: mem } = await supabase
        .from('portfolio_members')
        .select('role')
        .eq('portfolio_id', target.id)
        .eq('user_id', user!.id)
        .single()
      setUserRole(mem?.role ?? 'viewer')
      setLoading(false)
    }
    init()
  }, [portfolioId, loadPortfolios, loadTrades])

  async function switchPortfolio(p: Portfolio) {
    setActivePortfolio(p)
    router.push(`/journal?portfolio=${p.id}`)
    await loadTrades(p.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: mem } = await supabase
      .from('portfolio_members').select('role')
      .eq('portfolio_id', p.id).eq('user_id', user!.id).single()
    setUserRole(mem?.role ?? 'viewer')
  }

  async function handleDeleteTrade(id: string) {
    if (!confirm('Delete this trade?')) return
    const supabase = createClient()
    const { error } = await supabase.from('trades').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setTrades(prev => prev.filter(t => t.id !== id))
    toast.success('Trade deleted')
  }

  async function handleQuickStatus(trade: Trade, newStatus: 'open' | 'tp_hit' | 'sl_hit') {
    let pnl: number | null = null
    if (newStatus !== 'open') {
      const price = newStatus === 'tp_hit' ? (trade.tp ?? trade.entry) : (trade.sl ?? trade.entry)
      pnl = Math.round(trade.order_quantity * (price - trade.entry) * (trade.direction === 'short' ? -1 : 1) * 100) / 100
    }
    const supabase = createClient()
    const { error } = await supabase.from('trades').update({ status: newStatus, pnl }).eq('id', trade.id)
    if (error) { toast.error(error.message); return }
    setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, status: newStatus, pnl } : t))
    setStatusTrade(null)
    toast.success('Status updated')
  }

  const closedTrades = trades.filter(t => t.status !== 'open')
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const initialEquity = activePortfolio?.initial_equity ?? 0
  const equity = initialEquity + totalPnl
  const pnlPct = initialEquity > 0 ? (totalPnl / initialEquity) * 100 : 0
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length
  const losses = closedTrades.filter(t => (t.pnl ?? 0) < 0).length
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0
  const canEdit = userRole === 'owner' || userRole === 'editor'

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Loading…</div>

  if (portfolios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">No portfolios yet</p>
        <Link href="/portfolios/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">Create your first portfolio</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold">Trade Journal</h1>
          <div className="flex gap-1.5 flex-wrap">
            {portfolios.map(p => (
              <button
                key={p.id}
                onClick={() => switchPortfolio(p)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${activePortfolio?.id === p.id ? 'bg-emerald-500 text-black border-emerald-500' : 'border-border text-muted-foreground hover:border-emerald-500/50'}`}
              >
                {p.name}
              </button>
            ))}
            <Link href="/portfolios/new">
              <button className="px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-border text-muted-foreground hover:border-emerald-500/50 transition-colors">
                + New
              </button>
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          {activePortfolio && userRole === 'owner' && (
            <Link href={`/portfolios/${activePortfolio.id}/settings`}>
              <Button variant="outline" size="sm" className="text-xs gap-1.5"><Settings className="h-3.5 w-3.5" />Settings</Button>
            </Link>
          )}
          {canEdit && activePortfolio && (
            <Button onClick={() => setShowLogTrade(true)} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs gap-1.5"><Plus className="h-3.5 w-3.5" />Log Trade</Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Equity</p>
            <p className="text-xl font-bold mt-0.5">${equity.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total PnL</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className={`text-xl font-bold ${pnlColor(totalPnl)}`}>
                {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
              </p>
              <p className={`text-xs font-mono ${pnlColor(totalPnl)}`}>
                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toLocaleString('en', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Win Rate</p>
            <p className={`text-xl font-bold mt-0.5 ${winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{winRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <span className="text-emerald-400">{wins}W</span> · <span className="text-red-400">{losses}L</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trades</p>
            <p className="text-xl font-bold mt-0.5">{trades.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{closedTrades.length} closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Trade list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No trades yet — log your first trade.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left pb-2 pr-4">Date</th>
                    <th className="text-left pb-2 pr-4">Symbol</th>
                    <th className="text-left pb-2 pr-4">Dir</th>
                    <th className="text-right pb-2 pr-4">Entry</th>
                    <th className="text-right pb-2 pr-4 text-emerald-400">TP</th>
                    <th className="text-right pb-2 pr-4 text-red-400">SL</th>
                    <th className="text-right pb-2 pr-4">Qty</th>

                    <th className="text-right pb-2 pr-4">PnL</th>
                    <th className="text-left pb-2 pr-4">Status</th>
                    <th className="text-left pb-2">Chart</th>
                    {canEdit && <th className="text-right pb-2">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trades.map(t => {
                    const tradePnlPct = t.pnl !== null && initialEquity > 0 ? (t.pnl / initialEquity) * 100 : null
                    return (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">{new Date(t.traded_at).toLocaleDateString()}</td>
                      <td className="py-2.5 pr-4 font-mono font-bold text-emerald-400">{t.symbol}</td>
                      <td className="py-2.5 pr-4">
                        {t.direction === 'long'
                          ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">{t.entry}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-emerald-400">{t.tp ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-right font-mono text-red-400">{t.sl ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">{t.order_quantity}</td>

                      <td className={`py-2.5 pr-4 text-right font-mono font-bold ${pnlColor(t.pnl)}`}>
                        {tradePnlPct !== null ? (
                          <span className="flex flex-col items-end">
                            <span>{tradePnlPct >= 0 ? '+' : ''}{tradePnlPct.toFixed(2)}%</span>
                            <span className="text-[10px] font-normal opacity-70">
                              {t.pnl! >= 0 ? '+' : ''}${Math.abs(t.pnl!).toFixed(2)}
                            </span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        {canEdit
                          ? <button onClick={() => setStatusTrade(t)} className="cursor-pointer hover:opacity-80 transition-opacity">{statusBadge(t.status)}</button>
                          : statusBadge(t.status)}
                      </td>
                      <td className="py-2.5 pr-4">
                        {t.chart_url
                          ? <button onClick={() => setLightboxUrl(t.chart_url)} className="text-xs text-emerald-400 hover:underline">View</button>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      {canEdit && (
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setActionTrade(t)}
                              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log trade popup */}
      {showLogTrade && activePortfolio && (
        <LogTradePopup
          portfolioId={activePortfolio.id}
          onClose={() => setShowLogTrade(false)}
          onSave={trade => setTrades(prev => [trade, ...prev])}
        />
      )}

      {/* Action popup */}
      {actionTrade && (
        <ActionPopup
          trade={actionTrade}
          onClose={() => setActionTrade(null)}
          onSave={updated => setTrades(prev => prev.map(t => t.id === updated.id ? updated : t))}
          onDelete={id => setTrades(prev => prev.filter(t => t.id !== id))}
        />
      )}

      {/* Quick status popup */}
      {statusTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setStatusTrade(null)}>
          <div className="bg-card border border-border rounded-xl p-5 shadow-xl w-64" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">Update Status</p>
              <button onClick={() => setStatusTrade(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleQuickStatus(statusTrade, 'tp_hit')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusTrade.status === 'tp_hit' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                TP Hit
              </button>
              <button
                onClick={() => handleQuickStatus(statusTrade, 'sl_hit')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusTrade.status === 'sl_hit' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                SL Hit
              </button>
              <button
                onClick={() => handleQuickStatus(statusTrade, 'open')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusTrade.status === 'open' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'}`}
              >
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="chart"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
