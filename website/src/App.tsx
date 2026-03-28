import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from './components/Navbar.tsx'
import { Hero } from './components/Hero.tsx'
import { Features } from './components/Features.tsx'
import { HowItWorks } from './components/HowItWorks.tsx'
import { Pricing } from './components/Pricing.tsx'
import { Testimonials } from './components/Testimonials.tsx'
import { Footer } from './components/Footer.tsx'
import { AuthPage } from './components/AuthPage.tsx'

// Dashboard components imported from frontend
import { AIVoiceScreen } from './components/AIVoiceScreen.tsx'
import { DashboardMain } from './components/DashboardMain.tsx'
import { AIInsightsPage } from './components/AIInsightsPage.tsx'
import { History } from './components/History.tsx'
import { Chatbot } from './components/Chatbot.tsx'
import { Sidebar } from './components/Sidebar.tsx'
import { setAuthToken } from './services/api'
import './index.css'

export type ViewState = 'landing' | 'auth' | 'voice' | 'dashboard' | 'insights' | 'history' | 'chat'

export interface AuthSession {
  userId: string
  name: string
  token: string
  identifier: string
  businessCode?: string
  businessId?: string
}

function getSavedSession(): AuthSession | null {
  const saved = localStorage.getItem('voicetrack.session')
  if (!saved) return null
  try {
    return JSON.parse(saved) as AuthSession
  } catch {
    localStorage.removeItem('voicetrack.session')
    return null
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const restored = getSavedSession()
    if (restored?.token) setAuthToken(restored.token)
    return restored
  })
  
  const [currentView, setCurrentView] = useState<ViewState>(() => (getSavedSession() ? 'voice' : 'landing'))

  const [language, setLanguage] = useState<'EN' | 'HI'>('EN')
  const [userName, setUserName] = useState<string>(() => getSavedSession()?.name || '')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavigate = (view: ViewState) => {
    if (view === 'landing') {
      setSession(null)
      setUserName('')
      setAuthToken(null)
      localStorage.removeItem('voicetrack.session')
    }
    setCurrentView(view)
  }

  const handleLogin = (authSession: AuthSession) => {
    setSession(authSession)
    setUserName(authSession.name)
    setAuthToken(authSession.token)
    localStorage.setItem('voicetrack.session', JSON.stringify(authSession))
    setCurrentView('voice')
  }

  // Marketing Landing Pages
  if (currentView === 'landing' || currentView === 'auth') {
    if (currentView === 'auth') {
      return <AuthPage onBack={() => handleNavigate('landing')} onLogin={handleLogin} />
    }
    return (
      <div className="min-h-screen bg-[#FDFAF7]">
        <Navbar scrolled={scrolled} onGetStarted={() => handleNavigate('auth')} />
        <Hero onGetStarted={() => handleNavigate('auth')} />
        <Features />
        <HowItWorks />
        <Pricing onGetStarted={() => handleNavigate('auth')} />
        <Testimonials />
        <Footer />
      </div>
    )
  }

  // Dashboard Application
  return (
    <div className="h-screen bg-modern-fluid flex overflow-hidden font-sans p-4 gap-4">
      {/* Left Minimal Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        language={language}
        toggleLanguage={() => setLanguage(l => l === 'EN' ? 'HI' : 'EN')}
      />

      {/* Main Glass Panel */}
      <main className="flex-1 glass-panel flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentView === 'voice' && (
            <motion.div key="voice" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
              <AIVoiceScreen language={language} userId={session?.userId || '1'} userName={userName} onToggleSidebar={() => {}} />
            </motion.div>
          )}

          {currentView === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
              <DashboardMain language={language} onToggleSidebar={() => {}} userName={userName} userId={session?.userId || ''} businessId={session?.businessId || ''} />
            </motion.div>
          )}

          {currentView === 'insights' && (
            <motion.div key="insights" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
              <AIInsightsPage language={language} userId={session?.userId || ''} businessId={session?.businessId || ''} userName={userName} onToggleSidebar={() => {}} />
            </motion.div>
          )}

          {currentView === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
              <History userId={session?.userId || '1'} language={language} onToggleSidebar={() => {}} />
            </motion.div>
          )}

          {currentView === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full">
              <Chatbot userId={session?.userId || '1'} userName={userName} language={language} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
