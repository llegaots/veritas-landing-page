'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Insight } from '@/lib/admin/insights'
import { AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickInsightsProps {
  insights: Insight[]
  topDrivers?: Array<{
    event: string
    delta: number
    deltaPercent: number
    trend: 'up' | 'down' | 'neutral'
  }>
  onViewDetails?: () => void
}

export function QuickInsights({
  insights,
  topDrivers,
  onViewDetails,
}: QuickInsightsProps) {
  const [expanded, setExpanded] = useState(false)

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return 'bg-red-50 border-red-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[hsl(var(--foreground))]">Quick Insights</CardTitle>
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
      <CardContent className="space-y-3">
        {/* Alerts/Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, expanded ? insights.length : 2).map((insight, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3 rounded-lg border flex items-start gap-3',
                  getInsightColor(insight.type)
                )}
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[hsl(var(--foreground))]">{insight.title}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{insight.message}</div>
                  {insight.action && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1 text-xs"
                      onClick={insight.action.onClick}
                    >
                      {insight.action.label}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Drivers */}
        {topDrivers && topDrivers.length > 0 && expanded && (
          <div className="pt-3 border-t border-[hsl(var(--border))]">
            <h4 className="text-sm font-medium text-[hsl(var(--foreground))] mb-2">Top Changes</h4>
            <div className="space-y-2">
              {topDrivers.slice(0, 3).map((driver, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded hover:bg-[hsl(var(--accent))]"
                >
                  <span className="text-sm text-[hsl(var(--foreground))]">{driver.event}</span>
                  <Badge
                    variant={
                      driver.trend === 'up'
                        ? 'default'
                        : driver.trend === 'down'
                          ? 'destructive'
                          : 'secondary'
                    }
                    className="text-xs"
                  >
                    {driver.deltaPercent > 0 ? '+' : ''}
                    {driver.deltaPercent.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.length === 0 && (!topDrivers || topDrivers.length === 0) && (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">
            No insights available for this period
          </p>
        )}
      </CardContent>
    </Card>
  )
}

