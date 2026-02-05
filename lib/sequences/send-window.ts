/**
 * Sending window for SMS and Email: 9 AM - 7 PM Eastern (America/New_York)
 * Messages scheduled outside this window are rolled over to 9 AM the next day.
 */

const EASTERN_TIMEZONE = 'America/New_York';

function getEasternParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** Create a Date representing 9:00 AM Eastern on the given calendar day */
function get9AMEastern(year: number, month: number, day: number): Date {
  // Try EST (UTC-5) and EDT (UTC-4) - one will be correct
  const candidates = [
    new Date(Date.UTC(year, month - 1, day, 14, 0, 0)), // 9 AM EST
    new Date(Date.UTC(year, month - 1, day, 13, 0, 0)), // 9 AM EDT
  ];
  for (const c of candidates) {
    const p = getEasternParts(c);
    if (p.hour === 9 && p.minute === 0 && p.month === month && p.day === day && p.year === year) {
      return c;
    }
  }
  return candidates[0];
}

/**
 * Snap a scheduled time into the sending window (9 AM - 7 PM Eastern).
 * - Before 9 AM: snap to 9 AM same day
 * - After 7 PM: roll over to 9 AM next day
 */
export function snapToSendingWindow(date: Date): Date {
  const { year, month, day, hour } = getEasternParts(date);

  if (hour < 9) {
    return get9AMEastern(year, month, day);
  }
  if (hour >= 19) {
    const today9AM = get9AMEastern(year, month, day);
    const tomorrow = new Date(today9AM.getTime() + 24 * 60 * 60 * 1000);
    const p = getEasternParts(tomorrow);
    return get9AMEastern(p.year, p.month, p.day);
  }
  return new Date(date);
}

/**
 * Check if a given time is within the sending window (9 AM - 7 PM Eastern).
 */
export function isWithinSendingWindow(date: Date): boolean {
  const { hour } = getEasternParts(date);
  return hour >= 9 && hour < 19;
}
