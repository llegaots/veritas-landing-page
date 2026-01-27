'use client'

import { VisitorProfile } from '@/lib/admin/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, formatTime } from '@/lib/admin/format'
import { Mail, Tag, Download, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeadCardProps {
  lead: VisitorProfile
  onClick?: () => void
  onContact?: () => void
  onTag?: () => void
  onExport?: () => void
  selected?: boolean
  onSelect?: (selected: boolean) => void
}

export function LeadCard({
  lead,
  onClick,
  onContact,
  onTag,
  onExport,
  selected = false,
  onSelect,
}: LeadCardProps) {
  const hasName = !!lead.name
  const hasBookedDemo = lead.demo_booked > 0
  const isHighIntent = lead.intent_score >= 5

  return (
    <Card
      className={cn(
        'bg-[hsl(var(--card))] border-[hsl(var(--border))] cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-orange-300',
        selected && 'ring-2 ring-orange-500 border-orange-500',
        hasBookedDemo && 'border-green-200 bg-green-50/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {onSelect && (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => {
                    e.stopPropagation()
                    onSelect(e.target.checked)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
              )}
              <h3 className="font-semibold text-[hsl(var(--foreground))] truncate">
                {lead.name || `Visitor ${lead.anonymous_id.substring(0, 8)}`}
              </h3>
              {hasBookedDemo && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Demo Booked
                </Badge>
              )}
              {isHighIntent && !hasBookedDemo && (
                <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-300">
                  High Intent
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--muted-foreground))] mb-3">
              <span className="flex items-center gap-1">
                <span className="font-medium text-[hsl(var(--foreground))]">Intent:</span>
                <span
                  className={cn(
                    'font-bold',
                    lead.intent_score >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {lead.intent_score}
                </span>
              </span>
              {lead.return_visits > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-[hsl(var(--foreground))]">Returns:</span>
                  <span>{lead.return_visits}</span>
                </span>
              )}
              {lead.cta_clicks > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-medium text-[hsl(var(--foreground))]">CTAs:</span>
                  <span>{lead.cta_clicks}</span>
                </span>
              )}
              <span className="text-[hsl(var(--muted-foreground))]">
                {formatRelativeTime(lead.last_visit)}
              </span>
            </div>

            {/* Engagement indicators */}
            <div className="flex flex-wrap gap-1 mb-3">
              {lead.scroll_75 > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  75% Scroll
                </Badge>
              )}
              {lead.scroll_50 > 0 && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  50% Scroll
                </Badge>
              )}
              {lead.scroll_25 > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  25% Scroll
                </Badge>
              )}
              {lead.avg_time_on_page > 60 && (
                <Badge variant="outline" className="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]">
                  {formatTime(lead.avg_time_on_page)} avg
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onContact && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onContact()
                }}
                title="Contact"
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            {onTag && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onTag()
                }}
                title="Tag"
              >
                <Tag className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  onExport()
                }}
                title="Export"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

