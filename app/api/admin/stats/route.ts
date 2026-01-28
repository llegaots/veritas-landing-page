import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/db';
import { Event, VisitorProfile } from '@/lib/admin/types';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

function checkAuth(request: NextRequest): boolean {
  const key = request.nextUrl.searchParams.get('key');
  const expectedPassword = process.env.ADMIN_PASSWORD || 'veritas2024admin';
  return key === expectedPassword;
}

function calculateIntentScore(events: Event[]): number {
  let score = 0;
  
  // Base score from page views
  const pageViews = events.filter(e => e.event === 'page_view').length;
  score += Math.min(pageViews * 0.5, 2);
  
  // Scroll depth points
  const scroll25 = events.filter(e => e.event === 'scroll_25').length;
  const scroll50 = events.filter(e => e.event === 'scroll_50').length;
  const scroll75 = events.filter(e => e.event === 'scroll_75').length;
  score += scroll25 * 0.5;
  score += scroll50 * 1;
  score += scroll75 * 1.5;
  
  // CTA clicks
  const ctaClicks = events.filter(e => e.event === 'cta_click').length;
  score += ctaClicks * 3;
  
  // Demo booked (highest value)
  const demoBooked = events.filter(e => e.event === 'demo_booked').length;
  score += demoBooked * 10;
  
  // Time on page
  const timeEvents = events.filter(e => e.event === 'time_on_page');
  if (timeEvents.length > 0) {
    const totalTime = timeEvents.reduce((sum, e) => {
      const props = typeof e.properties === 'string' ? JSON.parse(e.properties) : e.properties;
      return sum + (props.seconds || 0);
    }, 0);
    const avgTime = totalTime / timeEvents.length;
    score += Math.min(avgTime / 60, 2); // Max 2 points for time
  }
  
  // Return visits
  const uniqueVisits = new Set(events.map(e => Math.floor(e.timestamp / (24 * 60 * 60 * 1000)))).size;
  score += Math.min((uniqueVisits - 1) * 0.5, 2); // Max 2 points for return visits
  
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

function processEventsIntoStats(events: any[]) {
  // Parse properties if they're strings (from database)
  const parsedEvents: Event[] = events.map(e => {
    let properties: Record<string, any>;
    try {
      properties = typeof e.properties === 'string' ? JSON.parse(e.properties) : (e.properties || {});
    } catch {
      properties = {};
    }
    
    return {
      id: Number(e.id),
      event: String(e.event),
      properties,
      anonymous_id: String(e.anonymous_id),
      name: e.name ? String(e.name) : null,
      url: e.url ? String(e.url) : null,
      referrer: e.referrer ? String(e.referrer) : null,
      timestamp: Number(e.timestamp),
      created_at: e.created_at ? String(e.created_at) : new Date().toISOString(),
    };
  });

  // Group events by anonymous_id
  const eventsByUser = new Map<string, Event[]>();
  parsedEvents.forEach(event => {
    const userId = event.anonymous_id;
    if (!eventsByUser.has(userId)) {
      eventsByUser.set(userId, []);
    }
    eventsByUser.get(userId)!.push(event);
  });

  // Calculate per-user stats
  const perUserStats: VisitorProfile[] = [];
  const topIntentScores: Array<{
    anonymous_id: string;
    score: number;
    return_visits: number;
    scroll_events: {
      scroll_25: number;
      scroll_50: number;
      scroll_75: number;
    };
  }> = [];

  eventsByUser.forEach((userEvents, anonymousId) => {
    const pageViews = userEvents.filter(e => e.event === 'page_view');
    const returnVisits = new Set(pageViews.map(e => Math.floor(e.timestamp / (24 * 60 * 60 * 1000)))).size - 1;
    
    const scroll25 = userEvents.filter(e => e.event === 'scroll_25').length;
    const scroll50 = userEvents.filter(e => e.event === 'scroll_50').length;
    const scroll75 = userEvents.filter(e => e.event === 'scroll_75').length;
    
    const ctaClicks = userEvents.filter(e => e.event === 'cta_click').length;
    const demoBooked = userEvents.filter(e => e.event === 'demo_booked').length;
    const quickExits = userEvents.filter(e => e.event === 'quick_exit').length;
    
    const timeEvents = userEvents.filter(e => e.event === 'time_on_page');
    const totalTime = timeEvents.reduce((sum, e) => sum + (e.properties?.seconds || 0), 0);
    const avgTime = timeEvents.length > 0 ? totalTime / timeEvents.length : 0;
    
    const timestamps = userEvents.map(e => e.timestamp);
    const firstVisit = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const lastVisit = timestamps.length > 0 ? Math.max(...timestamps) : 0;
    
    const name = userEvents.find(e => e.name)?.name || null;
    
    const intentScore = calculateIntentScore(userEvents);
    
    perUserStats.push({
      anonymous_id: anonymousId,
      name,
      page_views: pageViews.length,
      return_visits: Math.max(0, returnVisits),
      scroll_25: scroll25,
      scroll_50: scroll50,
      scroll_75: scroll75,
      cta_clicks: ctaClicks,
      demo_booked: demoBooked,
      total_time_on_page: totalTime,
      avg_time_on_page: Math.round(avgTime),
      quick_exits: quickExits,
      intent_score: intentScore,
      first_visit: firstVisit,
      last_visit: lastVisit,
      events: userEvents,
    });
    
    topIntentScores.push({
      anonymous_id: anonymousId,
      score: intentScore,
      return_visits: Math.max(0, returnVisits),
      scroll_events: {
        scroll_25: scroll25,
        scroll_50: scroll50,
        scroll_75: scroll75,
      },
    });
  });

  // Sort by intent score
  topIntentScores.sort((a, b) => b.score - a.score);

  // Calculate summary stats
  const totalEvents = parsedEvents.length;
  const uniqueVisitors = eventsByUser.size;
  const returnVisitors = perUserStats.filter(u => u.return_visits > 0).length;
  
  const timeEvents = parsedEvents.filter(e => e.event === 'time_on_page');
  const totalTime = timeEvents.reduce((sum, e) => sum + (e.properties?.seconds || 0), 0);
  const avgTimeOnPage = timeEvents.length > 0 ? totalTime / timeEvents.length : 0;
  
  const ctaClicks = parsedEvents.filter(e => e.event === 'cta_click').length;
  const demoBooked = parsedEvents.filter(e => e.event === 'demo_booked').length;
  const conversionRate = ctaClicks > 0 ? (demoBooked / ctaClicks) * 100 : 0;
  
  const pageViews = parsedEvents.filter(e => e.event === 'page_view').length;
  const quickExits = parsedEvents.filter(e => e.event === 'quick_exit').length;
  const quickExitRate = pageViews > 0 ? (quickExits / pageViews) * 100 : 0;
  
  const earlyExits = parsedEvents.filter(e => e.event === 'quick_exit' || (e.event === 'time_on_page' && e.properties?.seconds < 10)).length;
  const earlyExitRate = pageViews > 0 ? (earlyExits / pageViews) * 100 : 0;
  
  // Events by type
  const eventsByType: Record<string, number> = {};
  parsedEvents.forEach(e => {
    eventsByType[e.event] = (eventsByType[e.event] || 0) + 1;
  });
  
  // Scroll depth
  const scrollDepth = {
    scroll_25: parsedEvents.filter(e => e.event === 'scroll_25').length,
    scroll_50: parsedEvents.filter(e => e.event === 'scroll_50').length,
    scroll_75: parsedEvents.filter(e => e.event === 'scroll_75').length,
  };
  
  // Recent events (last 100)
  const recentEvents = parsedEvents
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100);

  return {
    summary: {
      total_events: totalEvents,
      unique_visitors: uniqueVisitors,
      return_visitors: returnVisitors,
      avg_time_on_page_seconds: Math.round(avgTimeOnPage),
      conversion_rate_percent: conversionRate.toFixed(1),
      quick_exit_rate_percent: quickExitRate.toFixed(1),
      early_exit_rate_percent: earlyExitRate.toFixed(1),
      early_exits: earlyExits,
    },
    events_by_type: eventsByType,
    scroll_depth: scrollDepth,
    top_intent_scores: topIntentScores.slice(0, 10),
    recent_events: recentEvents,
    per_user_stats: perUserStats,
  };
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const events = await getAllEvents();
    const stats = processEventsIntoStats(events);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

