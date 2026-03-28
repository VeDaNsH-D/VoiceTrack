import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ViewState } from '../App'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (view: ViewState) => void
  currentView: ViewState
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate, currentView }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-[#161211] z-[101] shadow-2xl flex flex-col rounded-r-[40px] overflow-hidden border-r border-[#F8F5F2]/10"
          >
            <div className="p-8 pt-16 flex flex-col h-full relative">
              
              <button 
                onClick={onClose}
                className="absolute top-8 right-8 text-[#F8F5F2]/60 hover:text-[#F8F5F2] transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-[#F8F5F2]">
                    <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
                    <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
                    <path d="M50 45 L50 60 C41 60 41 50 50 45 Z" fill="#161211" />
                  </svg>
                  <span className="text-xl font-bold text-[#F8F5F2] tracking-wide">VoiceTrace</span>
                </div>
                <p className="text-sm text-[#F8F5F2]/50 font-medium ml-11">Business Intelligence</p>
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <MenuButton 
                  label="Voice Ledger" 
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  }
                  isActive={currentView === 'voice'} 
                  onClick={() => { onNavigate('voice'); onClose(); }} 
                />
                <MenuButton 
                  label="Context Chatbot" 
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  }
                  isActive={currentView === 'chat'} 
                  onClick={() => { onNavigate('chat'); onClose(); }} 
                />
                <MenuButton 
                  label="Performance Dashboard" 
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  }
                  isActive={currentView === 'dashboard'} 
                  onClick={() => { onNavigate('dashboard'); onClose(); }} 
                />
                <MenuButton 
                  label="Ledger History" 
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  }
                  isActive={currentView === 'history'} 
                  onClick={() => { onNavigate('history'); onClose(); }} 
                />
              </div>

              <div className="mt-auto pt-6 border-t border-[#F8F5F2]/10">
                <button 
                  onClick={() => { onNavigate('landing'); onClose(); }}
                  className="w-full flex items-center gap-4 py-3 px-4 text-[#F85F54] hover:bg-[#F85F54]/10 rounded-2xl transition-colors font-semibold"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const MenuButton = ({ label, icon, isActive, onClick }: { label: string, icon: React.ReactNode, isActive: boolean, onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 py-4 px-5 rounded-2xl font-bold transition-all ${
        isActive 
          ? 'bg-[#F8F5F2] text-[#161211] shadow-lg scale-100' 
          : 'bg-transparent text-[#F8F5F2]/60 hover:bg-white/5 hover:text-[#F8F5F2] scale-95 origin-left'
      }`}
    >
      <div className={`${isActive ? 'opacity-100 text-[#8A9B80]' : 'opacity-80'}`}>
        {icon}
      </div>
      <span className="text-[15px] tracking-wide">{label}</span>
    </button>
  )
}
