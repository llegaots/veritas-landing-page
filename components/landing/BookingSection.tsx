'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { track } from '@/lib/tracking'

export function BookingSection() {
  // Calendly embed URL
  const calendlyUrl = 'https://calendly.com/alex-veritasequitypartners/15-minute-intro-call'
  const [iframeSrc, setIframeSrc] = useState<string>('')

  useEffect(() => {
    // Set iframe src on client side only to avoid hydration mismatch
    const embedDomain = typeof window !== 'undefined' ? window.location.hostname : ''
    setIframeSrc(`${calendlyUrl}?embed_domain=${embedDomain}&embed_type=Inline`)

    // Load Calendly script
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.body.appendChild(script)

    // Listen for Calendly events
    const handleCalendlyEvent = async (e: MessageEvent) => {
      if (e.data.event && e.data.event.indexOf('calendly') === 0) {
        const eventName = e.data.event
        const payload = e.data.payload || {}
        
        // Log full event data structure for debugging
        if (eventName === 'calendly.event_scheduled') {
          console.log('[Calendly] Full event data:', {
            event: e.data.event,
            payload: e.data.payload,
            fullData: e.data,
            dataKeys: Object.keys(e.data || {})
          })
        }

        if (eventName === 'calendly.date_and_time_selected') {
          // Track when user selects a date/time slot
          track('calendly_date_selected', {
            event_type: 'calendly_date_selection',
            invitee_uri: payload.invitee_uri,
            event_uri: payload.event_uri,
            time: payload.time,
          })
        } else if (eventName === 'calendly.event_scheduled') {
          // Parse payload if it's a string
          let parsedPayload = payload
          if (typeof payload === 'string') {
            try {
              parsedPayload = JSON.parse(payload)
            } catch (e) {
              console.error('[Calendly] Failed to parse payload JSON:', e)
              parsedPayload = {}
            }
          }

          // Extract invitee URI from payload
          // Calendly only provides the URI in the postMessage event (for privacy)
          // The payload structure can vary, so we check multiple locations
          const invitee = parsedPayload.invitee || parsedPayload.event?.invitee || {}
          let inviteeUri = invitee.uri || parsedPayload.invitee_uri || parsedPayload.event?.invitee_uri
          
          // Also check for invitee_uri at top level
          if (!inviteeUri) {
            inviteeUri = parsedPayload.invitee_uri
          }
          
          // Log the full structure for debugging
          console.log('[Calendly] Event scheduled, fetching invitee details:', {
            inviteeUri,
            inviteeObject: invitee,
            parsedPayloadKeys: typeof parsedPayload === 'object' ? Object.keys(parsedPayload) : [],
            inviteeKeys: typeof invitee === 'object' ? Object.keys(invitee) : [],
            fullPayload: JSON.stringify(parsedPayload).substring(0, 1000) // First 1000 chars
          })

          // Fetch invitee details from our API (which calls Calendly API)
          if (inviteeUri) {
            try {
              const response = await fetch(`/api/calendly/invitee?uri=${encodeURIComponent(inviteeUri)}`)
              const inviteeData = await response.json()
              
              if (response.ok && inviteeData.name) {
                const name = inviteeData.name
                const email = inviteeData.email || ''

                console.log('[Calendly] ✅ Successfully fetched invitee details:', {
                  name,
                  email,
                  hasName: !!name,
                  hasEmail: !!email
                })

                // Track demo booked with name
                track('demo_booked', {
                  event_type: 'calendly_booking',
                  name: name,
                  email: email,
                  invitee_uri: inviteeUri,
                  event_uri: parsedPayload.event_uri || parsedPayload.event?.event_uri,
                  payload: parsedPayload,
                })

                // Also notify backend to pause sequences
                try {
                  await fetch('/api/webhooks/calendly', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      event: 'calendly.event_scheduled',
                      payload: {
                        invitee: {
                          email: email,
                          name: name,
                          uri: inviteeUri,
                        },
                        event_uri: parsedPayload.event_uri || parsedPayload.event?.event_uri,
                        event: parsedPayload.event || {},
                      },
                    }),
                  })
                } catch (error) {
                  console.error('[Calendly] Error notifying backend:', error)
                }
              } else {
                console.warn('[Calendly] ⚠️ Failed to fetch invitee details:', inviteeData)
                
                // Track without name as fallback
                track('demo_booked', {
                  event_type: 'calendly_booking',
                  invitee_uri: inviteeUri,
                  event_uri: parsedPayload.event_uri || parsedPayload.event?.event_uri,
                  payload: parsedPayload,
                })
              }
            } catch (error) {
              console.error('[Calendly] ❌ Error fetching invitee details:', error)
              
              // Track without name as fallback
              track('demo_booked', {
                event_type: 'calendly_booking',
                invitee_uri: inviteeUri,
                event_uri: parsedPayload.event_uri || parsedPayload.event?.event_uri,
                payload: parsedPayload,
              })
            }
          } else {
            console.warn('[Calendly] ⚠️ No invitee URI found in payload')
            
            // Track without name/URI as fallback
            track('demo_booked', {
              event_type: 'calendly_booking',
              event_uri: parsedPayload.event_uri || parsedPayload.event?.event_uri,
              payload: parsedPayload,
            })
          }
        }
      }
    }

    window.addEventListener('message', handleCalendlyEvent)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
      window.removeEventListener('message', handleCalendlyEvent)
    }
  }, [])

  return (
    <section id="booking-section" className="py-16 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Schedule Your Investor Call
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Book a time that works for you to discuss the Horizon Park Apartments opportunity
            </p>
          </motion.div>

          {/* Calendly Embed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-xl p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-200 shadow-lg max-w-4xl mx-auto"
          >
            <div className="calendly-inline-widget h-[500px] sm:h-[600px] md:h-[700px]" style={{ minWidth: '320px' }}>
              {iframeSrc && (
                <iframe
                  src={iframeSrc}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  title="Schedule time with Veritas Equity Partners"
                  className="rounded-lg"
                ></iframe>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

