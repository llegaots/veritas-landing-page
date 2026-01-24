'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface TrendSparklineProps {
  data: Array<{ date: string; value: number }>
  trend: 'up' | 'down' | 'neutral'
  height?: number
}

export function TrendSparkline({
  data,
  trend,
  height = 40,
}: TrendSparklineProps) {
  const color =
    trend === 'up'
      ? '#10b981' // green
      : trend === 'down'
        ? '#ef4444' // red
        : '#6b7280' // gray

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

