import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  BarChart2,
  Download,
  Wifi,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Wifi,
    title: 'Live Market Data',
    description: 'Pulls real OHLC history from Twelve Data for any forex pair, gold, or crypto — refreshed on demand.',
  },
  {
    icon: BarChart2,
    title: 'Statistical Edge Analysis',
    description: 'Calculates average, max and min pip ranges plus a day-of-week volatility breakdown so you know when markets move.',
  },
  {
    icon: Download,
    title: 'One-Click Excel Export',
    description: 'Structured tab-separated table ready to paste straight into Excel or Google Sheets at cell A1.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Private',
    description: 'Your data never leaves the app. Auth is handled by Supabase — industry-standard row-level security.',
  },
]

const PAIRS = ['GBPUSD', 'EURUSD', 'USDJPY', 'GBPJPY', 'XAUUSD', 'BTCUSD', 'AUDUSD', 'USDCAD']

const STATS = [
  { value: '12+', label: 'Supported pairs' },
  { value: '65', label: 'Days of history' },
  { value: '5', label: 'Day-of-week stats' },
  { value: '1-click', label: 'Excel export' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-sm">ForexAnalytics</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center">
        <Badge variant="outline" className="mb-6 text-emerald-400 border-emerald-500/40 text-xs px-3 py-1">
          <Wifi className="h-3 w-3 mr-1.5" />
          Live forex data via Twelve Data
        </Badge>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          Know exactly when{' '}
          <span className="text-emerald-400">markets move</span>
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Fetch live OHLC history for any forex pair, calculate your statistical edge,
          and export a clean table straight into Excel — in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button className="h-11 px-8 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm">
              Start for free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="h-11 px-8 text-sm">
              Sign in
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Pair pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-14">
          {PAIRS.map(pair => (
            <span
              key={pair}
              className="px-3 py-1 rounded-full bg-muted/50 border border-border text-xs font-mono font-bold text-muted-foreground"
            >
              {pair}
            </span>
          ))}
          <span className="px-3 py-1 rounded-full bg-muted/50 border border-border text-xs font-mono text-muted-foreground">
            + any symbol
          </span>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-emerald-400 font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold tracking-tight mb-3">Everything you need</h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            Built for traders who want clean data fast — no bloat, no subscriptions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 flex gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4">Ready to find your edge?</h2>
          <p className="text-muted-foreground mb-8 text-base max-w-md mx-auto">
            Create a free account and get your first analysis in under a minute.
          </p>
          <Link href="/register">
            <Button className="h-11 px-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm">
              Create free account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold">ForexAnalytics</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; 2026 ForexAnalytics. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
