import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const password = searchParams.get('key')
    const adminPassword = process.env.ADMIN_PASSWORD || 'default_password_change_me'

    // Simple password protection
    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const db = getDb()

    // Get all events
    const events = db.prepare('SELECT * FROM events ORDER BY timestamp DESC').all() as Array<{
      id: number
      event: string
      properties: string
      anonymous_id: string
      name: string | null
      url: string | null
      referrer: string | null
      timestamp: number
      created_at: string
    }>

    // Parse properties
    const parsedEvents = events.map(e => ({
      ...e,
      properties: JSON.parse(e.properties),
    }))

    // Calculate statistics
    const totalEvents = events.length
    const uniqueVisitors = new Set(events.map(e => e.anonymous_id)).size

    // Events by type
    const eventsByType: Record<string, number> = {}
    parsedEvents.forEach(e => {
      eventsByType[e.event] = (eventsByType[e.event] || 0) + 1
    })

    // Return visitors (visitors with more than one page_view event)
    // A return visit is when the same anonymous_id has multiple page_view events
    const visitorPageViews = new Map<string, number>()
    parsedEvents.forEach(e => {
      if (e.event === 'page_view') {
        visitorPageViews.set(e.anonymous_id, (visitorPageViews.get(e.anonymous_id) || 0) + 1)
      }
    })
    
    // Return visitors are those with more than 1 page_view (they came back)
    const returnVisitors = Array.from(visitorPageViews.values()).filter(
      count => count > 1
    ).length
    
    // Also track return visits by date for historical analysis
    const visitorDates = new Map<string, Set<string>>()
    parsedEvents.forEach(e => {
      const date = new Date(e.timestamp).toISOString().split('T')[0]
      if (!visitorDates.has(e.anonymous_id)) {
        visitorDates.set(e.anonymous_id, new Set())
      }
      visitorDates.get(e.anonymous_id)!.add(date)
    })

    // Average time on page
    const timeOnPageEvents = parsedEvents.filter(e => e.event === 'time_on_page')
    const avgTimeOnPage = timeOnPageEvents.length > 0
      ? Math.round(
          timeOnPageEvents.reduce((sum, e) => sum + (e.properties.seconds || 0), 0) /
          timeOnPageEvents.length
        )
      : 0

    // Conversion rate (demo_booked / cta_click)
    const ctaClicks = eventsByType['cta_click'] || 0
    const demoBooked = eventsByType['demo_booked'] || 0
    const conversionRate = ctaClicks > 0 ? ((demoBooked / ctaClicks) * 100).toFixed(2) : '0.00'

    // Scroll depth distribution
    const scroll25 = eventsByType['scroll_25'] || 0
    const scroll50 = eventsByType['scroll_50'] || 0
    const scroll75 = eventsByType['scroll_75'] || 0

    // Early exits (left before 7 seconds)
    const earlyExits = eventsByType['early_exit'] || 0
    
    // Quick exit rate
    const quickExits = eventsByType['quick_exit'] || 0
    const pageViews = eventsByType['page_view'] || 0
    const quickExitRate = pageViews > 0
      ? ((quickExits / pageViews) * 100).toFixed(2)
      : '0.00'
    
    // Early exit rate (left before 7 seconds)
    const totalSessions = pageViews + earlyExits
    const earlyExitRate = totalSessions > 0
      ? ((earlyExits / totalSessions) * 100).toFixed(2)
      : '0.00'

    // Intent score calculation
    // Scroll events are intent indicators: +1 scroll_25, +2 scroll_50, +3 scroll_75
    // +5 return_visit, +8 demo_booked, +2 cta_click, -5 quick_exit
    const intentScores = new Map<string, number>()
    parsedEvents.forEach(e => {
      if (!intentScores.has(e.anonymous_id)) {
        intentScores.set(e.anonymous_id, 0)
      }
      let score = intentScores.get(e.anonymous_id)!
      
      // Scroll events as intent indicators
      if (e.event === 'scroll_25') score += 1
      if (e.event === 'scroll_50') score += 2
      if (e.event === 'scroll_75') score += 3
      if (e.event === 'demo_booked') score += 8
      if (e.event === 'cta_click') score += 2
      if (e.event === 'quick_exit') score -= 5
      
      intentScores.set(e.anonymous_id, score)
    })

    // Count return visits per visitor (based on page_view count, not just dates)
    const returnVisitCounts = new Map<string, number>()
    visitorPageViews.forEach((pageViewCount, anonId) => {
      if (pageViewCount > 1) {
        // Return visits = total page views - 1 (first visit doesn't count as return)
        const returnVisits = pageViewCount - 1
        returnVisitCounts.set(anonId, returnVisits)
        const currentScore = intentScores.get(anonId) || 0
        // Add 5 points per return visit
        intentScores.set(anonId, currentScore + 5 * returnVisits)
      }
    })

    // Calculate scroll events per user for display
    const userScrollEvents = new Map<string, { scroll_25: number; scroll_50: number; scroll_75: number }>()
    parsedEvents.forEach(e => {
      if (e.event.startsWith('scroll_')) {
        if (!userScrollEvents.has(e.anonymous_id)) {
          userScrollEvents.set(e.anonymous_id, { scroll_25: 0, scroll_50: 0, scroll_75: 0 })
        }
        const scrolls = userScrollEvents.get(e.anonymous_id)!
        if (e.event === 'scroll_25') scrolls.scroll_25 = 1
        if (e.event === 'scroll_50') scrolls.scroll_50 = 1
        if (e.event === 'scroll_75') scrolls.scroll_75 = 1
      }
    })

    // Top intent scores
    const topIntentScores = Array.from(intentScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([anonId, score]) => ({
        anonymous_id: anonId,
        score,
        return_visits: returnVisitCounts.get(anonId) || 0,
        scroll_events: userScrollEvents.get(anonId) || { scroll_25: 0, scroll_50: 0, scroll_75: 0 },
      }))

    // Recent events (last 50)
    const recentEvents = parsedEvents.slice(0, 50)

    // Calculate per-user statistics
    const perUserStats = new Map<string, {
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
    }>()

    parsedEvents.forEach(e => {
      if (!perUserStats.has(e.anonymous_id)) {
        perUserStats.set(e.anonymous_id, {
          anonymous_id: e.anonymous_id,
          name: null,
          page_views: 0,
          return_visits: 0,
          scroll_25: 0,
          scroll_50: 0,
          scroll_75: 0,
          cta_clicks: 0,
          demo_booked: 0,
          total_time_on_page: 0,
          avg_time_on_page: 0,
          quick_exits: 0,
          intent_score: 0,
          first_visit: e.timestamp,
          last_visit: e.timestamp,
        })
      }

      const stats = perUserStats.get(e.anonymous_id)!
      
      // Update name if available (prefer non-null names)
      if (e.name && !stats.name) {
        stats.name = e.name
      }
      
      // Update timestamps
      if (e.timestamp < stats.first_visit) stats.first_visit = e.timestamp
      if (e.timestamp > stats.last_visit) stats.last_visit = e.timestamp

      // Count events
      if (e.event === 'page_view') stats.page_views++
      // Note: early_exit events don't count as page_views (they left before 7 seconds)
      if (e.event === 'scroll_25') stats.scroll_25 = 1
      if (e.event === 'scroll_50') stats.scroll_50 = 1
      if (e.event === 'scroll_75') stats.scroll_75 = 1
      if (e.event === 'cta_click') stats.cta_clicks++
      if (e.event === 'demo_booked') stats.demo_booked++
      if (e.event === 'time_on_page') {
        stats.total_time_on_page += (e.properties.seconds || 0)
      }
      if (e.event === 'quick_exit') stats.quick_exits++
    })

    // Calculate return visits and averages per user
    perUserStats.forEach((stats, anonId) => {
      stats.return_visits = stats.page_views > 1 ? stats.page_views - 1 : 0
      
      // Count time_on_page events to calculate average
      const timeEvents = parsedEvents.filter(e => 
        e.anonymous_id === anonId && e.event === 'time_on_page'
      )
      stats.avg_time_on_page = timeEvents.length > 0
        ? Math.round(stats.total_time_on_page / timeEvents.length)
        : 0

      // Get intent score for this user
      stats.intent_score = intentScores.get(anonId) || 0
    })

    // Convert to array and sort by last visit (most recent first)
    const perUserStatsArray = Array.from(perUserStats.values())
      .sort((a, b) => b.last_visit - a.last_visit)

    return NextResponse.json({
      summary: {
        total_events: totalEvents,
        unique_visitors: uniqueVisitors,
        return_visitors: returnVisitors,
        avg_time_on_page_seconds: avgTimeOnPage,
        conversion_rate_percent: conversionRate,
        quick_exit_rate_percent: quickExitRate,
        early_exit_rate_percent: earlyExitRate,
        early_exits: earlyExits,
      },
      events_by_type: eventsByType,
      scroll_depth: {
        scroll_25: scroll25,
        scroll_50: scroll50,
        scroll_75: scroll75,
      },
      top_intent_scores: topIntentScores,
      recent_events: recentEvents,
      per_user_stats: perUserStatsArray,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

