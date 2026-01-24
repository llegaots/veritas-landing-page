'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/tracking'

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const startTime = useRef<number>(Date.now())
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
    
    // Don't track page_view immediately - wait to see if they stay > 7 seconds
    // This will be handled in trackSessionEnd

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

    // Track time on page and page view / early exit - only when user actually leaves
    const trackSessionEnd = () => {
      // Check sessionStorage to prevent duplicate tracking (survives component remounts)
      const TIME_TRACKED_KEY = 'veritas_time_tracked'
      const PAGE_VIEW_KEY = 'veritas_page_view_tracked'
      
      if (sessionStorage.getItem(TIME_TRACKED_KEY) === 'true') {
        return
      }
      
      const timeOnPage = Math.round((Date.now() - startTime.current) / 1000)
      
      // Only track if user was actually on the page for at least 1 second
      if (timeOnPage < 1) return
      
      // Mark as tracked in sessionStorage immediately to prevent duplicates
      sessionStorage.setItem(TIME_TRACKED_KEY, 'true')
      
      // Track time on page (single event per session)
      track('time_on_page', { seconds: timeOnPage })

      // Track page_view only if user stayed more than 7 seconds
      if (timeOnPage >= 7 && !sessionStorage.getItem(PAGE_VIEW_KEY)) {
        sessionStorage.setItem(PAGE_VIEW_KEY, 'true')
        track('page_view', {
          url: window.location.pathname,
          referrer: document.referrer || undefined,
        })
      } else if (timeOnPage < 7) {
        // Track early exit if they left before 7 seconds
        track('early_exit', { seconds: timeOnPage })
      }

      // Track quick exit only if no meaningful action AND time is less than 10 seconds
      if (meaningfulActions.current.size === 0 && timeOnPage < 10) {
        track('quick_exit', { seconds: timeOnPage })
      }
    }

    // Use visibility change to detect when user actually leaves (not just tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page became hidden - user might have switched tabs or left
        isPageVisible.current = false
      } else if (document.visibilityState === 'visible') {
        // Page became visible again - user came back to tab
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

