'use client'

import { VisitorProfile } from '@/lib/admin/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/admin/format'
import { CheckCircle2, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeadCardProps {
  lead: VisitorProfile
  onClick?: () => void
  selected?: boolean
  onSelect?: (selected: boolean) => void
}

export function LeadCard({
  lead,
  onClick,
  selected = false,
  onSelect,
}: LeadCardProps) {
  const hasName = !!lead.name
  const hasBookedDemo = lead.demo_booked > 0
  const isHighIntent = lead.intent_score >= 5

  return (
    <Card
      className={cn(
        'bg-white border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-purple-300 rounded-lg overflow-hidden',
        selected && 'ring-2 ring-purple-500 border-purple-500',
        hasBookedDemo && 'border-green-300 bg-green-50/30'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onSelect && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation()
                  onSelect(e.target.checked)
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer flex-shrink-0"
              />
            )}
            <h3 className="font-semibold text-gray-900 text-sm leading-tight break-words flex-1 min-w-0">
              {lead.name || `Visitor ${lead.anonymous_id.substring(0, 12)}`}
            </h3>
            {hasBookedDemo && (
              <Badge className="bg-green-100 text-green-700 border-0 text-xs px-2 py-0.5 flex-shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Demo
              </Badge>
            )}
            {isHighIntent && !hasBookedDemo && (
              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs px-2 py-0.5 flex-shrink-0">
                High Intent
              </Badge>
            )}
          </div>
        </div>

        {/* Intent Score - Large */}
        <div className="mb-2.5">
          <div className="flex items-baseline gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-gray-500 font-medium">Intent:</span>
              <span className={cn(
                'text-2xl font-bold leading-none',
                lead.intent_score >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {lead.intent_score.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
          {lead.return_visits > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-gray-500">Returns:</span>
              <span className="font-medium text-gray-900">{lead.return_visits}</span>
            </span>
          )}
          {lead.cta_clicks > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-gray-500">CTAs:</span>
              <span className="font-medium text-gray-900">{lead.cta_clicks}</span>
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(lead.last_visit)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
