'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { DayRow } from '@/lib/forex'

interface Props {
  rows: DayRow[]
  avgRange: number
}

export function RangeLineChart({ rows, avgRange }: Props) {
  const data = [...rows].reverse().map(r => ({
    date: r.date.slice(5),
    range: r.range,
    day: r.day.slice(0, 3),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit=" p" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value} pips`, 'Range']}
          labelFormatter={label => `Date: ${label}`}
        />
        <ReferenceLine y={avgRange} stroke="hsl(152 76% 47%)" strokeDasharray="4 2" label={{ value: 'Avg', fill: 'hsl(152 76% 47%)', fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="range"
          stroke="hsl(199 89% 48%)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
