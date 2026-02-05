'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { FilterBar } from '@/components/admin/FilterBar'
import { LeadsDashboard } from '@/components/admin/LeadsDashboard'
import { HealthMetrics } from '@/components/admin/HealthMetrics'
import { QuickInsights } from '@/components/admin/QuickInsights'
import { FunnelChart } from '@/components/admin/FunnelChart'
import { TimeDistributionChart } from '@/components/admin/TimeDistributionChart'
import { DataTable } from '@/components/admin/DataTable'
import { VisitorDrawer } from '@/components/admin/VisitorDrawer'
import { EmptyState } from '@/components/admin/EmptyState'
import { Toaster } from '@/components/admin/Toast'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  calculateKPITrends,
  splitEventsByPeriod,
  getDefaultDateRange,
} from '@/lib/admin/trends'
import { applyFilters, FilterState } from '@/lib/admin/filters'
import { generateInsights } from '@/lib/admin/insights'
import {
  formatNumber,
  formatPercent,
  formatTime,
  formatDateTime,
} from '@/lib/admin/format'
import { Event, VisitorProfile, TableColumn, KPITrend } from '@/lib/admin/types'
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
    const key = searchParams.get('key')
    if (key) {
      setPassword(key)
      setAuthenticated(true)
      fetchStats(key)
    }
  }, [searchParams])

  const fetchStats = async (key: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/stats?key=${encodeURIComponent(key)}`)
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
      fetchStats(password)
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

  // Calculate trends from recent_events
  const trends = useMemo(() => {
    if (!stats?.recent_events) return null

    const events = stats.recent_events as Event[]
    const { current, previous } = splitEventsByPeriod(
      events,
      filters.dateRange.start,
      filters.dateRange.end
    )

    return {
      totalEvents: calculateKPITrends(
        current,
        previous,
        (e) => e.length
      ),
      uniqueVisitors: calculateKPITrends(
        current,
        previous,
        (e) => new Set(e.map((ev) => ev.anonymous_id)).size
      ),
      returnVisitors: calculateKPITrends(
        current,
        previous,
        (e) => {
          const pageViews = e.filter((ev) => ev.event === 'page_view')
          const visitorCounts = new Map<string, number>()
          pageViews.forEach((ev) => {
            visitorCounts.set(ev.anonymous_id, (visitorCounts.get(ev.anonymous_id) || 0) + 1)
          })
          return Array.from(visitorCounts.values()).filter((count) => count > 1).length
        }
      ),
      avgTime: calculateKPITrends(
        current,
        previous,
        (e) => {
          const timeEvents = e.filter((ev) => ev.event === 'time_on_page')
          if (timeEvents.length === 0) return 0
          const total = timeEvents.reduce((sum, ev) => sum + (ev.properties?.seconds || 0), 0)
          return Math.round(total / timeEvents.length)
        }
      ),
      conversionRate: calculateKPITrends(
        current,
        previous,
        (e) => {
          const ctaClicks = e.filter((ev) => ev.event === 'cta_click').length
          const demoBooked = e.filter((ev) => ev.event === 'demo_booked').length
          return ctaClicks > 0 ? (demoBooked / ctaClicks) * 100 : 0
        }
      ),
      quickExitRate: calculateKPITrends(
        current,
        previous,
        (e) => {
          const pageViews = e.filter((ev) => ev.event === 'page_view').length
          const quickExits = e.filter((ev) => ev.event === 'quick_exit').length
          return pageViews > 0 ? (quickExits / pageViews) * 100 : 0
        }
      ),
      returnVisitorRate: calculateKPITrends(
        current,
        previous,
        (e) => {
          const pageViews = e.filter((ev) => ev.event === 'page_view')
          const visitorCounts = new Map<string, number>()
          pageViews.forEach((ev) => {
            visitorCounts.set(ev.anonymous_id, (visitorCounts.get(ev.anonymous_id) || 0) + 1)
          })
          const totalVisitors = visitorCounts.size
          const returnVisitors = Array.from(visitorCounts.values()).filter((count) => count > 1).length
          return totalVisitors > 0 ? (returnVisitors / totalVisitors) * 100 : 0
        }
      ),
    }
  }, [stats?.recent_events, filters.dateRange])

  // Calculate top drivers (event type changes)
  const topDrivers = useMemo(() => {
    if (!stats?.recent_events) return []
    const events = stats.recent_events as Event[]
    const { current, previous } = splitEventsByPeriod(
      events,
      filters.dateRange.start,
      filters.dateRange.end
    )

    const currentCounts: Record<string, number> = {}
    const previousCounts: Record<string, number> = {}

    current.forEach((e) => {
      currentCounts[e.event] = (currentCounts[e.event] || 0) + 1
    })
    previous.forEach((e) => {
      previousCounts[e.event] = (previousCounts[e.event] || 0) + 1
    })

    const changes = Object.keys({ ...currentCounts, ...previousCounts }).map((event) => {
      const currentVal = currentCounts[event] || 0
      const previousVal = previousCounts[event] || 0
      const delta = currentVal - previousVal
      const deltaPercent = previousVal > 0 ? (delta / previousVal) * 100 : 0

      const trend: 'up' | 'down' | 'neutral' = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral'

      return {
        event,
        current: currentVal,
        previous: previousVal,
        delta,
        deltaPercent,
        trend,
      }
    })

    return changes
      .filter((c) => Math.abs(c.delta) > 0)
      .sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent))
      .slice(0, 5)
  }, [stats?.recent_events, filters.dateRange])

  // Generate insights
  const insights = useMemo(() => {
    if (!stats?.recent_events) return []
    const events = stats.recent_events as Event[]
    const { current, previous } = splitEventsByPeriod(
      events,
      filters.dateRange.start,
      filters.dateRange.end
    )
    return generateInsights(current, previous, stats)
  }, [stats, filters.dateRange])

  // Calculate funnel data
  const funnelData = useMemo(() => {
    if (!stats) return null

    const pageViews = stats.events_by_type['page_view'] || 0
    const scroll75 = stats.scroll_depth.scroll_75
    const ctaClicks = stats.events_by_type['cta_click'] || 0
    const demoBooked = stats.events_by_type['demo_booked'] || 0

    return [
      { label: 'Page Views', value: pageViews, color: '#8b5cf6' },
      { label: '75% Scroll', value: scroll75, color: '#a855f7' },
      { label: 'CTA Clicks', value: ctaClicks, color: '#c084fc' },
      { label: 'Demo Booked', value: demoBooked, color: '#d8b4fe' },
    ]
  }, [stats])

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

  const handleVisitorClick = (visitor: any) => {
    const profile = visitorProfiles.get(visitor.anonymous_id)
    if (profile) {
      setSelectedVisitor(profile)
      setDrawerOpen(true)
    }
  }

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

  // Table columns for All Visitors (in Analytics tab)
  const allVisitorsColumns: TableColumn<any>[] = [
    {
      id: 'name',
      header: 'Name / ID',
      accessor: (row) => (
        <span className={row.name ? 'font-semibold text-gray-900' : 'font-mono text-sm text-gray-600'}>
          {row.name || `${row.anonymous_id.substring(0, 20)}...`}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'page_views',
      header: 'Views',
      accessor: (row) => <span className="font-medium text-gray-700">{row.page_views}</span>,
      sortable: true,
    },
    {
      id: 'return_visits',
      header: 'Returns',
      accessor: (row) => <span className="text-gray-600">{row.return_visits}</span>,
      sortable: true,
    },
    {
      id: 'scroll',
      header: 'Scroll',
      accessor: (row) => (
        <div className="flex gap-1.5">
          {row.scroll_25 > 0 && (
            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs font-medium px-2 py-0.5">
              25
            </Badge>
          )}
          {row.scroll_50 > 0 && (
            <Badge className="bg-purple-200 text-purple-800 border-0 text-xs font-medium px-2 py-0.5">
              50
            </Badge>
          )}
          {row.scroll_75 > 0 && (
            <Badge className="bg-purple-500 text-white border-0 text-xs font-medium px-2 py-0.5">
              75
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'cta_clicks',
      header: 'CTA',
      accessor: (row) => <span className="text-gray-600">{row.cta_clicks}</span>,
      sortable: true,
    },
    {
      id: 'demo_booked',
      header: 'Demo',
      accessor: (row) =>
        row.demo_booked > 0 ? (
          <Badge className="bg-green-100 text-green-700 border-0 font-medium">
            ✓
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
      sortable: true,
    },
    {
      id: 'avg_time_on_page',
      header: 'Avg Time',
      accessor: (row) => <span className="text-gray-600">{formatTime(row.avg_time_on_page)}</span>,
      sortable: true,
    },
    {
      id: 'intent_score',
      header: 'Intent',
      accessor: (row) => (
        <span className={row.intent_score >= 0 ? 'text-purple-600 font-bold' : 'text-red-500 font-bold'}>
          {row.intent_score}
        </span>
      ),
      sortable: true,
    },
  ]

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
              <TabsList className="bg-gray-100 p-1 rounded-xl border-0 w-full max-w-md grid grid-cols-3">
                <TabsTrigger 
                  value="leads" 
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
                >
                  Leads
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics"
                  className="data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm rounded-lg font-medium transition-all duration-200 cursor-pointer"
                >
                  Analytics
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
                <HealthMetrics
                  conversionRate={stats.summary.conversion_rate_percent}
                  conversionTrend={trends?.conversionRate}
                  quickExitRate={stats.summary.quick_exit_rate_percent}
                  quickExitTrend={trends?.quickExitRate}
                  avgTimeOnPage={stats.summary.avg_time_on_page_seconds}
                  avgTimeTrend={trends?.avgTime}
                  returnVisitorRate={
                    stats.summary.unique_visitors > 0
                      ? (stats.summary.return_visitors / stats.summary.unique_visitors) * 100
                      : 0
                  }
                  returnVisitorTrend={trends?.returnVisitorRate}
                />

                <QuickInsights
                  insights={insights}
                  topDrivers={topDrivers}
                />

                <LeadsDashboard
                  leads={leads}
                  onLeadClick={handleLeadClick}
                  onContact={handleContact}
                  onTag={handleTag}
                  onExport={handleExport}
                />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6 mt-6">
                {/* KPI Cards with Purple Theme */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Total Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{stats.summary.total_events}</div>
                    </CardContent>
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Card>
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Unique Visitors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600">{stats.summary.unique_visitors}</div>
                    </CardContent>
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Card>
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Return Visitors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-700">{stats.summary.return_visitors}</div>
                    </CardContent>
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Card>
                  <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl overflow-hidden group cursor-pointer">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Avg Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{stats.summary.avg_time_on_page_seconds}s</div>
                    </CardContent>
                    <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </Card>
                </div>

                {/* Funnel Chart */}
                {funnelData && (
                  <FunnelChart steps={funnelData} title="Conversion Funnel" />
                )}

                {/* Engagement Section */}
                <Tabs defaultValue="scroll" className="bg-white rounded-xl shadow-sm border-0 p-6">
                  <TabsList className="bg-gray-100 p-1 rounded-lg mb-6">
                    <TabsTrigger 
                      value="scroll"
                      className="data-[state=active]:bg-white data-[state=active]:text-purple-600 rounded-md font-medium cursor-pointer"
                    >
                      Scroll Depth
                    </TabsTrigger>
                    <TabsTrigger 
                      value="time"
                      className="data-[state=active]:bg-white data-[state=active]:text-purple-600 rounded-md font-medium cursor-pointer"
                    >
                      Time Distribution
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="scroll" className="mt-0">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                        <p className="text-4xl font-bold text-purple-700">
                          {stats.scroll_depth.scroll_25}
                        </p>
                        <p className="text-sm font-semibold text-purple-600 mt-2">25% Scroll</p>
                        <p className="text-xs text-gray-500 mt-1">+1 Intent Score</p>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl border border-purple-300 hover:shadow-md transition-shadow">
                        <p className="text-4xl font-bold text-purple-800">
                          {stats.scroll_depth.scroll_50}
                        </p>
                        <p className="text-sm font-semibold text-purple-700 mt-2">50% Scroll</p>
                        <p className="text-xs text-gray-500 mt-1">+2 Intent Score</p>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl border-0 hover:shadow-lg transition-shadow text-white">
                        <p className="text-4xl font-bold text-white">
                          {stats.scroll_depth.scroll_75}
                        </p>
                        <p className="text-sm font-semibold text-purple-100 mt-2">75% Scroll</p>
                        <p className="text-xs text-purple-200 mt-1">+3 Intent Score</p>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="time" className="mt-0">
                    <TimeDistributionChart
                      timeEvents={
                        stats.recent_events
                          .filter((e) => e.event === 'time_on_page')
                          .map((e) => ({ seconds: e.properties?.seconds || 0 }))
                      }
                    />
                  </TabsContent>
                </Tabs>

                {/* All Visitors Table */}
                {stats.per_user_stats.length > 0 ? (
                  <DataTable
                    data={stats.per_user_stats}
                    columns={allVisitorsColumns}
                    onRowClick={handleVisitorClick}
                    pageSize={20}
                  />
                ) : (
                  <EmptyState
                    title="No visitors"
                    description="No visitor data available yet."
                  />
                )}
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
