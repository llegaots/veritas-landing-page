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
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Health Metrics</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 cursor-pointer"
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
                value={`${returnVisitorRate.toFixed(1)}%`}
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
