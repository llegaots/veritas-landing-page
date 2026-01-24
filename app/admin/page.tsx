'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

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
  recent_events: Array<any>
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
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if password is in URL
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
      // Update URL with password
      window.history.pushState({}, '', `?key=${encodeURIComponent(password)}`)
    }
  }

  const handleRefresh = () => {
    if (password) {
      fetchStats(password)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter admin password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Access Dashboard
            </button>
          </form>
          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Engagement Analytics</h1>
          <button
            onClick={handleRefresh}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {stats && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.total_events}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Unique Visitors</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.unique_visitors}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Return Visitors</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.return_visitors}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Time on Page</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.avg_time_on_page_seconds}s</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Conversion Rate</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.conversion_rate_percent}%</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Quick Exit Rate</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.quick_exit_rate_percent}%</p>
                <p className="text-xs text-gray-400 mt-1">Left within 10s, no engagement</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Early Exit Rate</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.early_exit_rate_percent}%</p>
                <p className="text-xs text-gray-400 mt-1">Left before 7s (not counted as page view)</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Early Exits</h3>
                <p className="text-3xl font-bold text-gray-900">{stats.summary.early_exits}</p>
                <p className="text-xs text-gray-400 mt-1">Total early exits</p>
              </div>
            </div>

            {/* Events by Type */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Events by Type</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(stats.events_by_type)
                      .sort(([, a], [, b]) => b - a)
                      .map(([event, count]) => {
                        // Special handling for time_on_page - show it's tracked per session
                        const isTimeEvent = event === 'time_on_page'
                        return (
                          <tr key={event}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {event}
                              {isTimeEvent && (
                                <span className="ml-2 text-xs text-gray-400">(per session)</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {count}
                              {isTimeEvent && (
                                <span className="ml-2 text-xs text-gray-400">
                                  sessions tracked
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scroll Depth - Intent Indicators */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Scroll Depth (Intent Indicators)</h2>
              <p className="text-sm text-gray-500 mb-4">Users who scrolled to these depths show engagement intent</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-3xl font-bold text-blue-700">{stats.scroll_depth.scroll_25}</p>
                  <p className="text-sm font-medium text-blue-600 mt-1">25% Scroll</p>
                  <p className="text-xs text-gray-500 mt-1">+1 Intent Score</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-3xl font-bold text-orange-700">{stats.scroll_depth.scroll_50}</p>
                  <p className="text-sm font-medium text-orange-600 mt-1">50% Scroll</p>
                  <p className="text-xs text-gray-500 mt-1">+2 Intent Score</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-3xl font-bold text-green-700">{stats.scroll_depth.scroll_75}</p>
                  <p className="text-sm font-medium text-green-600 mt-1">75% Scroll</p>
                  <p className="text-xs text-gray-500 mt-1">+3 Intent Score</p>
                </div>
              </div>
            </div>

            {/* Top Intent Scores */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Top Intent Scores</h2>
              <p className="text-sm text-gray-500 mb-4">Users ranked by engagement intent (scroll events, CTA clicks, return visits)</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anonymous ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Intent Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scroll Events
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Return Visits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.top_intent_scores.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {item.anonymous_id.substring(0, 20)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900">{item.score}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            {item.scroll_events.scroll_25 > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                25%
                              </span>
                            )}
                            {item.scroll_events.scroll_50 > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                50%
                              </span>
                            )}
                            {item.scroll_events.scroll_75 > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                75%
                              </span>
                            )}
                            {item.scroll_events.scroll_25 === 0 && item.scroll_events.scroll_50 === 0 && item.scroll_events.scroll_75 === 0 && (
                              <span className="text-xs text-gray-400">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.return_visits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* All Visitors Table */}
            <div className="bg-white rounded-lg shadow p-4 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">All Visitors</h2>
              <p className="text-sm text-gray-500 mb-4">Complete breakdown of all visitors and their engagement metrics</p>
              <div className="w-full">
                <table className="w-full divide-y divide-gray-200 table-auto">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Name / ID
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Views
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Returns
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Scroll
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        CTA
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Demo
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Time
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                        Exits
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                        Score
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        First Visit
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                        Last Visit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.per_user_stats.map((user, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs truncate max-w-[160px]" title={user.anonymous_id}>
                          {user.name ? (
                            <span className="font-semibold text-gray-900">{user.name}</span>
                          ) : (
                            <span className="font-mono text-gray-600">{user.anonymous_id.substring(0, 20)}...</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-gray-900 font-medium">
                          {user.page_views}
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-gray-500">
                          {user.return_visits}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex gap-0.5 justify-center">
                            {user.scroll_25 > 0 && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                25
                              </span>
                            )}
                            {user.scroll_50 > 0 && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800">
                                50
                              </span>
                            )}
                            {user.scroll_75 > 0 && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                75
                              </span>
                            )}
                            {user.scroll_25 === 0 && user.scroll_50 === 0 && user.scroll_75 === 0 && (
                              <span className="text-[10px] text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-gray-900">
                          {user.cta_clicks}
                        </td>
                        <td className="px-2 py-2 text-center text-xs">
                          {user.demo_booked > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                              ✓
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-xs text-gray-500">
                          {user.avg_time_on_page}s
                        </td>
                        <td className="px-2 py-2 text-center text-xs">
                          {user.quick_exits > 0 ? (
                            <span className="text-orange-600 font-medium">{user.quick_exits}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-xs font-bold">
                          <span className={user.intent_score >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {user.intent_score}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500">
                          {new Date(user.first_visit).toLocaleDateString()} {new Date(user.first_visit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-500">
                          {new Date(user.last_visit).toLocaleDateString()} {new Date(user.last_visit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Events (Last 50)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anonymous ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recent_events.slice(0, 20).map((event, idx) => {
                      const isTimeEvent = event.event === 'time_on_page'
                      const timeValue = isTimeEvent && event.properties?.seconds
                        ? `${event.properties.seconds}s`
                        : null
                      const isQuickExit = event.event === 'quick_exit'
                      
                      return (
                        <tr key={idx}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {event.event}
                              </span>
                              {timeValue && (
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  {timeValue}
                                </span>
                              )}
                              {isQuickExit && (
                                <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                                  {event.properties?.seconds ? `${event.properties.seconds}s` : 'exited'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                            {event.anonymous_id.substring(0, 15)}...
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  )
}

