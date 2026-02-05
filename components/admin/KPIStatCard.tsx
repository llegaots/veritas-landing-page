'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendSparkline } from './TrendSparkline'
import { formatNumber, formatDelta } from '@/lib/admin/format'
import { KPITrend } from '@/lib/admin/types'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPIStatCardProps {
  title: string
  value: number | string
  trend?: KPITrend
  formatValue?: (value: number | string) => string
  description?: string
  className?: string
}

export function KPIStatCard({
  title,
  value,
  trend,
  formatValue = (val: number | string) => typeof val === 'number' ? formatNumber(val) : String(val),
  description,
  className,
}: KPIStatCardProps) {
  const displayValue = formatValue(value)

  const trendIcon =
    trend?.trend === 'up' ? (
      <ArrowUp className="h-3 w-3" />
    ) : trend?.trend === 'down' ? (
      <ArrowDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    )

  const trendColor =
    trend?.trend === 'up'
      ? 'text-green-600'
      : trend?.trend === 'down'
        ? 'text-red-600'
        : 'text-gray-400'

  return (
    <Card className={cn('bg-white border-0 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl overflow-hidden group cursor-pointer', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 mb-2">{displayValue}</div>
        {trend && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1">
              <TrendSparkline
                data={trend.sparklineData}
                trend={trend.trend}
                height={30}
              />
            </div>
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
        <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-3 rounded-full"></div>
      </CardContent>
    </Card>
  )
}
