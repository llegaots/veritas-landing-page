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
import { Calendar, Clock, TrendingUp, User, X, Activity, MousePointerClick, Scroll, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('scroll')) return <Scroll className="h-4 w-4 text-purple-500" />
    if (eventType.includes('click') || eventType.includes('cta')) return <MousePointerClick className="h-4 w-4 text-blue-500" />
    if (eventType.includes('time')) return <Clock className="h-4 w-4 text-green-500" />
    if (eventType.includes('demo') || eventType.includes('booked')) return <Zap className="h-4 w-4 text-green-600" />
    return <Activity className="h-4 w-4 text-gray-400" />
  }

  const getEventColor = (eventType: string) => {
    if (eventType.includes('scroll')) return 'bg-purple-50 border-purple-200'
    if (eventType.includes('click') || eventType.includes('cta')) return 'bg-blue-50 border-blue-200'
    if (eventType.includes('time')) return 'bg-green-50 border-green-200'
    if (eventType.includes('demo') || eventType.includes('booked')) return 'bg-green-100 border-green-300'
    if (eventType.includes('exit') || eventType.includes('quick')) return 'bg-red-50 border-red-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="max-h-screen w-full sm:max-w-2xl bg-white">
        <DrawerHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle className="text-2xl font-bold text-white mb-2">
                {visitor.name || `Visitor ${visitor.anonymous_id.substring(0, 12)}`}
              </DrawerTitle>
              <div className="text-purple-100 mt-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {visitor.page_views} session{visitor.page_views !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    Last seen {formatRelativeTime(visitor.last_visit)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-6 pb-6 space-y-6 bg-gray-50">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-4">
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Intent Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold leading-none h-[2.5rem] flex items-end">
                  <span
                    className={
                      visitor.intent_score >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {visitor.intent_score.toFixed(1)}
                  </span>
                </div>
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-3 rounded-full"></div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Return Visits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 leading-none h-[2.5rem] flex items-end">{visitor.return_visits}</div>
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-3 rounded-full"></div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Avg Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 leading-none h-[2.5rem] flex items-end">
                  {formatTime(visitor.avg_time_on_page)}
                </div>
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-3 rounded-full"></div>
              </CardContent>
            </Card>
            <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <MousePointerClick className="h-3 w-3" />
                  CTA Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 leading-none h-[2.5rem] flex items-end">{visitor.cta_clicks}</div>
                <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-3 rounded-full"></div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Badges */}
          <div className="flex flex-wrap gap-2">
            {visitor.scroll_25 > 0 && (
              <Badge className="bg-purple-100 text-purple-700 border-0 font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Scroll className="h-3 w-3" />
                25% Scroll
              </Badge>
            )}
            {visitor.scroll_50 > 0 && (
              <Badge className="bg-purple-200 text-purple-800 border-0 font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Scroll className="h-3 w-3" />
                50% Scroll
              </Badge>
            )}
            {visitor.scroll_75 > 0 && (
              <Badge className="bg-purple-500 text-white border-0 font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Scroll className="h-3 w-3" />
                75% Scroll
              </Badge>
            )}
            {visitor.demo_booked > 0 && (
              <Badge className="bg-green-100 text-green-700 border-0 font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Demo Booked
              </Badge>
            )}
            {visitor.quick_exits > 0 && (
              <Badge className="bg-red-100 text-red-700 border-0 font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
                {visitor.quick_exits} Quick Exit{visitor.quick_exits > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Timeline */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {sortedEvents.slice(0, 20).map((event, idx) => (
                  <div
                    key={event.id || idx}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-sm',
                      getEventColor(event.event)
                    )}
                  >
                    <div className="mt-0.5">
                      {getEventIcon(event.event)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 capitalize">
                          {event.event.replace(/_/g, ' ')}
                        </span>
                        <Badge className="bg-white/80 text-gray-600 border-0 text-xs font-medium px-2 py-0.5">
                          {formatDateTime(event.timestamp)}
                        </Badge>
                      </div>
                      {event.properties && Object.keys(event.properties).length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Object.entries(event.properties).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="text-xs text-gray-600">
                              <span className="font-medium text-gray-700">{key}:</span>{' '}
                              <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                          {Object.keys(event.properties).length > 3 && (
                            <div className="text-xs text-gray-500 italic">
                              +{Object.keys(event.properties).length - 3} more properties
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sortedEvents.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No events found</p>
                    <p className="text-xs text-gray-400 mt-1">This visitor hasn't triggered any events yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visit History */}
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-4 border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Visit History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    First Visit
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{formatDateTime(visitor.first_visit)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Last Visit
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{formatDateTime(visitor.last_visit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
