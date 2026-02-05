import { Event } from './types'
import { FilterState } from './types'

export type { FilterState }

export function filterEventsByDateRange(
  events: Event[],
  start: Date,
  end: Date
): Event[] {
  return events.filter((e) => {
    const eventDate = new Date(e.timestamp)
    return eventDate >= start && eventDate <= end
  })
}

export function filterEventsBySource(
  events: Event[],
  source?: string
): Event[] {
  if (!source) return events
  return events.filter((e) => {
    const referrer = e.referrer?.toLowerCase() || ''
    if (source === 'facebook') {
      return referrer.includes('facebook') || referrer.includes('fb')
    }
    if (source === 'google') {
      return referrer.includes('google')
    }
    if (source === 'direct') {
      return !e.referrer || e.referrer === ''
    }
    return true
  })
}

export function filterEventsByDevice(
  events: Event[],
  device?: string
): Event[] {
  if (!device) return events
  // Note: Device detection would need to be added to event properties
  // For now, this is a placeholder
  return events
}

export function filterEventsByPage(
  events: Event[],
  page?: string
): Event[] {
  if (!page) return events
  return events.filter((e) => e.url === page)
}

export function applyFilters(
  events: Event[],
  filters: FilterState
): Event[] {
  let filtered = filterEventsByDateRange(
    events,
    filters.dateRange.start,
    filters.dateRange.end
  )

  filtered = filterEventsBySource(filtered, filters.source)
  filtered = filterEventsByDevice(filtered, filters.device)
  filtered = filterEventsByPage(filtered, filters.page)

  return filtered
}

export function getActiveFilters(filters: FilterState): Array<{
  key: string
  label: string
  value: string
}> {
  const active: Array<{ key: string; label: string; value: string }> = []

  if (filters.source) {
    active.push({ key: 'source', label: 'Source', value: filters.source })
  }
  if (filters.device) {
    active.push({ key: 'device', label: 'Device', value: filters.device })
  }
  if (filters.page) {
    active.push({ key: 'page', label: 'Page', value: filters.page })
  }

  return active
}

