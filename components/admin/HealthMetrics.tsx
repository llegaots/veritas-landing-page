'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KPIStatCard } from './KPIStatCard'
import { KPITrend } from '@/lib/admin/types'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HealthMetricsProps {
  conversionRate: string
  conversionTrend?: KPITrend
  quickExitRate: string
  quickExitTrend?: KPITrend
  avgTimeOnPage: number
  avgTimeTrend?: KPITrend
  returnVisitorRate: number
  returnVisitorTrend?: KPITrend
}

export function HealthMetrics({
  conversionRate,
  conversionTrend,
  quickExitRate,
  quickExitTrend,
  avgTimeOnPage,
  avgTimeTrend,
  returnVisitorRate,
  returnVisitorTrend,
}: HealthMetricsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Health Metrics</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? 'Show Less' : 'Show More'}
            {expanded ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('grid grid-cols-2 gap-4', expanded && 'lg:grid-cols-4')}>
          <KPIStatCard
            title="Conversion Rate"
            value={conversionRate}
            formatValue={(v) => `${typeof v === 'string' ? v : v.toFixed(1)}%`}
            trend={conversionTrend}
            description="CTA clicks → Demo booked"
          />
          <KPIStatCard
            title="Quick Exit Rate"
            value={quickExitRate}
            formatValue={(v) => `${typeof v === 'string' ? v : v.toFixed(1)}%`}
            trend={quickExitTrend}
            description="Left within 10s, no engagement"
          />
          {expanded && (
            <>
              <KPIStatCard
                title="Avg Time on Page"
                value={`${avgTimeOnPage}s`}
                formatValue={(v) => `${v}s`}
                trend={avgTimeTrend}
              />
              <KPIStatCard
                title="Return Visitor Rate"
                value={`${returnVisitorRate}%`}
                formatValue={(v) => `${v}%`}
                trend={returnVisitorTrend}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

