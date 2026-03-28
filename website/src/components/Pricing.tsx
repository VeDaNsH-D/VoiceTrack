import { motion } from 'framer-motion'
import { FiArrowRight, FiCheck } from 'react-icons/fi'

interface PricingProps {
  onGetStarted: () => void
}

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'Perfect to get started and explore all core features.',
    features: [
      'Voice recording (up to 5 min/day)',
      'Basic transaction logging',
      'Today & this week history',
      'Hindi + English support',
      'CSV statement export',
    ],
    cta: 'Start for Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹299',
    period: '/month',
    desc: 'For active vendors who want AI-powered insights every day.',
    features: [
      'Unlimited voice recording',
      'Full analytics dashboard',
      'AI demand forecasting',
      'Inventory alerts & recommendations',
      'Context chatbot (unlimited queries)',
      'AI coach & cross-sell suggestions',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '₹799',
    period: '/month',
    desc: 'For businesses with multiple vendors under one account.',
    features: [
      'Everything in Pro',
      'Up to 5 vendor sub-accounts',
      'Shared business analytics',
      'Consolidated ledger view',
      'Custom Business ID',
      'Dedicated account support',
    ],
    cta: 'Contact Us',
    highlight: false,
  },
]

export function Pricing({ onGetStarted }: PricingProps) {
  return (
    <section className="section bg-subtle" id="pricing">
      <div className="container-web">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="section-tag">Pricing</div>
          <h2 className="text-[42px] md:text-[52px] font-extrabold tracking-tight text-[#1A1A1A] mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-[17px] text-[#1A1A1A]/55 font-medium">Start free. Upgrade when your business grows.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className={`rounded-[24px] p-7 flex flex-col gap-6 ${plan.highlight ? 'card-dark relative ring-2 ring-[#8A9B80]/40' : 'card'}`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="badge badge-sage shadow-sm">Most Popular</span>
                </div>
              )}

              <div>
                <p className={`text-[13px] font-bold uppercase tracking-widest mb-3 ${plan.highlight ? 'text-white/40' : 'text-[#1A1A1A]/40'}`}>{plan.name}</p>
                <div className="flex items-end gap-1.5">
                  <span className={`text-[42px] font-extrabold tracking-tight leading-none ${plan.highlight ? 'text-white' : 'text-[#1A1A1A]'}`}>{plan.price}</span>
                  <span className={`text-[14px] font-semibold pb-1.5 ${plan.highlight ? 'text-white/40' : 'text-[#1A1A1A]/40'}`}>{plan.period}</span>
                </div>
                <p className={`text-[13.5px] font-medium mt-2 ${plan.highlight ? 'text-white/50' : 'text-[#1A1A1A]/50'}`}>{plan.desc}</p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlight ? 'bg-[#8A9B80]/20' : 'bg-[#EBF2E6]'}`}>
                      <FiCheck size={11} className={plan.highlight ? 'text-[#8A9B80]' : 'text-[#5c7255]'} />
                    </div>
                    <span className={`text-[13.5px] font-medium ${plan.highlight ? 'text-white/65' : 'text-[#1A1A1A]/65'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onGetStarted}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[15px] transition-all mt-auto ${
                  plan.highlight
                    ? 'bg-[#8A9B80] text-white hover:brightness-110'
                    : 'bg-[#1A1A1A] text-white hover:bg-[#2A2523]'
                }`}
              >
                {plan.cta} <FiArrowRight size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
