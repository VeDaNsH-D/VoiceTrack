import { motion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Open the App & Tap Record',
    desc: "Launch VoiceTrace on your phone or browser. Hit the mic button and start narrating your day's transactions — like you're talking to a friend.",
    visual: (
      <div className="bg-[#141110] rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#F85F54]" />
          <span className="text-[11px] text-white/35 font-bold uppercase tracking-wider">Listening…</span>
        </div>
        <div className="flex items-end gap-[3px] h-10">
          {[20,45,65,80,55,90,70,45,80,60,35,70,85,50,65,40,55,75,45,65].map((h, i) => (
            <div key={i} className="flex-1 rounded-full bg-gradient-to-t from-[#F85F54] to-[#FDE3AE]" style={{ height: `${h}%` }} />
          ))}
        </div>
        <p className="text-[12px] text-white/50 italic font-medium">"Aaj 5kg tomato 30 pe becha, 3 kg potato 20 pe…"</p>
      </div>
    )
  },
  {
    num: '02',
    title: 'AI Extracts Every Entry',
    desc: 'Our NLP engine parses your narration and extracts items, quantities, prices, and types — even from mixed Hindi-English speech.',
    visual: (
      <div className="bg-white rounded-2xl p-5 border border-[#1A1A1A]/07 flex flex-col gap-2.5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/35 mb-1">Extracted Entries</p>
        {[
          { item: 'Tomato', qty: '5 kg', price: '₹30/kg', total: '₹150', cls: '#5c7255' },
          { item: 'Potato', qty: '3 kg', price: '₹20/kg', total: '₹60', cls: '#5c7255' },
        ].map(e => (
          <div key={e.item} className="flex items-center justify-between py-2 border-b border-[#1A1A1A]/05 last:border-0">
            <div>
              <p className="text-[13px] font-bold text-[#1A1A1A]">{e.item}</p>
              <p className="text-[11px] text-[#1A1A1A]/40 font-medium">{e.qty} × {e.price}</p>
            </div>
            <span className="text-[14px] font-extrabold" style={{ color: e.cls }}>{e.total}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1">
          <span className="text-[12px] font-bold text-[#1A1A1A]/50">Confidence</span>
          <span className="badge badge-green">96%</span>
        </div>
      </div>
    )
  },
  {
    num: '03',
    title: 'Get Insights Automatically',
    desc: 'Your ledger builds itself. View trends, forecasts, profit margins, and anomaly alerts — updated in real time as you record.',
    visual: (
      <div className="bg-white rounded-2xl p-5 border border-[#1A1A1A]/07 flex flex-col gap-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/35 mb-1">Today's Summary</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Sales', value: '₹2,400', color: '#5c7255', bg: '#EBF2E6' },
            { label: 'Expenses', value: '₹320', color: '#c0392b', bg: '#FEECEF' },
            { label: 'Net', value: '₹2,080', color: '#1A1A1A', bg: '#F5F0EB' },
            { label: 'Entries', value: '18', color: '#5a7a50', bg: '#EBF2E6' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: s.bg }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/40">{s.label}</p>
              <p className="text-[18px] font-extrabold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    )
  },
]

export function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container-web">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="section-tag">How It Works</div>
          <h2 className="text-[42px] md:text-[52px] font-extrabold tracking-tight text-[#1A1A1A] mb-4">
            Three steps to a<br /><span className="text-gradient">smart ledger</span>
          </h2>
          <p className="text-[17px] text-[#1A1A1A]/55 font-medium">No training. No complex setup. Just speak.</p>
        </div>

        <div className="flex flex-col gap-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className={`grid grid-cols-1 md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? 'md:[direction:rtl]' : ''}`}
            >
              <div className={i % 2 === 1 ? '[direction:ltr]' : ''}>
                <div className="text-[56px] font-extrabold tracking-tight text-[#1A1A1A]/08 leading-none mb-4 select-none">{step.num}</div>
                <h3 className="text-[28px] font-extrabold tracking-tight text-[#1A1A1A] mb-3">{step.title}</h3>
                <p className="text-[16px] text-[#1A1A1A]/55 font-medium leading-relaxed max-w-sm">{step.desc}</p>
              </div>
              <div className={i % 2 === 1 ? '[direction:ltr]' : ''}>{step.visual}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
