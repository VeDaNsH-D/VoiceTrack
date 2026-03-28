import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HistoryProps {
  onNavigate: (view: 'landing' | 'auth' | 'voice' | 'dashboard' | 'history') => void
}

type Period = 'Today' | 'This Week' | 'This Month' | 'Custom'

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const [activePeriod, setActivePeriod] = useState<Period>('Today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Mock data for history based on vendor voice records
  const allHistoryData = [
    { id: 1, date: 'Today, 2:30 PM', period: 'Today', text: 'Sold 5 dozen bananas and spent ₹200 on transport.', revenue: 300, expense: 200 },
    { id: 2, date: 'Today, 10:00 AM', period: 'Today', text: 'Morning stock arrived. Paid ₹500 advance.', revenue: 0, expense: 500 },
    { id: 3, date: 'Yesterday, 6:00 PM', period: 'This Week', text: 'Good day. Sold all apples for ₹800. No expenses.', revenue: 800, expense: 0 },
    { id: 4, date: 'Monday, 4:15 PM', period: 'This Week', text: 'Paid rent ₹500 and sold mixed fruits worth ₹1200.', revenue: 1200, expense: 500 },
    { id: 5, date: 'Mar 15, 8:00 PM', period: 'This Month', text: 'Big event nearby. Handled ₹2500 in sales, paid helpers ₹400.', revenue: 2500, expense: 400 },
    { id: 6, date: 'Mar 10, 1:00 PM', period: 'This Month', text: 'Rain disrupted evening. Sales ₹600.', revenue: 600, expense: 0 },
  ]

  const filteredData = allHistoryData.filter(item => {
    if (activePeriod === 'Today') return item.period === 'Today'
    if (activePeriod === 'This Week') return item.period === 'Today' || item.period === 'This Week'
    if (activePeriod === 'This Month') return true
    // If Custom, filter by simple string inclusion or logic. We mock it showing items that fall inside bounds.
    if (activePeriod === 'Custom') {
      if (!startDate || !endDate) return false // Require both to show
      return true // For mockup, showing all when custom range is populated.
    }
    return true
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      <div className="px-6 pt-12 pb-2 flex flex-col items-start justify-between z-10 w-full">
        <div className="w-full flex justify-between items-center mb-6">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="w-10 h-10 bg-white bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-colors shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="mb-6">
          <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">History</p>
          <h1 className="text-3xl font-semibold text-[#1A1A1A] tracking-tight">
            Past Records
          </h1>
        </div>

        {/* Period Filter Pills */}
        <div className="flex items-center gap-2 w-full pb-4 hide-scrollbar overflow-x-auto">
          {(['Today', 'This Week', 'This Month', 'Custom'] as Period[]).map((period) => (
            <button
              key={period}
              onClick={() => setActivePeriod(period)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                activePeriod === period 
                  ? 'bg-[#1A1A1A] text-[#F8F5F2] shadow-md' 
                  : 'bg-white bg-opacity-40 text-[#1A1A1A] hover:bg-opacity-60'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs */}
        <AnimatePresence>
          {activePeriod === 'Custom' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full flex gap-3 pb-4"
            >
              <div className="flex-1 glass-card p-2 flex items-center px-3">
                <span className="text-[10px] uppercase font-bold text-[#1A1A1A] opacity-50 mr-2">From</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-[#1A1A1A] w-full outline-none" 
                />
              </div>
              <div className="flex-1 glass-card p-2 flex items-center px-3">
                <span className="text-[10px] uppercase font-bold text-[#1A1A1A] opacity-50 mr-2">To</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm font-medium text-[#1A1A1A] w-full outline-none" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 z-10">
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {filteredData.length === 0 ? (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="text-center py-10 opacity-60 text-sm font-medium"
               >
                 {activePeriod === 'Custom' && (!startDate || !endDate) 
                   ? 'Select a date range to view records.' 
                   : `No records for ${activePeriod.toLowerCase()}`
                 }
               </motion.div>
            ) : (
              filteredData.map((item, idx) => (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className="glass-card p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[11px] font-bold text-[#1A1A1A] opacity-50 tracking-wide uppercase">{item.date}</span>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold text-[#8A9B80] bg-[#8A9B80] bg-opacity-20 px-2 py-1 rounded">+₹{item.revenue}</span>
                      {item.expense > 0 && (
                        <span className="text-xs font-semibold text-[#F85F54] bg-[#F85F54] bg-opacity-10 px-2 py-1 rounded">-₹{item.expense}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-[#1A1A1A] leading-relaxed">
                    "{item.text}"
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </AnimatePresence>
      </div>

      {/* Modern Bottom Nav */}
      <div className="absolute bottom-0 w-full h-[100px] bg-[#161211] rounded-t-[40px] flex items-center justify-between px-16 z-50">
        <button 
          className="text-[#F8F5F2] opacity-40 hover:opacity-100 mt-2 transition-opacity"
        >
          {/* Empty Placeholder for symmetry */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
            <line x1="6" y1="8" x2="6" y2="8"></line>
            <line x1="10" y1="8" x2="10" y2="8"></line>
            <line x1="14" y1="8" x2="14" y2="8"></line>
            <line x1="18" y1="8" x2="18" y2="8"></line>
            <line x1="6" y1="12" x2="6" y2="12"></line>
            <line x1="10" y1="12" x2="10" y2="12"></line>
            <line x1="14" y1="12" x2="14" y2="12"></line>
            <line x1="18" y1="12" x2="18" y2="12"></line>
            <line x1="8" y1="16" x2="16" y2="16"></line>
          </svg>
        </button>
        
        <button 
          onClick={() => onNavigate('voice')}
          className="text-[#F8F5F2] opacity-60 hover:opacity-100 mt-2 transition-opacity"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </button>

        <button 
          className="text-[#F8F5F2] opacity-100 mt-2"
        >
          {/* History Icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
      </div>
    </motion.div>
  )
}
