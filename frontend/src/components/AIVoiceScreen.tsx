import React from 'react'
import { motion } from 'framer-motion'
import { askAssistant, processTransactionText, type ProcessedTransaction } from '../services/api'

interface AIVoiceScreenProps {
  userId: string
  userName: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string
      }
      isFinal: boolean
    }
    length: number
  }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const windowRef = window as unknown as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }

  return windowRef.SpeechRecognition || windowRef.webkitSpeechRecognition || null
}

export const AIVoiceScreen: React.FC<AIVoiceScreenProps> = ({ userId, userName, onToggleSidebar, language }) => {
  const [noteText, setNoteText] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isListening, setIsListening] = React.useState(false)
  const [lastResult, setLastResult] = React.useState<ProcessedTransaction | null>(null)
  const [assistantReply, setAssistantReply] = React.useState('')
  const [clarificationQuestion, setClarificationQuestion] = React.useState('')
  const [error, setError] = React.useState('')
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)

  React.useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [])

  const processInput = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || isProcessing) {
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const processed = await processTransactionText({
        text,
        userId,
      })
      setLastResult(processed)
      setClarificationQuestion(processed.meta.clarification_question || '')

      if (processed.meta.needs_clarification && processed.meta.clarification_question) {
        setAssistantReply(processed.meta.clarification_question)
        return
      }

      if (userId) {
        const assistant = await askAssistant({
          userId,
          message: text,
        })
        setClarificationQuestion(assistant.clarificationQuestion || '')
        setAssistantReply(assistant.clarificationQuestion || assistant.reply)
      }
    } catch {
      setError(
        language === 'EN'
          ? 'Unable to process this note right now. Please try again.'
          : 'यह नोट अभी प्रोसेस नहीं हो सका। कृपया फिर से प्रयास करें।'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const startVoiceInput = () => {
    if (isListening) {
      return
    }

    const RecognitionCtor = getSpeechRecognitionCtor()
    if (!RecognitionCtor) {
      setError(
        language === 'EN'
          ? 'Voice input is not supported in this browser. Please type your transaction.'
          : 'इस ब्राउज़र में वॉइस इनपुट सपोर्ट नहीं है। कृपया लेन-देन टाइप करें।'
      )
      return
    }

    setError('')
    const recognition = new RecognitionCtor()
    recognition.lang = language === 'HI' ? 'hi-IN' : 'en-IN'
    recognition.continuous = false
    recognition.interimResults = true

    let transcript = ''

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event) => {
      let current = ''
      for (let index = 0; index < event.results.length; index += 1) {
        current += event.results[index][0].transcript
      }
      transcript = current.trim()
      setNoteText(transcript)
    }

    recognition.onerror = () => {
      setIsListening(false)
      setError(
        language === 'EN'
          ? 'Could not capture voice clearly. Please try again.'
          : 'आवाज़ साफ़ कैप्चर नहीं हो सकी। कृपया फिर से प्रयास करें।'
      )
    }

    recognition.onend = () => {
      setIsListening(false)
      if (transcript.trim()) {
        void processInput(transcript)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceInput = () => {
    recognitionRef.current?.stop()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <button 
          onClick={onToggleSidebar}
          className="w-12 h-12 bg-[#EFEBE4] rounded-full flex items-center justify-center hover:bg-[#E3DCD3] transition-colors shadow-sm"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="flex bg-[#EFEBE4] px-4 py-1.5 rounded-full items-center gap-2 shadow-sm border border-white/40">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A9B80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="text-[13px] font-bold text-[#1A1A1A] tracking-wide uppercase">
            {language === 'EN' ? 'AI Assistant' : 'AI सहायक'}
          </span>
        </div>
        <div className="w-12 h-12" />
      </div>

      {/* Hero Greeting Text (Moved up slightly) */}
      <div className="px-8 mt-4 mb-2 z-10 text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {language === 'EN' ? `Hi ${userName || 'Alex'},` : `नमस्ते ${userName || 'Alex'},`}
        </h2>
        <p className="text-[#1A1A1A]/60 text-lg">
          {language === 'EN' ? 'how can I help you today?' : 'मैं आज आपकी कैसे मदद कर सकता हूँ?'}
        </p>
      </div>

      <div className="px-6 z-20">
        <div className="glass-card p-4 rounded-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-2">
            {language === 'EN' ? 'Speak or Type Transaction' : 'लेन-देन बोलें या लिखें'}
          </p>
          <textarea
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder={
              language === 'EN'
                ? 'Example: Sold 8 tea at 20 and paid 100 transport'
                : 'उदाहरण: 8 चाय 20 में बेची और 100 परिवहन खर्च किया'
            }
            className="w-full min-h-[72px] bg-white/60 rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/40 border border-white/50 outline-none resize-none"
          />
          <button
            onClick={() => void processInput(noteText)}
            disabled={isProcessing || !noteText.trim()}
            className="mt-2 px-4 py-2 rounded-xl bg-[#161211] text-[#F8F5F2] text-sm font-semibold disabled:opacity-50"
          >
            {language === 'EN' ? 'Process Entry' : 'एंट्री प्रोसेस करें'}
          </button>
          {error && <p className="text-sm text-[#F85F54] font-semibold mt-2">{error}</p>}
          {clarificationQuestion && (
            <p className="text-sm text-[#A8702F] font-semibold mt-2">
              {clarificationQuestion}
            </p>
          )}
          {lastResult && (
            <div className="mt-3 text-sm text-[#1A1A1A]/85 space-y-1">
              <p>
                {language === 'EN' ? 'Sales:' : 'बिक्री:'} {lastResult.sales.length} | {language === 'EN' ? 'Expenses:' : 'खर्च:'} {lastResult.expenses.length}
              </p>
              <p>
                {language === 'EN' ? 'Confidence:' : 'विश्वास स्तर:'} {Math.round((lastResult.meta.confidence || 0) * 100)}%
              </p>
              {assistantReply && <p>{assistantReply}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Majestic Halo AI Interface */}
      <div className="flex-1 flex items-center justify-center relative perspective-[1000px]">
        
        {/* Core Dark Orb */}
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1], 
            filter: ['blur(8px)', 'blur(16px)', 'blur(8px)'],
            opacity: [0.9, 1, 0.9]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#0F0C0B] to-[#2B2B2B] shadow-[0_0_60px_15px_rgba(26,26,26,0.6)] z-10"
        />

        {/* Ring 1: Fast Axis */}
        <motion.div 
          animate={{ rotateZ: 360, rotateX: [60, 75, 60], rotateY: [0, 180, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute w-56 h-56 rounded-full border-[1.5px] border-[#1A1A1A] opacity-60 border-t-transparent shadow-[0_0_20px_rgba(26,26,26,0.3)]"
          style={{ transformStyle: 'preserve-3d' }}
        />

        {/* Ring 2: Slow Counter Axis */}
        <motion.div 
          animate={{ rotateZ: -360, rotateX: [70, 85, 70], rotateY: [360, 180, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute w-48 h-48 rounded-full border-[2.5px] border-[#A89873] opacity-30 border-l-transparent shadow-[0_0_20px_rgba(168,152,115,0.2)]"
          style={{ transformStyle: 'preserve-3d' }}
        />

        {/* Ring 3: Delicate Outer Halo */}
        <motion.div 
          animate={{ rotateZ: 360, scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-72 h-72 rounded-full border-[1px] border-dashed border-[#1A1A1A] opacity-10"
        />

        {/* Center Spark */}
        <div className="w-8 h-8 rounded-full bg-white blur-md z-20 absolute" />
      </div>

      {/* Floating Center Mic Button */}
      <div className="absolute left-1/2 bottom-[40px] -translate-x-1/2 z-30">
        <div className="bg-[#161211] rounded-[32px] p-2 shadow-2xl border border-white/5">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className="w-16 h-16 bg-[#F85F54] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(248,95,84,0.4)]"
          >
            {isProcessing || isListening
              ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              : <div className="w-5 h-5 rounded-sm bg-white border border-white"></div>}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
