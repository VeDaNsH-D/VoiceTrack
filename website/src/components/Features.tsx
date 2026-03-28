import { motion } from 'framer-motion'
import { FiMic, FiBarChart2, FiZap, FiLayers, FiMessageSquare, FiDownload } from 'react-icons/fi'

const features = [
  {
    icon: <FiMic size={22} className="text-[#8A9B80]" />,
    bg: '#EBF2E6',
    title: 'Voice-First Logging',
    desc: 'Speak naturally in Hindi or English. VoiceTrace understands complex narrations and extracts every transaction automatically.',
  },
  {
    icon: <FiBarChart2 size={22} className="text-[#8A6FC3]" />,
    bg: '#F0EAFD',
    title: 'Smart Analytics',
    desc: 'Daily, weekly, and monthly reports generated from your voice. Know exactly what sold, what margins were, and what trends are emerging.',
  },
  {
    icon: <FiZap size={22} className="text-[#F5A623]" />,
    bg: '#FFF5E0',
    title: 'Demand Forecasting',
    desc: 'ML-powered demand prediction tells you what to stock tomorrow before you even ask. Never run out of your best-selling items again.',
  },
  {
    icon: <FiLayers size={22} className="text-[#E05A6B]" />,
    bg: '#FEECEF',
    title: 'Inventory Intelligence',
    desc: 'Automated low-stock alerts, reorder suggestions, and waste prevention — all derived from your daily voice recordings.',
  },
  {
    icon: <FiMessageSquare size={22} className="text-[#5BA8D4]" />,
    bg: '#E3F3FC',
    title: 'Context Chatbot',
    desc: 'Ask natural questions like "How much did I earn last week?" and get instant, accurate answers grounded in your actual data.',
  },
  {
    icon: <FiDownload size={22} className="text-[#1A1A1A]/50" />,
    bg: 'rgba(26,26,26,0.06)',
    title: 'Statement Export',
    desc: 'Download a professional CSV bank-style statement for any period with one click. Share with accountants or apply for loans.',
  },
]

export function Features() {
  return (
    <section className="section bg-subtle" id="features">
      <div className="container-web">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="section-tag">
            <FiZap size={11} /> Features
          </div>
          <h2 className="text-[42px] md:text-[52px] font-extrabold tracking-tight text-[#1A1A1A] mb-4">
            Everything a vendor needs,<br />
            <span className="text-gradient">nothing they don't</span>
          </h2>
          <p className="text-[17px] text-[#1A1A1A]/55 font-medium leading-relaxed">
            Built for street vendors, kirana stores, and small traders — not enterprise software teams.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className="card p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: f.bg }}>
                {f.icon}
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#1A1A1A] mb-1.5 tracking-tight">{f.title}</h3>
                <p className="text-[14px] text-[#1A1A1A]/55 font-medium leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
