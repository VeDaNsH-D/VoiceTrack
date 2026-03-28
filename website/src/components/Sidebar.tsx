import React from 'react'
import { ViewState } from '../App'
import { FiLogOut, FiMic, FiMessageSquare, FiPieChart, FiCpu, FiClock } from 'react-icons/fi'

interface SidebarProps {
  onNavigate: (view: ViewState) => void
  currentView: ViewState
  language: 'EN' | 'HI'
  toggleLanguage: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate, currentView, language, toggleLanguage }) => {
  return (
    <aside className="h-full flex flex-col items-center py-6 w-20 flex-shrink-0 z-50">
      {/* Brand logo minimal */}
      <div className="w-10 h-10 text-[#1A1A1A] mb-8">
        <svg viewBox="0 0 100 100" fill="none">
          <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
          <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-4 flex-1 items-center">
        <NavItem
          isActive={currentView === 'voice'}
          onClick={() => onNavigate('voice')}
          icon={<FiMic size={20} />}
          title={language === 'EN' ? 'Voice Ledger' : 'वॉयस लेजर'}
        />
        <NavItem
          isActive={currentView === 'chat'}
          onClick={() => onNavigate('chat')}
          icon={<FiMessageSquare size={20} />}
          title={language === 'EN' ? 'Context Chatbot' : 'कॉन्टेक्स्ट चैटबॉट'}
        />
        <NavItem
          isActive={currentView === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          icon={<FiPieChart size={20} />}
          title={language === 'EN' ? 'Dashboard' : 'डैशबोर्ड'}
        />
        <NavItem
          isActive={currentView === 'insights'}
          onClick={() => onNavigate('insights')}
          icon={<FiCpu size={20} />}
          title={language === 'EN' ? 'AI Insights' : 'AI इनसाइट्स'}
        />
        <NavItem
          isActive={currentView === 'history'}
          onClick={() => onNavigate('history')}
          icon={<FiClock size={20} />}
          title={language === 'EN' ? 'Ledger History' : 'लेजर इतिहास'}
        />
      </nav>

      {/* Footer minimal */}
      <div className="flex flex-col gap-4 items-center mt-auto">
        <button
          onClick={toggleLanguage}
          className="btn-circular"
          title={language === 'EN' ? 'Switch to Hindi' : 'Switch to English'}
        >
          <span className="text-[11px] font-extrabold">{language}</span>
        </button>
        <button
          onClick={() => onNavigate('landing')}
          className="btn-circular text-[#F85F54] hover:bg-[#F85F54]/10"
          title={language === 'EN' ? 'Sign Out' : 'साइन आउट'}
        >
          <FiLogOut size={20} />
        </button>
      </div>
    </aside>
  )
}

const NavItem = ({ icon, isActive, onClick, title }: { icon: React.ReactNode; isActive: boolean; onClick: () => void; title: string }) => (
  <button
    onClick={onClick}
    title={title}
    className={`btn-circular ${isActive ? 'active' : ''}`}
  >
    <span className={isActive ? 'text-[#8A9B80]' : 'opacity-50 hover:opacity-100'}>
      {icon}
    </span>
  </button>
)
