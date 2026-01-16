'use client'

import { motion } from 'framer-motion'

export function FAQSection() {
  const faqs = [
    {
      question: 'What is the minimum investment?',
      answer: 'The minimum investment for Horizon Park Apartments is $50,000. This allows accredited investors to participate in this opportunity with a relatively accessible entry point while maintaining diversification.',
    },
    {
      question: 'What is the expected hold period?',
      answer: 'The typical hold period for our multifamily investments is 5-7 years. This timeframe allows us to implement value-add improvements, stabilize operations, optimize rental income, and achieve the projected returns before executing an exit strategy.',
    },
    {
      question: 'What are the risks of this investment?',
      answer: 'As a 506(c) real estate investment, there are several risks to consider: 1) Illiquidity - your capital will be committed for the hold period, 2) Market risk - property values and rental rates can fluctuate, 3) Operational risk - vacancies, maintenance costs, and property management challenges, 4) No guaranteed returns - past performance doesn\'t guarantee future results. However, we mitigate these risks through conservative underwriting, professional management, and focus on stable workforce housing markets.',
    },
    {
      question: 'Who qualifies to invest?',
      answer: 'This offering is available only to accredited investors as defined by SEC regulations. You must meet at least one of the following criteria: 1) Individual income exceeding $200,000 (or $300,000 joint income with spouse) in each of the last two years, 2) Net worth exceeding $1,000,000 (excluding primary residence), or 3) Hold certain professional licenses. We will verify accreditation status before accepting your investment.',
    },
    {
      question: 'How are returns distributed?',
      answer: 'Returns come in two forms: 1) Monthly cash flow distributions from operating profits (rental income minus expenses), and 2) Capital appreciation realized upon sale of the property. The projected 18.1% annual IRR includes both cash flow and appreciation. Distributions are typically made monthly, though timing may vary based on cash flow.',
    },
    {
      question: 'Can I see the property?',
      answer: 'Yes, property tours can be arranged for serious investors. Once you express interest and complete initial qualification, we can coordinate a visit to Horizon Park Apartments in Edmonds, WA. Contact us to schedule a tour.',
    },
    {
      question: 'What fees are associated with this investment?',
      answer: 'Our investment structure includes standard fees: 1) Acquisition fees for deal sourcing and closing, 2) Asset management fees for ongoing oversight and reporting, 3) Property management fees for day-to-day operations. All fees are clearly disclosed in the offering documents. We believe in transparency - you\'ll see exactly how fees impact returns in our financial projections.',
    },
    {
      question: 'What tax benefits does this investment provide?',
      answer: 'Real estate investments offer several tax advantages: 1) Depreciation deductions that can offset rental income, 2) Cost segregation studies to accelerate depreciation, 3) 1031 exchange opportunities (if applicable), 4) Potential capital gains treatment on sale. However, tax benefits depend on your individual circumstances. We recommend consulting with your tax advisor to understand how these benefits apply to your specific situation.',
    },
  ]

  return (
    <section id="faq-section" className="min-h-screen py-24 lg:py-32 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 lg:mb-20"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl lg:text-2xl text-gray-600">
              Everything you need to know about investing in Horizon Park Apartments
            </p>
          </motion.div>

          <div className="space-y-6 lg:space-y-8">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-lg overflow-hidden shadow-xl"
              >
                {/* Question - Dark Blue Background with White Text */}
                <div className="bg-slate-900 px-6 py-6 lg:px-8 lg:py-6">
                  <h3 className="text-xl lg:text-2xl font-bold text-white">
                    {faq.question}
                  </h3>
                </div>
                
                {/* Answer - White Background with Dark Text */}
                <div className="bg-white px-6 py-6 lg:px-8 lg:py-6">
                  <p className="text-base lg:text-lg text-gray-900 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 lg:mt-20 text-center"
          >
            <a
              href="#booking-section"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-2xl md:text-3xl px-12 py-6 md:px-16 md:py-8 rounded-lg transition-colors duration-200 shadow-lg"
            >
              SHOW ME THE DEAL
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

