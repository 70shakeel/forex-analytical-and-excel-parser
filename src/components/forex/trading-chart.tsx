'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
} from 'lightweight-charts'
import type { OhlcBar } from '@/app/api/forex/route'
import { ema, sma, bollingerBands, rsi, macd } from '@/lib/indicators'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Indicator = 'EMA20' | 'EMA50' | 'SMA200' | 'BB' | 'RSI' | 'MACD'

interface Props {
  candles: OhlcBar[]
  symbol: string
}

const CHART_BG = '#0f172a'
const GRID = '#1e293b'
const TEXT = '#94a3b8'
const UP = '#10b981'
const DOWN = '#f43f5e'

type Time = `${number}-${number}-${number}`

export function TradingChart({ candles, symbol }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const rsiRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)

  const chartRef = useRef<IChartApi | null>(null)
  const rsiChartRef = useRef<IChartApi | null>(null)
  const macdChartRef = useRef<IChartApi | null>(null)

  const [activeIndicators, setActiveIndicators] = useState<Set<Indicator>>(new Set(['EMA20', 'EMA50']))
  const [lastPrice, setLastPrice] = useState<number | null>(null)

  function toggleIndicator(ind: Indicator) {
    setActiveIndicators(prev => {
      const next = new Set(prev)
      next.has(ind) ? next.delete(ind) : next.add(ind)
      return next
    })
  }

  useEffect(() => {
    if (!mainRef.current || candles.length === 0) return

    const commonOpts = {
      layout: { background: { type: ColorType.Solid, color: CHART_BG }, textColor: TEXT },
      grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
      rightPriceScale: { borderColor: GRID },
      timeScale: { borderColor: GRID, timeVisible: true },
      crosshair: { mode: CrosshairMode.Normal },
    }

    // Cleanup
    chartRef.current?.remove(); chartRef.current = null
    rsiChartRef.current?.remove(); rsiChartRef.current = null
    macdChartRef.current?.remove(); macdChartRef.current = null

    // ── Main chart ──
    const chart = createChart(mainRef.current, { ...commonOpts, width: mainRef.current.clientWidth, height: 380 })
    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP, downColor: DOWN,
      borderUpColor: UP, borderDownColor: DOWN,
      wickUpColor: UP, wickDownColor: DOWN,
    })
    candleSeries.setData(candles.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })))
    setLastPrice(candles[candles.length - 1]?.close ?? null)

    const extraSeries: ISeriesApi<SeriesType>[] = []

    if (activeIndicators.has('EMA20')) {
      const s = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1, title: 'EMA 20' })
      s.setData(ema(candles, 20).map(p => ({ time: p.time as Time, value: p.value })))
      extraSeries.push(s)
    }
    if (activeIndicators.has('EMA50')) {
      const s = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'EMA 50' })
      s.setData(ema(candles, 50).map(p => ({ time: p.time as Time, value: p.value })))
      extraSeries.push(s)
    }
    if (activeIndicators.has('SMA200') && candles.length >= 200) {
      const s = chart.addSeries(LineSeries, { color: '#c084fc', lineWidth: 1, title: 'SMA 200' })
      s.setData(sma(candles, 200).map(p => ({ time: p.time as Time, value: p.value })))
      extraSeries.push(s)
    }
    if (activeIndicators.has('BB')) {
      const bb = bollingerBands(candles, 20, 2)
      ;[
        { data: bb.map(p => ({ time: p.time as Time, value: p.upper })), color: '#64748b', title: 'BB Upper' },
        { data: bb.map(p => ({ time: p.time as Time, value: p.middle })), color: '#94a3b8', title: 'BB Mid' },
        { data: bb.map(p => ({ time: p.time as Time, value: p.lower })), color: '#64748b', title: 'BB Lower' },
      ].forEach(({ data, color, title }) => {
        const s = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: 2, title })
        s.setData(data)
        extraSeries.push(s)
      })
    }

    chart.timeScale().fitContent()

    // ── RSI panel ──
    if (activeIndicators.has('RSI') && rsiRef.current) {
      const rsiChart = createChart(rsiRef.current, { ...commonOpts, width: rsiRef.current.clientWidth, height: 140 })
      rsiChartRef.current = rsiChart

      const rsiData = rsi(candles, 14)
      const rsiLine = rsiChart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1, title: 'RSI 14' })
      rsiLine.setData(rsiData.map(p => ({ time: p.time as Time, value: p.value })))

      const ob = rsiChart.addSeries(LineSeries, { color: '#f43f5e', lineWidth: 1, lineStyle: 2 })
      ob.setData(rsiData.map(p => ({ time: p.time as Time, value: 70 })))
      const os = rsiChart.addSeries(LineSeries, { color: '#10b981', lineWidth: 1, lineStyle: 2 })
      os.setData(rsiData.map(p => ({ time: p.time as Time, value: 30 })))

      rsiChart.timeScale().fitContent()
    }

    // ── MACD panel ──
    if (activeIndicators.has('MACD') && macdRef.current) {
      const macdChart = createChart(macdRef.current, { ...commonOpts, width: macdRef.current.clientWidth, height: 140 })
      macdChartRef.current = macdChart

      const macdData = macd(candles)
      const macdLine = macdChart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 1, title: 'MACD' })
      macdLine.setData(macdData.map(p => ({ time: p.time as Time, value: p.macd })))
      const signalLine = macdChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'Signal' })
      signalLine.setData(macdData.map(p => ({ time: p.time as Time, value: p.signal })))
      const hist = macdChart.addSeries(HistogramSeries, { title: 'Histogram' })
      hist.setData(macdData.map(p => ({ time: p.time as Time, value: p.histogram, color: p.histogram >= 0 ? UP : DOWN })))

      macdChart.timeScale().fitContent()
    }

    // Sync timescales
    const panels = [rsiChartRef.current, macdChartRef.current].filter(Boolean) as IChartApi[]
    if (panels.length > 0) {
      chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range) panels.forEach(p => p.timeScale().setVisibleLogicalRange(range))
      })
    }

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (mainRef.current) chart.resize(mainRef.current.clientWidth, 380)
      if (rsiRef.current && rsiChartRef.current) rsiChartRef.current.resize(rsiRef.current.clientWidth, 140)
      if (macdRef.current && macdChartRef.current) macdChartRef.current.resize(macdRef.current.clientWidth, 140)
    })
    ro.observe(mainRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      rsiChartRef.current?.remove()
      macdChartRef.current?.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, activeIndicators])

  const INDICATOR_BUTTONS: { key: Indicator; label: string; color: string }[] = [
    { key: 'EMA20',  label: 'EMA 20',    color: 'text-sky-400 border-sky-500/40' },
    { key: 'EMA50',  label: 'EMA 50',    color: 'text-amber-400 border-amber-500/40' },
    { key: 'SMA200', label: 'SMA 200',   color: 'text-purple-400 border-purple-500/40' },
    { key: 'BB',     label: 'Bollinger', color: 'text-slate-400 border-slate-500/40' },
    { key: 'RSI',    label: 'RSI',       color: 'text-violet-400 border-violet-500/40' },
    { key: 'MACD',   label: 'MACD',      color: 'text-emerald-400 border-emerald-500/40' },
  ]

  return (
    <div className="space-y-1">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold font-mono">{symbol}</span>
          {lastPrice !== null && (
            <span className="text-sm font-mono text-emerald-400 font-bold">{lastPrice}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INDICATOR_BUTTONS.map(b => (
            <Button
              key={b.key}
              variant="outline"
              size="sm"
              onClick={() => toggleIndicator(b.key)}
              className={`h-6 px-2 text-[11px] font-bold border transition-all ${
                activeIndicators.has(b.key)
                  ? `${b.color} bg-muted/40`
                  : 'text-muted-foreground border-border opacity-50'
              }`}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Candlestick */}
      <div ref={mainRef} className="w-full rounded-lg overflow-hidden" />

      {/* RSI */}
      {activeIndicators.has('RSI') && (
        <div>
          <div className="flex items-center gap-2 py-1 px-1">
            <Badge variant="outline" className="text-[10px] text-violet-400 border-violet-500/40">RSI 14</Badge>
            <span className="text-[10px] text-muted-foreground">70 overbought · 30 oversold</span>
          </div>
          <div ref={rsiRef} className="w-full rounded-lg overflow-hidden" />
        </div>
      )}

      {/* MACD */}
      {activeIndicators.has('MACD') && (
        <div>
          <div className="flex items-center gap-2 py-1 px-1">
            <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/40">MACD 12/26/9</Badge>
          </div>
          <div ref={macdRef} className="w-full rounded-lg overflow-hidden" />
        </div>
      )}
    </div>
  )
}
