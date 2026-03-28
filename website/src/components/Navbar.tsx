import { motion } from 'framer-motion'
import { FiArrowRight, FiMenu, FiX } from 'react-icons/fi'
import { useState } from 'react'

interface NavbarProps {
  scrolled: boolean
  onGetStarted: () => void
}

export function Navbar({ scrolled, onGetStarted }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Testimonials', href: '#testimonials' },
  ]

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container-web">
        <div className="flex items-center justify-between h-18 py-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 text-[#1A1A1A]">
              <svg viewBox="0 0 100 100" fill="none">
                <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
                <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
                <path d="M50 45 L50 60 C41 60 41 50 50 45 Z" fill="#FDFAF7" />
              </svg>
            </div>
            <span className="text-[18px] font-extrabold tracking-tight text-[#1A1A1A]">VoiceTrace</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a key={l.label} href={l.href} className="text-[14px] font-semibold text-[#1A1A1A]/55 hover:text-[#1A1A1A] transition-colors">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={onGetStarted} className="btn-outline text-[14px] !py-2.5 !px-5">
              Log In
            </button>
            <button onClick={onGetStarted} className="btn-primary text-[14px] !py-2.5 !px-5">
              Get Started <FiArrowRight size={14} />
            </button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-[#1A1A1A]/06 text-[#1A1A1A]" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white rounded-2xl shadow-lg p-5 mb-4 border border-[#1A1A1A]/06 space-y-3"
          >
            {links.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} className="block text-[15px] font-semibold text-[#1A1A1A]/70 hover:text-[#1A1A1A] py-1.5 transition-colors">
                {l.label}
              </a>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-[#1A1A1A]/07">
              <button onClick={onGetStarted} className="btn-primary w-full justify-center text-[15px]">
                Get Started <FiArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}
