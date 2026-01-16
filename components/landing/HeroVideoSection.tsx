'use client'

import { motion } from 'framer-motion'

export function HeroVideoSection() {
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
            
            {/* Video Embed - Not Full Width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mx-auto max-w-4xl"
            >
              <div className="relative aspect-video w-full rounded-lg overflow-hidden shadow-2xl">
                <iframe
                  src="https://www.youtube.com/embed/Xw4lx8UMobg"
                  title="Horizon Park Apartments Investment Opportunity"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
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
          
            {/* 85% Raised Badge - Top Left Corner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-6 md:left-6 z-20"
            >
              <div className="bg-orange-500 px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-lg shadow-lg">
                <span className="text-white font-bold text-xs sm:text-sm md:text-lg uppercase tracking-wide drop-shadow-md whitespace-nowrap">85% Raised Already</span>
              </div>
            </motion.div>

            {/* White Text Metrics Overlay - No Box */}
            <div className="absolute inset-0 flex items-center justify-center px-4 py-8 sm:py-4 z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-5xl w-full"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 md:gap-8 lg:gap-12 text-center">
                  <div className="mt-2 sm:mt-0">
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-lg">$50K</div>
                    <div className="text-xs sm:text-sm md:text-base text-white/90 uppercase tracking-wide drop-shadow-md">Minimum Investment</div>
                  </div>
                  <div className="my-4 sm:my-0">
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-lg">2.22x</div>
                    <div className="text-xs sm:text-sm md:text-base text-white/90 uppercase tracking-wide drop-shadow-md">Equity Multiple</div>
                  </div>
                  <div className="mb-2 sm:mb-0">
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-lg">18.1%</div>
                    <div className="text-xs sm:text-sm md:text-base text-white/90 uppercase tracking-wide drop-shadow-md">Target Annual IRR</div>
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
