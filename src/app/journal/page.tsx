'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, TrendingUp, TrendingDown, BookOpen, Settings, X, MoreHorizontal } from 'lucide-react'
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

function ActionPopup({ trade, onClose, onSave, onDelete }: ActionPopupProps) {
  const [tp, setTp] = useState(trade.tp?.toString() ?? '')
  const [sl, setSl] = useState(trade.sl?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function calcPnl(status: 'tp_hit' | 'sl_hit', tpVal: number | null, slVal: number | null) {
    const price = status === 'tp_hit' ? (tpVal ?? trade.entry) : (slVal ?? trade.entry)
    return Math.round(trade.order_quantity * (price - trade.entry) * (trade.direction === 'short' ? -1 : 1) * 100) / 100
  }

  async function handleMark(status: 'tp_hit' | 'sl_hit') {
    setSaving(true)
    const tpNum = tp ? parseFloat(tp) : null
    const slNum = sl ? parseFloat(sl) : null
    const pnl = calcPnl(status, tpNum, slNum)
    const supabase = createClient()
    const { error } = await supabase
      .from('trades')
      .update({ status, pnl, tp: tpNum, sl: slNum })
      .eq('id', trade.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    onSave({ ...trade, status, pnl, tp: tpNum, sl: slNum })
    toast.success(status === 'tp_hit' ? 'TP hit marked' : 'SL hit marked')
    onClose()
  }

  async function handleSavePrices() {
    setSaving(true)
    const tpNum = tp ? parseFloat(tp) : null
    const slNum = sl ? parseFloat(sl) : null
    const supabase = createClient()
    const { error } = await supabase
      .from('trades').update({ tp: tpNum, sl: slNum }).eq('id', trade.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    onSave({ ...trade, tp: tpNum, sl: slNum })
    toast.success('Prices updated')
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

  const tpPnl = tp ? calcPnl('tp_hit', parseFloat(tp), null) : null
  const slPnl = sl ? calcPnl('sl_hit', null, parseFloat(sl)) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-400 text-lg">{trade.symbol}</span>
              {trade.direction === 'long'
                ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                : <TrendingDown className="h-4 w-4 text-red-400" />}
              {statusBadge(trade.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Entry: <span className="font-mono text-foreground">{trade.entry}</span> · Qty: <span className="font-mono text-foreground">{trade.order_quantity}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Price editors */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Edit TP / SL</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Take Profit</label>
              <Input
                value={tp} onChange={e => setTp(e.target.value)}
                type="number" step="any" placeholder="—"
                className="h-9 font-mono text-emerald-400 border-emerald-500/30 focus:border-emerald-500"
              />
              {tpPnl !== null && (
                <p className={`text-[11px] font-mono ${tpPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tpPnl >= 0 ? '+' : ''}{tpPnl.toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-red-400 uppercase tracking-wider">Stop Loss</label>
              <Input
                value={sl} onChange={e => setSl(e.target.value)}
                type="number" step="any" placeholder="—"
                className="h-9 font-mono text-red-400 border-red-500/30 focus:border-red-500"
              />
              {slPnl !== null && (
                <p className={`text-[11px] font-mono ${slPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {slPnl >= 0 ? '+' : ''}{slPnl.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          <Button onClick={handleSavePrices} disabled={saving} variant="outline" size="sm" className="w-full text-xs">
            Save Prices
          </Button>
        </div>

        {/* Mark outcome — only for open trades */}
        {trade.status === 'open' && (
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Mark Outcome</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleMark('tp_hit')}
                disabled={saving}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
                variant="outline"
              >
                ✓ TP Hit
              </Button>
              <Button
                onClick={() => handleMark('sl_hit')}
                disabled={saving}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold"
                variant="outline"
              >
                ✕ SL Hit
              </Button>
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="pt-1 border-t border-border">
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="outline"
            size="sm"
            className="w-full text-xs text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
          >
            {deleting ? 'Deleting…' : 'Delete Trade'}
          </Button>
        </div>
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

  const closedTrades = trades.filter(t => t.status !== 'open')
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const equity = activePortfolio ? activePortfolio.initial_equity + totalPnl : 0
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length
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
            <Link href={`/journal/new?portfolio=${activePortfolio.id}`}>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs gap-1.5"><Plus className="h-3.5 w-3.5" />Log Trade</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Equity', value: `$${equity.toLocaleString('en', { minimumFractionDigits: 2 })}`, color: 'text-foreground' },
          { label: 'Total PnL', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString('en', { minimumFractionDigits: 2 })}`, color: pnlColor(totalPnl) },
          { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Trades', value: `${trades.length}`, color: 'text-foreground' },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
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
                  {trades.map(t => (
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
                        {t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4">{statusBadge(t.status)}</td>
                      <td className="py-2.5 pr-4">
                        {t.chart_url
                          ? <button onClick={() => setLightboxUrl(t.chart_url)} className="text-xs text-emerald-400 hover:underline">View</button>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      {canEdit && (
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setActionTrade(t)}
                            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action popup */}
      {actionTrade && (
        <ActionPopup
          trade={actionTrade}
          onClose={() => setActionTrade(null)}
          onSave={updated => setTrades(prev => prev.map(t => t.id === updated.id ? updated : t))}
          onDelete={id => setTrades(prev => prev.filter(t => t.id !== id))}
        />
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
