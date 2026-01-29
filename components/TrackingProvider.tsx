'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/tracking'

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const startTime = useRef<number>(Date.now())
  const totalHiddenTime = useRef<number>(0) // Track total time page was hidden
  const hiddenStartTime = useRef<number | null>(null) // When page became hidden
  const meaningfulActions = useRef<Set<string>>(new Set())
  const scrollFired = useRef<Record<number, boolean>>({ 25: false, 50: false, 75: false })
  const isPageVisible = useRef<boolean>(true)
  const lastScrollTop = useRef<number>(0)
  const initialScrollTop = useRef<number>(0)
  const hasInitialized = useRef<boolean>(false)

  useEffect(() => {
    // Initialize scroll position tracking
    const initScroll = () => {
      initialScrollTop.current = window.scrollY || document.documentElement.scrollTop
      lastScrollTop.current = initialScrollTop.current
      hasInitialized.current = true
    }
    
    // Initialize scroll position
    if (document.readyState === 'complete') {
      initScroll()
    } else {
      window.addEventListener('load', initScroll, { once: true })
      // Also set after a short delay to catch late loads
      setTimeout(initScroll, 1000)
    }
    
    // Track page_view on page load (for return visit detection)
    // Check if this is a return visit (has anonymous_id in localStorage but no active session)
    const SESSION_KEY = 'veritas_session_active'
    const hasActiveSession = sessionStorage.getItem(SESSION_KEY) === 'true'
    const anonId = localStorage.getItem('veritas_anon_id')
    const isReturnVisit = anonId && !hasActiveSession
    
    // Track page_view after a short delay to ensure it's a real visit
    // For return visits, track immediately; for first visits, wait 7 seconds (handled in trackSessionEnd)
    if (isReturnVisit) {
      // Return visit - track page_view immediately after page loads
      setTimeout(() => {
        const PAGE_VIEW_KEY = 'veritas_page_view_tracked'
        if (!sessionStorage.getItem(PAGE_VIEW_KEY)) {
          sessionStorage.setItem(PAGE_VIEW_KEY, 'true')
          track('page_view', {
            url: window.location.pathname,
            referrer: document.referrer || undefined,
            is_return_visit: true,
          })
        }
      }, 1000) // Wait 1 second to ensure page is loaded
    }
    
    // Mark this session as active
    sessionStorage.setItem(SESSION_KEY, 'true')
    
    // For first visits, page_view will be tracked in trackSessionEnd if they stay >7 seconds

    // Track meaningful actions
    const handleMeaningfulAction = (eventType: string) => {
      meaningfulActions.current.add(eventType)
    }

    // Listen for custom events from components
    const handleCTAClick = () => {
      handleMeaningfulAction('cta_click')
    }
    const handleScroll = () => {
      handleMeaningfulAction('scroll')
    }

    window.addEventListener('cta_click', handleCTAClick)
    window.addEventListener('scroll_meaningful', handleScroll)

    // Track user interaction to ensure we only track real scrolls
    let hasUserInteracted = false
    let lastSignificantScroll = 0
    const MIN_SCROLL_DELTA = 100 // Minimum pixels scrolled to count as real scroll
    
    // Track user interactions (mouse, touch, keyboard)
    const markUserInteraction = () => {
      hasUserInteracted = true
    }
    
    window.addEventListener('mousedown', markUserInteraction, { once: true, passive: true })
    window.addEventListener('touchstart', markUserInteraction, { once: true, passive: true })
    window.addEventListener('keydown', markUserInteraction, { once: true, passive: true })
    window.addEventListener('wheel', markUserInteraction, { once: true, passive: true })
    
    // Scroll depth tracking
    const handleScrollDepth = () => {
      // Don't track until we've initialized AND user has interacted
      if (!hasInitialized.current || !hasUserInteracted) {
        // Update scroll position but don't track
        lastScrollTop.current = window.scrollY || document.documentElement.scrollTop
        return
      }
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const documentHeight = document.documentElement.scrollHeight
      const windowHeight = window.innerHeight
      const scrollHeight = documentHeight - windowHeight
      
      // Only track if scroll position has changed significantly (user actually scrolled)
      const scrollDelta = Math.abs(scrollTop - lastScrollTop.current)
      if (scrollDelta < MIN_SCROLL_DELTA) {
        // Small movement, might be from content loading - ignore
        lastScrollTop.current = scrollTop
        return
      }
      
      // Only track if user has scrolled DOWN significantly from initial position
      if (scrollTop <= initialScrollTop.current + MIN_SCROLL_DELTA) {
        lastScrollTop.current = scrollTop
        return
      }
      
      // Update last scroll position
      lastScrollTop.current = scrollTop
      lastSignificantScroll = scrollTop
      
      // Prevent division by zero and ensure valid calculation
      if (scrollHeight <= 0 || scrollTop <= 0) return
      
      // Calculate depth: how far through the scrollable content the user has scrolled
      const depth = (scrollTop / scrollHeight) * 100
      
      // Only track if depth is meaningful (at least 20% to avoid false triggers)
      if (depth < 20) return
      
      const thresholds = [25, 50, 75]

      thresholds.forEach((threshold) => {
        if (depth >= threshold && !scrollFired.current[threshold]) {
          scrollFired.current[threshold] = true
          track(`scroll_${threshold}`, { depth: Math.round(depth) })
          handleMeaningfulAction('scroll')
          
          // Dispatch custom event for other listeners
          window.dispatchEvent(new CustomEvent('scroll_meaningful'))
        }
      })
    }

    // Throttle scroll events more aggressively - only check every 1000ms (1 second)
    let scrollTimeout: NodeJS.Timeout | null = null
    const throttledScroll = () => {
      if (scrollTimeout) return
      
      scrollTimeout = setTimeout(() => {
        handleScrollDepth()
        scrollTimeout = null
      }, 1000) // Only check every 1 second
    }

    window.addEventListener('scroll', throttledScroll, { passive: true })

    // Calculate accurate time on page (excluding hidden time)
    const getAccurateTimeOnPage = (): number => {
      const now = Date.now()
      let hiddenTime = totalHiddenTime.current
      
      // If page is currently hidden, add the time since it became hidden
      if (hiddenStartTime.current !== null && !isPageVisible.current) {
        hiddenTime += (now - hiddenStartTime.current)
      }
      
      // Total time = elapsed time - hidden time
      const accurateTime = Math.max(0, (now - startTime.current) - hiddenTime)
      return Math.round(accurateTime / 1000) // Convert to seconds
    }

    // Track time on page and page view / early exit - only when user actually leaves
    const trackSessionEnd = () => {
      // Check sessionStorage to prevent duplicate tracking (survives component remounts)
      const TIME_TRACKED_KEY = 'veritas_time_tracked'
      const PAGE_VIEW_KEY = 'veritas_page_view_tracked'
      
      if (sessionStorage.getItem(TIME_TRACKED_KEY) === 'true') {
        return
      }
      
      // Calculate accurate time (excluding hidden time)
      const timeOnPage = getAccurateTimeOnPage()
      
      // Only track if user was actually on the page for at least 1 second
      if (timeOnPage < 1) return
      
      // Mark as tracked in sessionStorage immediately to prevent duplicates
      sessionStorage.setItem(TIME_TRACKED_KEY, 'true')
      
      // Use sendBeacon for reliable tracking when page is closing (especially on mobile)
      const trackWithBeacon = (event: string, props: Record<string, any>) => {
        // Get anonymous_id from localStorage (persists across sessions)
        const anonId = localStorage.getItem('veritas_anon_id') || ''
        
        const payload = JSON.stringify({
          event,
          properties: props,
          anonymous_id: anonId,
          url: window.location.pathname,
          referrer: document.referrer || undefined,
          timestamp: Date.now(),
        })
        
        // Try sendBeacon first (more reliable on mobile when closing browser)
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          const success = navigator.sendBeacon('/api/track', blob)
          if (!success) {
            // Fallback if sendBeacon fails
            fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              keepalive: true,
            }).catch(() => {})
          }
        } else {
          // Fallback to regular fetch with keepalive
          fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true, // Keep request alive even if page is closing
          }).catch(() => {}) // Ignore errors - page might be closing
        }
      }
      
      // Track time on page (single event per session)
      trackWithBeacon('time_on_page', { seconds: timeOnPage })

      // Track page_view only if user stayed more than 7 seconds
      if (timeOnPage >= 7 && !sessionStorage.getItem(PAGE_VIEW_KEY)) {
        sessionStorage.setItem(PAGE_VIEW_KEY, 'true')
        trackWithBeacon('page_view', {
          url: window.location.pathname,
          referrer: document.referrer || undefined,
        })
      } else if (timeOnPage < 7) {
        // Track early exit if they left before 7 seconds
        trackWithBeacon('early_exit', { seconds: timeOnPage })
      }

      // Track quick exit only if no meaningful action AND time is less than 10 seconds
      if (meaningfulActions.current.size === 0 && timeOnPage < 10) {
        trackWithBeacon('quick_exit', { seconds: timeOnPage })
      }
    }

    // Use visibility change to pause/resume time tracking
    // This ensures accurate time tracking when user switches tabs, minimizes browser, or closes Chrome
    const handleVisibilityChange = () => {
      const now = Date.now()
      
      if (document.visibilityState === 'hidden') {
        // Page became hidden - pause time tracking
        isPageVisible.current = false
        hiddenStartTime.current = now
        
        // On mobile, if page is hidden for more than 30 seconds, assume they closed the browser
        // and track the session end immediately
        setTimeout(() => {
          if (!isPageVisible.current && hiddenStartTime.current) {
            // Page still hidden after 30 seconds - likely closed
            trackSessionEnd()
          }
        }, 30000) // 30 seconds
        
      } else if (document.visibilityState === 'visible') {
        // Page became visible again - resume time tracking
        if (hiddenStartTime.current !== null) {
          // Add the hidden time to total
          totalHiddenTime.current += (now - hiddenStartTime.current)
          hiddenStartTime.current = null
        }
        isPageVisible.current = true
      }
    }

    // beforeunload fires when page is actually unloading (closing/navigating away)
    const handleBeforeUnload = () => {
      trackSessionEnd()
    }

    // pagehide is more reliable - fires when page is actually being unloaded
    const handlePageHide = () => {
      trackSessionEnd()
    }

    // Listen to visibility changes (for reference)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Use pagehide as primary (more reliable), beforeunload as secondary
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('scroll', throttledScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('cta_click', handleCTAClick)
      window.removeEventListener('scroll_meaningful', handleScroll)
    }
  }, [])

  return <>{children}</>
}

