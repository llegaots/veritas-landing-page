'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Insight } from '@/lib/admin/insights'
import { AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react'
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
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'info':
        return <Info className="h-4 w-4 text-purple-500" />
    }
  }

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'alert':
        return 'bg-red-50 border-red-200 hover:bg-red-100'
      case 'success':
        return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'info':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  }

  return (
    <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Quick Insights</CardTitle>
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
      <CardContent className="space-y-3">
        {/* Alerts/Insights */}
        {insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, expanded ? insights.length : 2).map((insight, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-4 rounded-lg border flex items-start gap-3 transition-all duration-200',
                  getInsightColor(insight.type)
                )}
              >
                {getInsightIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{insight.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{insight.message}</div>
                  {insight.action && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-2 text-xs text-purple-600 hover:text-purple-700 cursor-pointer"
                      onClick={insight.action.onClick}
                    >
                      {insight.action.label}
                      <ChevronDown className="ml-1 h-3 w-3 rotate-[-90deg]" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Drivers */}
        {topDrivers && topDrivers.length > 0 && expanded && (
          <div className="pt-3 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Changes</h4>
            <div className="space-y-2">
              {topDrivers.slice(0, 3).map((driver, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-50 transition-colors duration-200 border border-gray-100"
                >
                  <span className="text-sm font-medium text-gray-700">{driver.event}</span>
                  <div className="flex items-center gap-2">
                    {driver.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {driver.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.length === 0 && (!topDrivers || topDrivers.length === 0) && (
          <p className="text-sm text-gray-500 text-center py-8">
            No insights available for this period
          </p>
        )}
      </CardContent>
    </Card>
  )
}
