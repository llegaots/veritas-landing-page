'use client'

import { useState, useEffect, useRef } from 'react'

export function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Find all "SHOW ME THE DEAL" buttons on the page
    const ctaButtons = document.querySelectorAll('a[href="#booking-section"]')
    
    if (ctaButtons.length === 0) return

    const buttonVisibilityMap = new Map<Element, boolean>()

    // Use Intersection Observer to detect when buttons are visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          buttonVisibilityMap.set(entry.target, entry.isIntersecting)
        })

        // Check if any button is visible
        const anyButtonVisible = Array.from(buttonVisibilityMap.values()).some(visible => visible)

        // Show floating button if no CTA button is visible and user has scrolled down
        const hasScrolled = window.scrollY > 200
        setIsVisible(!anyButtonVisible && hasScrolled)
      },
      {
        threshold: 0.1, // Trigger when 10% of button is visible
      }
    )

    // Observe all CTA buttons
    ctaButtons.forEach((button) => {
      if (observerRef.current) {
        observerRef.current.observe(button)
      }
    })

    // Also check scroll position
    const handleScroll = () => {
      const hasScrolled = window.scrollY > 200
      setIsVisible(visibleButtonsCount === 0 && hasScrolled)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (observerRef.current) {
        ctaButtons.forEach((button) => {
          observerRef.current?.unobserve(button)
        })
        observerRef.current.disconnect()
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToBooking = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <a
        href="#booking-section"
        onClick={scrollToBooking}
        className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base sm:text-lg md:text-xl px-6 py-3 sm:px-8 sm:py-4 rounded-lg transition-colors duration-200 shadow-2xl hover:shadow-orange-500/50"
      >
        SHOW ME THE DEAL
      </a>
    </div>
  )
}

