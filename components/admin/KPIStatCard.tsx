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
  formatValue?: (value: number) => string
  description?: string
  className?: string
}

export function KPIStatCard({
  title,
  value,
  trend,
  formatValue = formatNumber,
  description,
  className,
}: KPIStatCardProps) {
  const displayValue =
    typeof value === 'string' ? value : typeof value === 'number' ? formatValue(value) : String(value)

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
        : 'text-[hsl(var(--muted-foreground))]'

  return (
    <Card className={cn('bg-[hsl(var(--card))] border-[hsl(var(--border))]', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{displayValue}</div>
        {trend && (
          <div className="mt-2 flex items-center gap-2">
            <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
              {trendIcon}
              <span>{formatDelta(trend.deltaPercent, true)}</span>
            </div>
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
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

