'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/admin/format'

interface FunnelStep {
  label: string
  value: number
  color: string
}

interface FunnelChartProps {
  steps: FunnelStep[]
  title?: string
}

export function FunnelChart({ steps, title = 'Conversion Funnel' }: FunnelChartProps) {
  const maxValue = Math.max(...steps.map((s) => s.value))
  const data = steps.map((step, index) => ({
    ...step,
    percentage: maxValue > 0 ? (step.value / maxValue) * 100 : 0,
    dropoff:
      index > 0
        ? ((steps[index - 1].value - step.value) / steps[index - 1].value) * 100
        : 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((step, index) => (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">{step.value.toLocaleString()}</span>
                  {index > 0 && (
                    <span className="text-xs text-red-600">
                      -{formatPercent(step.dropoff)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${step.percentage}%`,
                    backgroundColor: step.color,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                  {formatPercent(step.percentage)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


