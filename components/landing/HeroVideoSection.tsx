'use client'

import { motion } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { track } from '@/lib/tracking'

export function HeroVideoSection() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTimeRef = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.muted = false
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const blockSeek = () => {
      video.currentTime = lastTimeRef.current
    }
    const saveTime = () => {
      lastTimeRef.current = video.currentTime
    }
    video.addEventListener('seeking', blockSeek)
    video.addEventListener('timeupdate', saveTime)
    return () => {
      video.removeEventListener('seeking', blockSeek)
      video.removeEventListener('timeupdate', saveTime)
    }
  }, [])

  const handleCTAClick = () => {
    track('cta_click', { cta: 'schedule_demo', location: 'hero_section' })
    window.dispatchEvent(new CustomEvent('cta_click'))
  }
  return (
    <section className="relative overflow-hidden bg-slate-900">
      {/* Text Content Section */}
      <div className="bg-slate-900 py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl text-center text-white">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 uppercase tracking-tight"
            >
              Horizon Park Apartments
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg md:text-xl mb-12 text-gray-300 uppercase tracking-wide"
            >
              Edmonds, Washington • Passive Investment Opportunity
            </motion.p>
            
            {/* Video - Autoplay, pause/mute controls, no seeking */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto max-w-4xl"
            >
              <div className="hero-video relative aspect-video w-full rounded-lg overflow-hidden shadow-2xl cursor-pointer group">
                <video
                  ref={videoRef}
                  src="/veritas-video.mp4"
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  controls
                  controlsList="nodownload"
                  preload="auto"
                  onPlay={() => {
                    videoRef.current && (videoRef.current.muted = false)
                    setIsPlaying(true)
                  }}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                {/* Center play/pause icon like YouTube - desktop only (native controls on mobile avoid duplicate) */}
                <div
                  className="absolute inset-0 bottom-12 hidden md:flex items-center justify-center cursor-pointer"
                  onClick={togglePlayPause}
                  onKeyDown={(e) => e.key === 'Enter' && togglePlayPause()}
                  role="button"
                  tabIndex={0}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <div className={`w-20 h-20 rounded-full bg-black/50 flex items-center justify-center transition-opacity duration-200 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                    {isPlaying ? (
                      <svg className="w-10 h-10 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Call to Action Section Before Image */}
      <div className="bg-white py-8 sm:py-10 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center text-gray-900">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                Ready to Learn More About This Opportunity?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
                It's a personalized investor call where you'll receive detailed, actionable insights about <strong className="text-gray-900">Horizon Park Apartments</strong> from the team that's built a <strong className="text-gray-900">$50M+ portfolio</strong> and delivered <strong className="text-gray-900">32% lifetime annualized returns</strong> in the Pacific Northwest.
              </p>
              <a
                href="#booking-section"
                onClick={(e) => {
                  e.preventDefault()
                  handleCTAClick()
                  document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl px-6 py-4 sm:px-8 sm:py-5 md:px-12 md:py-6 lg:px-16 lg:py-8 rounded-lg transition-colors duration-200 shadow-lg"
              >
                SHOW ME THE DEAL
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Property Image Section with Overlaid Metrics */}
      <div className="relative w-full pt-6 sm:pt-8 pb-12 sm:pb-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-2xl group cursor-pointer transition-all duration-300">
            {/* Dark Blue Overlay on Image - Matching Video Section Color */}
            <div className="absolute inset-0 bg-slate-900 z-0 rounded-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
            
            <img
              src="https://images1.apartments.com/i2/bvBN-5ZM_HyAqZyhx6HTOmVAdysBX_Tldf7zBHQUFoI/111/horizon-park-apartments-edmonds-wa-primary-photo.jpg"
              alt="Horizon Park Apartments"
              className="w-full h-full object-cover relative z-0 brightness-[0.7] group-hover:brightness-[0.55] transition-all duration-300"
            />
          
            {/* 85% Raised Badge - Top Right Corner (moved to avoid overlap) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-20"
            >
              <div className="bg-orange-500 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-lg shadow-lg">
                <span className="text-white font-bold text-xs sm:text-sm md:text-lg uppercase tracking-wide drop-shadow-md whitespace-nowrap">85% Raised Already</span>
              </div>
            </motion.div>

            {/* White Text Metrics Overlay - Horizontal Layout */}
            <div className="absolute inset-0 flex items-center justify-center px-2 sm:px-4 py-4 z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-5xl w-full"
              >
                <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-12 text-center">
                  <div>
                    <div className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">$50K</div>
                    <div className="text-[10px] sm:text-xs md:text-sm lg:text-base text-white/90 uppercase tracking-wide drop-shadow-md leading-tight">Minimum Investment</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">2.22x</div>
                    <div className="text-[10px] sm:text-xs md:text-sm lg:text-base text-white/90 uppercase tracking-wide drop-shadow-md leading-tight">Equity Multiple</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-1 sm:mb-2 drop-shadow-lg">18.1%</div>
                    <div className="text-[10px] sm:text-xs md:text-sm lg:text-base text-white/90 uppercase tracking-wide drop-shadow-md leading-tight">Target Annual IRR</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
