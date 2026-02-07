'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { FilterBar } from '@/components/admin/FilterBar'
import { LeadsDashboard } from '@/components/admin/LeadsDashboard'
import { VisitorDrawer } from '@/components/admin/VisitorDrawer'
import { Toaster } from '@/components/admin/Toast'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDefaultDateRange } from '@/lib/admin/trends'
import { FilterState } from '@/lib/admin/filters'
import { formatDateTime } from '@/lib/admin/format'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Event, VisitorProfile } from '@/lib/admin/types'
import Link from 'next/link'
import { BarChart3, Users, Activity, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

interface Stats {
  summary: {
    total_events: number
    unique_visitors: number
    return_visitors: number
    avg_time_on_page_seconds: number
    conversion_rate_percent: string
    quick_exit_rate_percent: string
    early_exit_rate_percent: string
    early_exits: number
  }
  events_by_type: Record<string, number>
  timeline_by_day?: Array<{
    date: string
    label: string
    visitors: number
    page_views: number
    early_exits: number
    cta_clicks: number
    demo_booked: number
  }>
  scroll_depth: {
    scroll_25: number
    scroll_50: number
    scroll_75: number
  }
  top_intent_scores: Array<{
    anonymous_id: string
    score: number
    return_visits: number
    scroll_events: {
      scroll_25: number
      scroll_50: number
      scroll_75: number
    }
  }>
  recent_events: Array<Event>
  per_user_stats: Array<{
    anonymous_id: string
    name: string | null
    page_views: number
    return_visits: number
    scroll_25: number
    scroll_50: number
    scroll_75: number
    cta_clicks: number
    demo_booked: number
    total_time_on_page: number
    avg_time_on_page: number
    quick_exits: number
    intent_score: number
    first_visit: number
    last_visit: number
  }>
}

function AdminDashboardContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorProfile | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filters, setFilters] = useState({
    dateRange: getDefaultDateRange(),
  })
  const [activeTab, setActiveTab] = useState('leads')

  useEffect(() => {
    const key = searchParams.get('key') || password
    if (key) {
      setPassword(key)
      setAuthenticated(true)
      fetchStats(key, filters.dateRange)
    }
  }, [searchParams, filters.dateRange])

  const fetchStats = async (key: string, dateRange?: { start: Date; end: Date }) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ key })
      if (dateRange) {
        params.set('startDate', dateRange.start.toISOString())
        params.set('endDate', dateRange.end.toISOString())
      }
      const response = await fetch(`/api/admin/stats?${params.toString()}`)
      if (!response.ok) {
        if (response.status === 401) {
          setError('Invalid password')
          setAuthenticated(false)
        } else {
          setError('Failed to fetch stats')
        }
        return
      }
      const data = await response.json()
      setStats(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError('Error fetching stats')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) {
      setAuthenticated(true)
      fetchStats(password)
      window.history.pushState({}, '', `?key=${encodeURIComponent(password)}`)
    }
  }

  const handleRefresh = () => {
    if (password) {
      fetchStats(password, filters.dateRange)
      toast({
        title: 'Refreshing...',
        description: 'Data is being updated',
      })
    }
  }

  const handleExport = (leads?: VisitorProfile[]) => {
    const dataToExport = leads || stats?.per_user_stats || []
    const csv = [
      ['Name', 'Anonymous ID', 'Intent Score', 'Demo Booked', 'Return Visits', 'CTA Clicks', 'Avg Time'].join(','),
      ...dataToExport.map((lead) =>
        [
          lead.name || '',
          lead.anonymous_id,
          lead.intent_score,
          lead.demo_booked > 0 ? 'Yes' : 'No',
          lead.return_visits,
          lead.cta_clicks,
          lead.avg_time_on_page,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Export successful',
      description: `Exported ${dataToExport.length} lead${dataToExport.length !== 1 ? 's' : ''}`,
      variant: 'success',
    })
  }

  // Prepare visitor profiles for drawer
  const visitorProfiles = useMemo(() => {
    if (!stats) return new Map<string, VisitorProfile>()

    const profiles = new Map<string, VisitorProfile>()
    const eventsByVisitor = new Map<string, Event[]>()

    // Get all events, not just recent
    const allEvents = (stats.recent_events || []) as Event[]

    allEvents.forEach((event) => {
      if (!eventsByVisitor.has(event.anonymous_id)) {
        eventsByVisitor.set(event.anonymous_id, [])
      }
      eventsByVisitor.get(event.anonymous_id)!.push(event)
    })

    stats.per_user_stats.forEach((user) => {
      profiles.set(user.anonymous_id, {
        ...user,
        events: eventsByVisitor.get(user.anonymous_id) || [],
      })
    })

    return profiles
  }, [stats])

  const handleLeadClick = (lead: VisitorProfile) => {
    setSelectedVisitor(lead)
    setDrawerOpen(true)
  }

  const handleContact = (lead: VisitorProfile) => {
    toast({
      title: 'Contact lead',
      description: `Opening contact options for ${lead.name || lead.anonymous_id.substring(0, 8)}`,
    })
  }

  const handleTag = (lead: VisitorProfile) => {
    toast({
      title: 'Tag lead',
      description: `Tagging ${lead.name || lead.anonymous_id.substring(0, 8)}`,
    })
  }

  // Convert per_user_stats to VisitorProfile format for LeadsDashboard
  const leads = useMemo(() => {
    if (!stats) return []
    return stats.per_user_stats.map((user) => ({
      ...user,
      events: visitorProfiles.get(user.anonymous_id)?.events || [],
    })) as VisitorProfile[]
  }, [stats, visitorProfiles])

  if (!authenticated) {
    return (
      <div className="admin-font min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-purple-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="border-gray-200 focus:border-purple-500 focus:ring-purple-500 rounded-lg"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              Access Dashboard
            </Button>
          </form>
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-font min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex">
      <AdminSidebar password={password} />
      
      <div className="flex-1 ml-64 transition-all duration-300">
        <Toaster />
        
        {/* Modern Header with Purple Gradient */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                  Engagement Analytics
                </h1>
              </div>
            </div>
          </div>
        </div>

        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={handleRefresh}
          onExport={() => handleExport()}
          lastUpdated={lastUpdated || undefined}
        />

        <div className="px-4 lg:px-8 py-6">
        {loading && (
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {stats && !loading && (
          <>
            {/* Modern Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="bg-gray-100 p-1 rounded-xl border-0 w-full max-w-md grid grid-cols-2">
                <TabsTrigger 
                  value="leads" 
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
                >
                  Leads
                </TabsTrigger>
                <TabsTrigger 
                  value="activity"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
                >
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Leads Tab */}
              <TabsContent value="leads" className="space-y-6 mt-6">
                {/* Simple KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card className="bg-white border-0 shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Visitors</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.summary.unique_visitors}</p>
                    </CardContent>
                    <div className="h-1 bg-purple-500" />
                  </Card>
                  <Card className="bg-white border-0 shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Page Views</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.events_by_type['page_view'] || 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-0 shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Early Exits</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.summary.early_exits}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-0 shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CTA Clicks</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.events_by_type['cta_click'] || 0}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-0 shadow-sm rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Demo Booked</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.events_by_type['demo_booked'] || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline by Day/Month */}
                {stats.timeline_by_day && stats.timeline_by_day.length > 0 && (
                  <Card className="bg-white border-0 shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-gray-900">Visitors over time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.timeline_by_day} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 11 }}
                              stroke="#9ca3af"
                            />
                            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                              formatter={(value: number | undefined) => [value ?? 0, 'Visitors']}
                              labelFormatter={(label) => label}
                            />
                            <Line
                              type="monotone"
                              dataKey="visitors"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={{ fill: '#8b5cf6', r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <LeadsDashboard
                  leads={leads}
                  onLeadClick={handleLeadClick}
                  onContact={handleContact}
                  onTag={handleTag}
                  onExport={handleExport}
                />
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-6 mt-6">
                <Card className="bg-white border-0 shadow-sm rounded-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.recent_events.slice(0, 50).map((event, idx) => {
                        // Get visitor name from profile if event doesn't have name
                        const visitorProfile = stats.per_user_stats.find(u => u.anonymous_id === event.anonymous_id)
                        const displayName = event.name || visitorProfile?.name || null
                        
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-purple-50 hover:border-purple-200 transition-all duration-200 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <Badge className="bg-purple-100 text-purple-700 border-0 font-medium">{event.event}</Badge>
                              <span className="text-sm text-gray-600 font-mono">
                                {event.anonymous_id.substring(0, 15)}...
                              </span>
                              {displayName && (
                                <span className="text-sm font-medium text-gray-900">{displayName}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 group-hover:text-purple-600 transition-colors">
                              {formatDateTime(event.timestamp)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <VisitorDrawer
        visitor={selectedVisitor}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  )
}
