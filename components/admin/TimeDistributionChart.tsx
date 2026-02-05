'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimeDistributionChartProps {
  timeEvents: Array<{ seconds: number }>
  title?: string
}

export function TimeDistributionChart({
  timeEvents,
  title = 'Time on Page Distribution',
}: TimeDistributionChartProps) {
  // Create buckets: 0-10s, 10-30s, 30-60s, 60-120s, 120s+
  const buckets = [
    { label: '0-10s', min: 0, max: 10, count: 0, color: '#ef4444' },
    { label: '10-30s', min: 10, max: 30, count: 0, color: '#f59e0b' },
    { label: '30-60s', min: 30, max: 60, count: 0, color: '#3b82f6' },
    { label: '60-120s', min: 60, max: 120, count: 0, color: '#10b981' },
    { label: '120s+', min: 120, max: Infinity, count: 0, color: '#8b5cf6' },
  ]

  timeEvents.forEach((event) => {
    const seconds = event.seconds
    const bucket = buckets.find(
      (b) => seconds >= b.min && seconds < b.max
    )
    if (bucket) {
      bucket.count++
    }
  })

  const data = buckets.map((bucket) => ({
    name: bucket.label,
    value: bucket.count,
    color: bucket.color,
  }))

  const maxValue = Math.max(...data.map((d) => d.value), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="text-center">
              <div className="font-semibold">{bucket.count}</div>
              <div className="text-gray-500">{bucket.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


