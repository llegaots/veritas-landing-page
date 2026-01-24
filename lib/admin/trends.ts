import { Event, KPITrend } from './types'

export function calculateTrend(
  currentValue: number,
  previousValue: number
): KPITrend['trend'] {
  if (currentValue > previousValue) return 'up'
  if (currentValue < previousValue) return 'down'
  return 'neutral'
}

export function calculateDelta(current: number, previous: number): {
  delta: number
  deltaPercent: number
  trend: KPITrend['trend']
} {
  const delta = current - previous
  const deltaPercent = previous > 0 ? (delta / previous) * 100 : 0
  const trend = calculateTrend(current, previous)

  return { delta, deltaPercent, trend }
}

export function generateSparklineData(
  events: Event[],
  days: number = 7
): Array<{ date: string; value: number }> {
  const now = Date.now()
  const startTime = now - days * 24 * 60 * 60 * 1000
  const filteredEvents = events.filter((e) => e.timestamp >= startTime)

  // Group by day
  const dailyData = new Map<string, number>()
  const dayMs = 24 * 60 * 60 * 1000

  for (let i = 0; i < days; i++) {
    const dayStart = startTime + i * dayMs
    const dayEnd = dayStart + dayMs
    const dayKey = new Date(dayStart).toISOString().split('T')[0]

    const dayEvents = filteredEvents.filter(
      (e) => e.timestamp >= dayStart && e.timestamp < dayEnd
    )
    dailyData.set(dayKey, dayEvents.length)
  }

  // Convert to array and fill missing days
  const result: Array<{ date: string; value: number }> = []
  for (let i = 0; i < days; i++) {
    const dayStart = startTime + i * dayMs
    const dayKey = new Date(dayStart).toISOString().split('T')[0]
    result.push({
      date: dayKey,
      value: dailyData.get(dayKey) || 0,
    })
  }

  return result
}

export function calculateKPITrends(
  currentEvents: Event[],
  previousEvents: Event[],
  calculateValue: (events: Event[]) => number
): KPITrend {
  const currentValue = calculateValue(currentEvents)
  const previousValue = calculateValue(previousEvents)
  const { delta, deltaPercent, trend } = calculateDelta(
    currentValue,
    previousValue
  )
  const sparklineData = generateSparklineData(currentEvents)

  return {
    value: currentValue,
    previousValue,
    delta,
    deltaPercent,
    trend,
    sparklineData,
  }
}

export function splitEventsByPeriod(
  events: Event[],
  currentPeriodStart: Date,
  currentPeriodEnd: Date
): { current: Event[]; previous: Event[] } {
  const periodDuration =
    currentPeriodEnd.getTime() - currentPeriodStart.getTime()
  const previousPeriodStart = new Date(
    currentPeriodStart.getTime() - periodDuration
  )
  const previousPeriodEnd = currentPeriodStart

  const current = events.filter((e) => {
    const eventDate = new Date(e.timestamp)
    return eventDate >= currentPeriodStart && eventDate < currentPeriodEnd
  })

  const previous = events.filter((e) => {
    const eventDate = new Date(e.timestamp)
    return eventDate >= previousPeriodStart && eventDate < previousPeriodEnd
  })

  return { current, previous }
}

export function getDefaultDateRange(): {
  start: Date
  end: Date
  label: string
} {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)
  return { start, end, label: 'Last 7 days' }
}

