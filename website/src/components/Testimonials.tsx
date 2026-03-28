import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'Ramesh Yadav',
    role: 'Vegetable Vendor, Pune',
    avatar: '#FFCBA4',
    initial: 'R',
    text: 'Pehle haath se likha karta tha, bahut time lagta tha. VoiceTrace se ek minute mein poora din ka hisaab ho jaata hai. Kamal hai!',
  },
  {
    name: 'Sunita Devi',
    role: 'Kirana Store, Varanasi',
    avatar: '#B5D5A8',
    initial: 'S',
    text: 'Mujhe pata nahi tha kitna loss ho raha tha potato mein. AI ne bataya aur ab profit 12% badh gayi. Bahut helpful hai yeh app.',
  },
  {
    name: 'Mohammed Irfan',
    role: 'Fruit Trader, Hyderabad',
    avatar: '#A8C5DA',
    initial: 'M',
    text: 'The demand forecast is accurate. Last week it predicted more mango demand and I stocked up. Sold everything with better margins.',
  },
  {
    name: 'Kavita Sharma',
    role: 'Dairy Vendor, Jaipur',
    avatar: '#D5B8F0',
    initial: 'K',
    text: 'Hindi mein bolne ki suvidha bahut achhi hai. Jab bhi koi customer se deal hoti hai, turant record ho jaati hai bina typing ke.',
  },
  {
    name: 'Arun Kumar',
    role: 'Tea Stall Owner, Delhi',
    avatar: '#FDE3AE',
    initial: 'A',
    text: 'Statement export feature helped me get a small business loan. The bank accepted the VoiceTrace CSV as proof of income!',
  },
  {
    name: 'Priya Nair',
    role: 'Flower Trader, Kochi',
    avatar: '#F8C5B8',
    initial: 'P',
    text: 'Even my daughter uses VoiceTrace to help me manage the stall. The chatbot answers her questions instantly. Very smart!',
  },
]

export function Testimonials() {
  return (
    <section className="section" id="testimonials">
      <div className="container-web">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="section-tag">Testimonials</div>
          <h2 className="text-[42px] md:text-[52px] font-extrabold tracking-tight text-[#1A1A1A] mb-4">
            Vendors love it
          </h2>
          <p className="text-[17px] text-[#1A1A1A]/55 font-medium">2,400+ vendors trust their business to VoiceTrace every day.</p>
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="card p-5 break-inside-avoid"
            >
              <p className="text-[14.5px] text-[#1A1A1A]/70 font-medium leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-bold text-[#1A1A1A] text-[14px]" style={{ background: t.avatar }}>
                  {t.initial}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">{t.name}</p>
                  <p className="text-[11.5px] text-[#1A1A1A]/40 font-medium">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
