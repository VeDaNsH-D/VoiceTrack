import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AnalyticsModal } from './AnalyticsModal'

interface DashboardMainProps {
  userName: string
  onNavigate: (view: 'landing' | 'auth' | 'voice' | 'dashboard' | 'history') => void
}

export const DashboardMain: React.FC<DashboardMainProps> = ({ userName, onNavigate }) => {
  const [displayBalance, setDisplayBalance] = useState(0)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const finalBalance = 14857.05

  // Animate balance
  useEffect(() => {
    let animationFrame: number
    let currentValue = 0
    const increment = finalBalance / 40

    const animate = () => {
      currentValue += increment
      if (currentValue < finalBalance) {
        setDisplayBalance(currentValue)
        animationFrame = requestAnimationFrame(animate)
      } else {
        setDisplayBalance(finalBalance)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto px-6 py-10 pb-32 relative z-10"
      >
        {/* Top Handle to Close Dashboard overlay */}
        <motion.div variants={itemVariants} className="mb-6 flex justify-start mt-4">
          <button 
            onClick={() => onNavigate('voice')}
            className="w-10 h-10 bg-white bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </motion.div>

        {/* Greeting & Subtitle */}
        <motion.div variants={itemVariants} className="mb-8">
          <p className="text-sm font-medium text-[#1A1A1A] mb-1">Hello, {userName || 'Alex'}</p>
          <h1 className="text-4xl font-semibold text-[#1A1A1A] leading-[1.1] tracking-tight max-w-[280px]">
            AI manages your ledger so you can focus on sales.
          </h1>
        </motion.div>

        {/* Balance Card Container */}
        <motion.div variants={itemVariants} className="glass-card mb-4 relative z-20">
          <div className="mb-6">
            <p className="text-[13px] font-medium text-[#1A1A1A] opacity-80 mb-1">Your ledger and monthly progress</p>
            <p className="text-[13px] font-bold text-[#1A1A1A]">
              + ₹1,240 <span className="mx-1">•</span> <span className="opacity-60 font-medium">+2.9% this month</span>
            </p>
          </div>

          <div className="mb-6">
            <div className="text-[54px] font-semibold text-[#1A1A1A] tracking-tighter flex items-end">
              <span className="text-3xl pb-2 mr-1">₹</span>
              {displayBalance.toLocaleString('en-IN', {
                maximumFractionDigits: 0,
              })}
              <span className="text-[#8B8B8B] text-4xl pb-[6px]">.05</span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-[2] bg-[#8a9b80] bg-opacity-80 rounded-[20px] px-5 py-4 flex items-center shadow-sm">
              <span className="text-[15px] font-medium text-[#1A1A1A]">All good this month</span>
            </div>
            
            <button 
              onClick={() => setShowAnalytics(true)}
              className="flex-1 bg-[#F8F5F2] bg-opacity-50 rounded-[20px] px-3 py-4 flex flex-col items-center justify-center hover:bg-opacity-70 transition-all border border-white/20 shadow-sm"
            >
              <div className="text-sm font-bold text-[#1A1A1A]">+12%</div>
              <div className="text-[11px] font-medium text-[#1A1A1A] opacity-60">sales</div>
            </button>
          </div>
        </motion.div>

        {/* AI Insight Card */}
        <motion.div variants={itemVariants} className="glass-card flex items-center justify-between p-5">
          <div>
            <p className="text-[13px] font-medium text-[#1A1A1A] opacity-80 mb-1">AI insight</p>
            <h3 className="text-[15px] font-medium text-[#1A1A1A] leading-tight max-w-[200px]">
              Stock more <span className="font-bold">Bananas</span> tomorrow based on trends
            </h3>
          </div>
          
          <button 
            onClick={() => setShowAnalytics(true)}
            className="w-[52px] h-[52px] bg-[#161211] rounded-[20px] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-all shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F8F5F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </button>
        </motion.div>
      </motion.div>

      {/* Analytics Modal overlay */}
      {showAnalytics && <AnalyticsModal onClose={() => setShowAnalytics(false)} />}

      {/* Removed traditional bottom nav explicitly since this is an overlay */}
    </motion.div>
  )
}
