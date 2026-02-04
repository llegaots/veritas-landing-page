export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDelta(delta: number, isPercent: boolean = false): string {
  const sign = delta >= 0 ? '+' : ''
  if (isPercent) {
    return `${sign}${delta.toFixed(1)}%`
  }
  return `${sign}${formatNumber(Math.abs(delta))}`
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

// EST timezone constant
const EST_TIMEZONE = 'America/New_York';

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: EST_TIMEZONE,
  })
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: EST_TIMEZONE,
  })
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ago`
  }
  if (hours > 0) {
    return `${hours}h ago`
  }
  if (minutes > 0) {
    return `${minutes}m ago`
  }
  return 'Just now'
}

/**
 * Format a date in EST timezone using Intl.DateTimeFormat
 * Useful for consistent EST display across the app
 */
export function formatDateEST(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    timeZone: EST_TIMEZONE,
    ...options,
  });
}

/**
 * Format date and time in Eastern (EST/EDT)
 * Uses America/New_York for consistent display across the app (e.g. SMS log page)
 */
export function formatDateTimeEST(date: Date | string | number): string {
  return formatDateEST(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short', // e.g. "EST" or "EDT"
  });
}

/**
 * Format date only in EST (similar to date-fns format with 'PP')
 */
export function formatDateOnlyEST(date: Date | string | number): string {
  return formatDateEST(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


