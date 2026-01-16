'use client'

import { useState, useEffect, useRef } from 'react'

export function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    // Find all "SHOW ME THE DEAL" buttons on the page
    const ctaButtons = document.querySelectorAll('a[href="#booking-section"]')
    // Find the booking section itself
    const bookingSection = document.getElementById('booking-section')
    
    if (ctaButtons.length === 0 && !bookingSection) return

    const elementVisibilityMap = new Map<Element, boolean>()

    // Use Intersection Observer to detect when buttons or booking section are visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          elementVisibilityMap.set(entry.target, entry.isIntersecting)
        })

        // Check if any CTA button is visible
        const anyButtonVisible = Array.from(elementVisibilityMap.entries())
          .filter(([element]) => Array.from(ctaButtons).includes(element as Element))
          .some(([, visible]) => visible)

        // Check if booking section is in view
        const bookingSectionVisible = bookingSection 
          ? elementVisibilityMap.get(bookingSection) || false
          : false

        // Hide floating button if booking section is visible or any CTA button is visible
        // Show floating button if none are visible and user has scrolled down
        const hasScrolled = window.scrollY > 200
        setIsVisible(!anyButtonVisible && !bookingSectionVisible && hasScrolled)
      },
      {
        threshold: 0.1, // Trigger when 10% of element is visible
      }
    )

    // Observe all CTA buttons
    ctaButtons.forEach((button) => {
      if (observerRef.current) {
        observerRef.current.observe(button)
      }
    })

    // Observe the booking section itself
    if (bookingSection && observerRef.current) {
      observerRef.current.observe(bookingSection)
    }

    // Also check scroll position
    const handleScroll = () => {
      const anyButtonVisible = Array.from(elementVisibilityMap.entries())
        .filter(([element]) => Array.from(ctaButtons).includes(element as Element))
        .some(([, visible]) => visible)
      
      const bookingSectionVisible = bookingSection 
        ? elementVisibilityMap.get(bookingSection) || false
        : false

      const hasScrolled = window.scrollY > 200
      setIsVisible(!anyButtonVisible && !bookingSectionVisible && hasScrolled)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (observerRef.current) {
        ctaButtons.forEach((button) => {
          observerRef.current?.unobserve(button)
        })
        if (bookingSection) {
          observerRef.current.unobserve(bookingSection)
        }
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
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300 px-4 w-full max-w-sm sm:max-w-none sm:w-auto sm:px-0">
      <a
        href="#booking-section"
        onClick={scrollToBooking}
        className="block w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base sm:text-lg md:text-xl px-8 py-3.5 sm:px-8 sm:py-4 rounded-lg transition-colors duration-200 shadow-2xl hover:shadow-orange-500/50 text-center whitespace-nowrap"
      >
        SHOW ME THE DEAL
      </a>
    </div>
  )
}

