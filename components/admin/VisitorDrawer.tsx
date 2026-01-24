'use client'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VisitorProfile } from '@/lib/admin/types'
import { formatDateTime, formatTime, formatRelativeTime } from '@/lib/admin/format'
import { Calendar, Clock, TrendingUp, User, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VisitorDrawerProps {
  visitor: VisitorProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisitorDrawer({
  visitor,
  open,
  onOpenChange,
}: VisitorDrawerProps) {
  if (!visitor) return null

  const events = visitor.events || []
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="max-h-screen">
        <DrawerHeader>
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle>
                {visitor.name || `Visitor ${visitor.anonymous_id.substring(0, 8)}`}
              </DrawerTitle>
              <DrawerDescription className="mt-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {visitor.page_views} sessions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Last seen {formatRelativeTime(visitor.last_visit)}
                  </span>
                </div>
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4 space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Intent Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span
                    className={
                      visitor.intent_score >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {visitor.intent_score}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Return Visits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visitor.return_visits}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Avg Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(visitor.avg_time_on_page)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  CTA Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{visitor.cta_clicks}</div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Badges */}
          <div className="flex flex-wrap gap-2">
            {visitor.scroll_25 > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                25% Scroll
              </Badge>
            )}
            {visitor.scroll_50 > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-800">
                50% Scroll
              </Badge>
            )}
            {visitor.scroll_75 > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-800">
                75% Scroll
              </Badge>
            )}
            {visitor.demo_booked > 0 && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Demo Booked
              </Badge>
            )}
            {visitor.quick_exits > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-800">
                {visitor.quick_exits} Quick Exit{visitor.quick_exits > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedEvents.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 pb-3 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{event.event}</span>
                        <Badge variant="secondary" className="text-xs">
                          {formatDateTime(event.timestamp)}
                        </Badge>
                      </div>
                      {event.properties && Object.keys(event.properties).length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(event.properties, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sortedEvents.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No events found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visit History */}
          <Card>
            <CardHeader>
              <CardTitle>Visit History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">First Visit</span>
                  <span>{formatDateTime(visitor.first_visit)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Visit</span>
                  <span>{formatDateTime(visitor.last_visit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

