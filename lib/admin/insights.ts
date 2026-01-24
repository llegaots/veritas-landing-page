import { Event, KPITrend } from './types'
import { calculateDelta } from './trends'

export interface Insight {
  type: 'alert' | 'success' | 'info'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function generateInsights(
  currentEvents: Event[],
  previousEvents: Event[],
  stats: any
): Insight[] {
  const insights: Insight[] = []

  // Calculate conversion rate change
  const currentCta = currentEvents.filter((e) => e.event === 'cta_click').length
  const currentDemo = currentEvents.filter((e) => e.event === 'demo_booked').length
  const previousCta = previousEvents.filter((e) => e.event === 'cta_click').length
  const previousDemo = previousEvents.filter((e) => e.event === 'demo_booked').length

  const currentRate = currentCta > 0 ? (currentDemo / currentCta) * 100 : 0
  const previousRate = previousCta > 0 ? (previousDemo / previousCta) * 100 : 0
  const conversionDelta = currentRate - previousRate

  if (conversionDelta < -10) {
    insights.push({
      type: 'alert',
      title: 'Conversion Rate Dropped',
      message: `Conversion rate decreased by ${Math.abs(conversionDelta).toFixed(1)}% compared to previous period.`,
    })
  } else if (conversionDelta > 10) {
    insights.push({
      type: 'success',
      title: 'Conversion Rate Improved',
      message: `Conversion rate increased by ${conversionDelta.toFixed(1)}% compared to previous period.`,
    })
  }

  // Check for high-intent leads
  const highIntentLeads = stats?.per_user_stats?.filter(
    (u: any) => u.intent_score >= 5 && u.demo_booked === 0
  ).length || 0

  if (highIntentLeads > 0) {
    insights.push({
      type: 'info',
      title: 'High-Intent Leads Available',
      message: `${highIntentLeads} lead${highIntentLeads > 1 ? 's' : ''} with high intent score but no demo booked yet.`,
    })
  }

  // Check quick exit rate
  const currentPageViews = currentEvents.filter((e) => e.event === 'page_view').length
  const currentQuickExits = currentEvents.filter((e) => e.event === 'quick_exit').length
  const currentQuickExitRate =
    currentPageViews > 0 ? (currentQuickExits / currentPageViews) * 100 : 0

  if (currentQuickExitRate > 30) {
    insights.push({
      type: 'alert',
      title: 'High Quick Exit Rate',
      message: `${currentQuickExitRate.toFixed(1)}% of visitors are leaving quickly without engagement.`,
    })
  }

  return insights
}

