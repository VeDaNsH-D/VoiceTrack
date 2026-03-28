import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi'

interface AuthPageProps {
  onBack: () => void
  onLogin: (session: any) => void
}

type Tab = 'login' | 'signup'

export function AuthPage({ onBack, onLogin }: AuthPageProps) {
  const [tab, setTab] = useState<Tab>('signup')
  const [showPwd, setShowPwd] = useState(false)

  // Signup state
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [occ, setOcc] = useState('')
  const [pwd, setPwd] = useState('')
  const [bizMode, setBizMode] = useState<'create' | 'join'>('create')
  const [bizCode, setBizCode] = useState('')
  const [bizPwd, setBizPwd] = useState('')

  // Login state
  const [loginId, setLoginId] = useState('')
  const [loginPwd, setLoginPwd] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const signupDisabled = phone.length < 10 || !name.trim() || !occ.trim() || pwd.length < 6 || bizPwd.length < 6 || (bizMode === 'join' && !bizCode.trim())
  const loginDisabled = !loginId.trim() || loginPwd.length < 6

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (signupDisabled) return
    setIsLoading(true)
    try {
      const { data } = await axios.post('/api/auth/signup', {
        name: name.trim(),
        phone: `+91${phone}`,
        password: pwd,
        businessMode: bizMode,
        businessType: occ.trim().toLowerCase(),
        ...(bizMode === 'join' ? { businessCode: bizCode.trim().toUpperCase() } : { businessName: `${name.trim()}'s Business` }),
        businessPassword: bizPwd,
      })
      onLogin(data)
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.message || 'Signup failed.') : 'Something went wrong.')
    } finally { setIsLoading(false) }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (loginDisabled) return
    setIsLoading(true)
    const identifier = /^\d{10}$/.test(loginId.trim()) ? `+91${loginId.trim()}` : loginId.trim()
    try {
      const { data } = await axios.post('/api/auth/login', { identifier, password: loginPwd })
      onLogin(data)
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.message || 'Login failed.') : 'Something went wrong.')
    } finally { setIsLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FDFAF7] flex flex-col md:flex-row">
      {/* Left panel */}
      <div className="hidden md:flex md:w-[45%] bg-[#141110] flex-col justify-between p-12 relative overflow-hidden">
        {/* Back circles */}
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/[0.03]" />
        <div className="absolute -left-16 bottom-20 w-56 h-56 rounded-full bg-[#8A9B80]/08" />

        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors font-semibold text-[14px]">
            <FiArrowLeft size={15} /> Back to site
          </button>
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 text-white">
              <svg viewBox="0 0 100 100" fill="none">
                <path d="M20 20 H50 V60 C50 71 41 80 30 80 C24.47 80 20 75.53 20 70 V20 Z" fill="currentColor" />
                <path d="M50 45 C66.56 45 80 58.44 80 75 C80 91.56 66.56 100 50 100 V45 Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-[20px] font-extrabold text-white tracking-tight">VoiceTrace</span>
          </div>

          <div>
            <h2 className="text-[36px] font-extrabold text-white tracking-tight leading-tight mb-4">
              Your voice is your ledger.
            </h2>
            <p className="text-[15px] text-white/45 font-medium leading-relaxed">
              Sign up and get your AI-powered business intelligence running in minutes — no setup required.
            </p>
          </div>

          {/* Mini testimonial */}
          <div className="bg-white/[0.05] rounded-2xl p-4 border border-white/[0.07]">
            <p className="text-[13.5px] text-white/60 italic font-medium mb-3">
              "VoiceTrace ne mera hisaab sambhaal liya. Pehle ghante lagate the, ab 2 minute mein ho jaata hai."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#FFCBA4] flex items-center justify-center font-bold text-[#1A1A1A] text-[12px]">R</div>
              <div>
                <p className="text-[12px] font-bold text-white/65">Ramesh Yadav</p>
                <p className="text-[11px] text-white/30 font-medium">Vegetable Vendor, Pune</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[12px] text-white/20 font-medium">© {new Date().getFullYear()} VoiceTrace</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-start md:justify-center px-6 md:px-14 lg:px-24 pt-12 md:pt-0 pb-16">
        {/* Mobile back */}
        <button onClick={onBack} className="md:hidden flex items-center gap-2 text-[#1A1A1A]/50 hover:text-[#1A1A1A] font-semibold text-[14px] mb-8">
          <FiArrowLeft size={15} /> Back
        </button>

        <div className="max-w-md w-full mx-auto">
          {/* Tab switcher */}
          <div className="flex bg-[#1A1A1A]/06 rounded-2xl p-1 mb-8">
            {(['signup', 'login'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess('') }}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all capitalize ${tab === t ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#1A1A1A]/45 hover:text-[#1A1A1A]/70'}`}
              >
                {t === 'signup' ? 'Create Account' : 'Log In'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Sign Up ── */}
            {tab === 'signup' && (
              <motion.form
                key="signup"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSignup}
                className="space-y-4"
              >
                <div className="input-shell flex items-center gap-3">
                  <span className="text-[#1A1A1A] font-bold flex-shrink-0">+91</span>
                  <div className="w-px h-5 bg-[#1A1A1A]/10 flex-shrink-0" />
                  <input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="input-shell">
                    <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} className="input-field" />
                  </div>
                  <div className="input-shell">
                    <input placeholder="Occupation" value={occ} onChange={e => setOcc(e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="input-shell flex items-center gap-2">
                  <input type={showPwd ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={pwd} onChange={e => setPwd(e.target.value)} className="input-field" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-[#1A1A1A]/35 hover:text-[#1A1A1A]/60 flex-shrink-0">
                    {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-2 block">Business</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(['create', 'join'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setBizMode(m)} className={`py-2.5 rounded-2xl text-[13px] font-bold border transition-all ${bizMode === m ? 'bg-[#1A1A1A] text-white border-transparent' : 'bg-transparent text-[#1A1A1A]/50 border-[#1A1A1A]/12 hover:bg-[#1A1A1A]/05'}`}>
                        {m === 'create' ? 'Create New' : 'Join Existing'}
                      </button>
                    ))}
                  </div>
                  {bizMode === 'join' && (
                    <div className="input-shell mb-3">
                      <input placeholder="Business ID (e.g. BIZ-AB12CD)" value={bizCode} onChange={e => setBizCode(e.target.value.toUpperCase())} className="input-field" />
                    </div>
                  )}
                  <div className="input-shell">
                    <input type="password" placeholder="Business password" value={bizPwd} onChange={e => setBizPwd(e.target.value)} className="input-field" />
                  </div>
                </div>

                {error && <div className="bg-[#F85F54]/10 border border-[#F85F54]/20 rounded-2xl px-4 py-3 text-[13px] font-semibold text-[#b83228]">{error}</div>}
                {success && <div className="bg-[#EBF2E6] border border-[#8A9B80]/30 rounded-2xl px-4 py-3 text-[13px] font-semibold text-[#4a6b43]">{success}</div>}

                <button type="submit" disabled={signupDisabled || isLoading} className="btn-primary w-full justify-center text-[15px] !py-4 disabled:opacity-45">
                  {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : <>Create Account <FiArrowRight size={15} /></>}
                </button>
              </motion.form>
            )}

            {/* ── Log In ── */}
            {tab === 'login' && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="input-shell">
                  <input placeholder="Phone number or email" value={loginId} onChange={e => setLoginId(e.target.value)} autoFocus className="input-field" />
                </div>
                <div className="input-shell flex items-center gap-2">
                  <input type={showPwd ? 'text' : 'password'} placeholder="Password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} className="input-field" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-[#1A1A1A]/35 hover:text-[#1A1A1A]/60 flex-shrink-0">
                    {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>

                {error && <div className="bg-[#F85F54]/10 border border-[#F85F54]/20 rounded-2xl px-4 py-3 text-[13px] font-semibold text-[#b83228]">{error}</div>}
                {success && <div className="bg-[#EBF2E6] border border-[#8A9B80]/30 rounded-2xl px-4 py-3 text-[13px] font-semibold text-[#4a6b43]">{success}</div>}

                <button type="submit" disabled={loginDisabled || isLoading} className="btn-primary w-full justify-center text-[15px] !py-4 disabled:opacity-45">
                  {isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</> : <>Log In <FiArrowRight size={15} /></>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
