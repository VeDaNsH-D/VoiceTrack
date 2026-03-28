import { motion } from 'framer-motion'
import { FiArrowRight, FiBarChart2, FiMic, FiTrendingUp } from 'react-icons/fi'

interface HeroProps {
  onGetStarted: () => void
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: 'easeOut' as const },
})

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="bg-hero bg-grid pt-32 pb-20 relative overflow-hidden">
      <div className="container-web relative z-10">
        <div className="max-w-3xl mx-auto text-center">

          {/* Tag */}
          <motion.div {...fadeUp(0)} className="flex justify-center mb-8">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/90 rounded-full px-4 py-2 shadow-sm">
              <span className="status-dot status-dot-live" />
              <span className="text-[13px] font-semibold text-[#1A1A1A]/65">AI voice features are live — free to try</span>
              <span className="w-px h-4 bg-[#1A1A1A]/12 mx-1" />
              <button onClick={onGetStarted} className="text-[13px] font-bold text-[#8A9B80] flex items-center gap-1 hover:underline">
                Start now <FiArrowRight size={12} />
              </button>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1 {...fadeUp(0.07)} className="text-[56px] md:text-[72px] lg:text-[82px] font-extrabold tracking-[-0.04em] text-[#1A1A1A] mb-6 leading-[1.03]">
            Your Business<br />
            <span className="text-gradient">Voice&#8202;-&#8202;Ledgered</span>
          </motion.h1>

          <motion.p {...fadeUp(0.14)} className="text-[18px] md:text-[20px] text-[#1A1A1A]/55 font-medium leading-relaxed max-w-2xl mx-auto mb-10">
            Speak naturally. VoiceTrace logs sales, tracks inventory, predicts demand, and surfaces insights — all without lifting a finger.
          </motion.p>

          <motion.div {...fadeUp(0.2)} className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <button onClick={onGetStarted} className="btn-primary text-[16px] !py-4 !px-8">
              Get Started Free <FiArrowRight size={16} />
            </button>
            <button className="btn-ghost text-[16px] !py-4 !px-7">
              Watch Demo
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div {...fadeUp(0.28)} className="flex flex-wrap items-center justify-center gap-6 text-[13px] text-[#1A1A1A]/45 font-semibold">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['#FFCBA4','#B5D5A8','#A8C5DA','#D5B8F0'].map((c,i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }} />
                ))}
              </div>
              2,400+ vendors
            </div>
            <div className="w-1 h-1 rounded-full bg-[#1A1A1A]/20 hidden sm:block" />
            <span>No credit card required</span>
            <div className="w-1 h-1 rounded-full bg-[#1A1A1A]/20 hidden sm:block" />
            <span>Supports Hindi &amp; English</span>
          </motion.div>
        </div>

        {/* Dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-20 relative"
        >
          {/* Main dashboard card */}
          <div className="card max-w-4xl mx-auto p-0 overflow-hidden shadow-xl border-[#1A1A1A]/09">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#FAFAF9] border-b border-[#1A1A1A]/06">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#F85F54]" />
                <div className="w-3 h-3 rounded-full bg-[#F5A623]" />
                <div className="w-3 h-3 rounded-full bg-[#8A9B80]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-[#1A1A1A]/06 rounded-lg px-8 py-1.5 text-[12px] text-[#1A1A1A]/40 font-medium">
                  voicetrace.ai/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-6 md:p-8 bg-[#F7F3EF]">
              <div className="grid grid-cols-12 gap-4">

                {/* Left sidebar */}
                <div className="col-span-3 hidden lg:flex flex-col gap-4">
                  <div className="bg-[#141110] rounded-2xl p-4 h-full flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 text-white/90">
                        <svg viewBox="0 0 100 100" fill="none">
                          <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
                          <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
                        </svg>
                      </div>
                      <span className="text-white font-bold text-[13px]">VoiceTrace</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {[
                        { label: 'Voice Ledger', active: true },
                        { label: 'Dashboard', active: false },
                        { label: 'AI Insights', active: false },
                        { label: 'History', active: false },
                      ].map(item => (
                        <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-semibold ${item.active ? 'bg-white/10 text-white' : 'text-white/35'}`}>
                          {item.active && <div className="w-1 h-4 rounded-full bg-[#8A9B80] absolute -ml-3" />}
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main area */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-4">
                  {/* Top stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Net Balance', value: '₹18,500', tag: '+8%', tagColor: 'badge-green', icon: <FiTrendingUp size={14} className="text-[#5c7255]" /> },
                      { label: 'Sales Today', value: '₹3,250', tag: '24 entries', tagColor: 'badge-neutral', icon: <FiBarChart2 size={14} className="text-[#1A1A1A]/40" /> },
                      { label: 'Predict. Tomorrow', value: '₹4,100', tag: '82% conf.', tagColor: 'badge-sage', icon: <span className="text-[11px]">🤖</span> },
                    ].map(stat => (
                      <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-[#1A1A1A]/05">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">{stat.label}</span>
                          {stat.icon}
                        </div>
                        <p className="text-[22px] font-extrabold tracking-tight text-[#1A1A1A]">{stat.value}</p>
                        <span className={`badge ${stat.tagColor} mt-2`}>{stat.tag}</span>
                      </div>
                    ))}
                  </div>

                  {/* Voice panel */}
                  <div className="bg-[#141110] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[12px] font-bold uppercase tracking-widest text-white/35">Live Voice Recording</span>
                      <div className="flex items-center gap-1.5">
                        <span className="status-dot status-dot-live" style={{ background: '#F85F54' }} />
                        <span className="text-[11px] text-white/45 font-semibold">Recording</span>
                      </div>
                    </div>
                    {/* Waveform */}
                    <div className="flex items-end gap-[3px] h-12">
                      {[20,35,55,70,48,80,60,40,75,55,30,65,80,45,60,50,30,70,45,60,35,55,70,40,55,80,45,30].map((h, i) => (
                        <div key={i} className="flex-1 rounded-full bg-gradient-to-t from-[#F85F54] via-[#F9A26A] to-[#FDE3AE]" style={{ height: `${h}%`, opacity: 0.85 }} />
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F85F54] flex items-center justify-center flex-shrink-0">
                        <FiMic size={14} className="text-white" />
                      </div>
                      <p className="text-[12px] text-white/50 font-medium italic">"Sold 10kg tomato at 30 rupee, 5kg potato at 25..."</p>
                    </div>
                  </div>

                  {/* Recent entries */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#1A1A1A]/05">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-3">Recent Entries</p>
                    <div className="space-y-2">
                      {[
                        { item: 'Tomato (10kg)', amount: '+₹300', type: 'credit' },
                        { item: 'Potato (5kg)', amount: '+₹125', type: 'credit' },
                        { item: 'Market fee', amount: '-₹50', type: 'debit' },
                      ].map(entry => (
                        <div key={entry.item} className="flex items-center justify-between py-2 border-b border-[#1A1A1A]/05 last:border-0">
                          <span className="text-[13px] font-semibold text-[#1A1A1A]/80">{entry.item}</span>
                          <span className={`text-[13px] font-bold ${entry.type === 'credit' ? 'text-[#5c7255]' : 'text-[#F85F54]'}`}>{entry.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute -right-4 top-16 hidden xl:block float">
            <div className="card p-4 w-52 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-xl bg-[#EBF2E6] flex items-center justify-center">🧠</div>
                <span className="text-[12px] font-bold text-[#1A1A1A]">AI Insight</span>
              </div>
              <p className="text-[11.5px] text-[#1A1A1A]/55 font-medium leading-tight">Tomato sales are 21% above your weekly avg. Stock more tomorrow.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
