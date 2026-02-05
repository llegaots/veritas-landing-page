'use client'

// Get or create anonymous ID from localStorage (persists across browser sessions)
// - First visit → Creates new anonymous_id
// - Return visits → Uses same anonymous_id (tracked automatically via page_view events on different days)
export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  
  const ID_KEY = 'veritas_anon_id';
  
  // Get existing ID from localStorage (persists across browser sessions)
  let anonId = localStorage.getItem(ID_KEY);
  
  if (!anonId) {
    // First visit - create new anonymous_id
    anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(ID_KEY, anonId);
  }
  
  // Return the same ID for return visits
  // Return visits are automatically detected by the admin stats based on:
  // - Same anonymous_id
  // - page_view events on different days
  return anonId;
}

// Main tracking function
export async function track(event: string, properties: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  
  // Extract name from properties if present
  const name = properties.name || undefined
  
  const payload = {
    event,
    properties,
    anonymous_id: getOrCreateAnonId(),
    name: name,
    url: window.location.pathname,
    referrer: document.referrer || undefined,
    timestamp: Date.now(),
  };

  // Track internally
  try {
    const response = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error('Tracking API error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Tracking error:', error);
  }

  // Track with Meta Pixel if available
  if (typeof window !== 'undefined' && (window as any).fbq) {
    const fbq = (window as any).fbq;
    
    // Map internal events to Meta events
    if (event === 'cta_click') {
      fbq('trackCustom', 'CTA_Click', {
        cta: properties.cta || 'schedule_demo',
      });
    } else if (event === 'scroll_75') {
      fbq('trackCustom', 'Scroll_75');
    } else if (event === 'calendly_date_selected') {
      fbq('trackCustom', 'Calendly_DateSelected');
    } else if (event === 'demo_booked') {
      fbq('track', 'Lead');
    }
  }
}

