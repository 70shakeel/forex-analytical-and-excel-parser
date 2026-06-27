'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { DayStats } from '@/lib/forex'

interface Props {
  dayStats: Record<string, DayStats>
  avgRange: number
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export function RangeBarChart({ dayStats, avgRange }: Props) {
  const data = DAYS.map(day => ({
    day: day.slice(0, 3),
    avg: dayStats[day]?.avg ?? 0,
    count: dayStats[day]?.count ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit=" p" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [`${value} pips`, 'Avg Range']}
        />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.avg > avgRange * 1.1
                  ? 'hsl(199 89% 48%)'
                  : entry.avg < avgRange * 0.85
                  ? 'hsl(43 96% 56%)'
                  : 'hsl(152 76% 47%)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
