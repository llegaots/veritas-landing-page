export interface Event {
  id: number
  event: string
  properties: Record<string, any>
  anonymous_id: string
  name: string | null
  url: string | null
  referrer: string | null
  timestamp: number
  created_at: string
}

export interface KPITrend {
  value: number
  previousValue: number
  delta: number
  deltaPercent: number
  trend: 'up' | 'down' | 'neutral'
  sparklineData: Array<{ date: string; value: number }>
}

export interface DateRange {
  start: Date
  end: Date
  label: string
}

export interface FilterState {
  dateRange: DateRange
  source?: string
  device?: string
  page?: string
}

export interface TableColumn<T> {
  id: string
  header: string
  accessor: (row: T) => any
  sortable?: boolean
  visible?: boolean
  width?: string
}

export interface TableState {
  search: string
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  page: number
  pageSize: number
  visibleColumns: Set<string>
  density: 'compact' | 'comfortable'
}

export interface VisitorProfile {
  anonymous_id: string
  name: string | null
  page_views: number
  return_visits: number
  scroll_25: number
  scroll_50: number
  scroll_75: number
  cta_clicks: number
  demo_booked: number
  avg_time_on_page: number
  quick_exits: number
  intent_score: number
  first_visit: number
  last_visit: number
  events: Event[]
}


