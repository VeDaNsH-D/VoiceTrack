import React from 'react'
import { motion } from 'framer-motion'
import { blobToWav, getAudioPermission, startRecording, stopRecording } from '../utils/audio'
import { FiMic, FiSquare } from 'react-icons/fi'
import {
  sendConversationAudio,
  saveStructuredTransaction,
  type ConversationResult,
  type ConversationStructuredData,
} from '../services/api'

interface AIVoiceScreenProps {
  userId: string
  userName: string
  onToggleSidebar: () => void
  language: 'EN' | 'HI'
}

function buildStructuredSummary(structuredData: ConversationStructuredData | null, language: 'EN' | 'HI'): string {
  if (!structuredData) {
    return language === 'EN' ? 'No structured transaction found yet.' : 'अभी तक कोई संरचित लेन-देन नहीं मिला।'
  }

  const salesSummary = (structuredData.sales || [])
    .map((sale) => `${sale.qty} ${sale.item} x ${sale.price}`)
    .join(', ')
  const expenseSummary = (structuredData.expenses || [])
    .map((expense) => `${expense.item}: ${expense.amount}`)
    .join(', ')

  if (!salesSummary && !expenseSummary) {
    return language === 'EN' ? 'Waiting for clearer transaction details.' : 'और स्पष्ट लेन-देन विवरण का इंतजार है।'
  }

  if (language === 'HI') {
    return [salesSummary ? `बिक्री: ${salesSummary}` : '', expenseSummary ? `खर्च: ${expenseSummary}` : '']
      .filter(Boolean)
      .join(' | ')
  }

  return [salesSummary ? `Sales: ${salesSummary}` : '', expenseSummary ? `Expenses: ${expenseSummary}` : '']
    .filter(Boolean)
    .join(' | ')
}

export const AIVoiceScreen: React.FC<AIVoiceScreenProps> = ({ userId, userName, onToggleSidebar, language }) => {
  const [isListening, setIsListening] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [error, setError] = React.useState('')
  const [transcript, setTranscript] = React.useState('')
  const [assistantReply, setAssistantReply] = React.useState('')
  const [structuredSummary, setStructuredSummary] = React.useState('')
  const [conversationResult, setConversationResult] = React.useState<ConversationResult | null>(null)
  const [shouldStartNew, setShouldStartNew] = React.useState(false)

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const audioReplyRef = React.useRef<HTMLAudioElement | null>(null)
  const savedConversationKeysRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioReplyRef.current?.pause()
    }
  }, [])

  const playAssistantReply = React.useCallback((audioUrl: string) => {
    if (!audioUrl) {
      return
    }

    audioReplyRef.current?.pause()
    const audio = new Audio(audioUrl)
    audioReplyRef.current = audio
    void audio.play().catch(() => {
      // Autoplay can fail in some browsers; the visible audio card still gives access.
    })
  }, [])

  const processAudio = React.useCallback(async (audioBlob: Blob) => {
    if (isProcessing) {
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const wavBlob = await blobToWav(audioBlob)
      const result = await sendConversationAudio({
        audioBlob: wavBlob,
        userId: userId || 'guest-user',
        startNew: shouldStartNew,
      })

      setConversationResult(result)
      setTranscript(result.transcript)
      setAssistantReply(result.assistant.reply)
      setStructuredSummary(buildStructuredSummary(result.structured_data, language))
      setShouldStartNew(false)

      const saveKey = JSON.stringify({
        userId: userId || 'guest-user',
        transcript: result.transcript,
        structuringInput: result.structuring_input,
        structuredData: result.structured_data,
      })

      if (
        result.conversation_state.finalized &&
        result.structured_data &&
        !savedConversationKeysRef.current.has(saveKey)
      ) {
        try {
          await saveStructuredTransaction({
            userId: userId || 'guest-user',
            rawText: result.transcript,
            normalizedText: result.structuring_input,
            sales: result.structured_data.sales || [],
            expenses: result.structured_data.expenses || [],
            meta: result.structured_data.meta,
          })
          savedConversationKeysRef.current.add(saveKey)
        } catch (err) {
          console.error('Failed to save finalized transaction:', err)
        }
      }

      if (result.assistant.audio_needed && result.assistant.audio_url) {
        playAssistantReply(result.assistant.audio_url)
      }
    } catch {
      setError(
        language === 'EN'
          ? 'Unable to process voice note right now. Please try again.'
          : 'वॉइस नोट अभी प्रोसेस नहीं हो सका। कृपया फिर से प्रयास करें।'
      )
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, language, playAssistantReply, shouldStartNew, userId])

  const startVoiceInput = async () => {
    if (isListening || isProcessing) {
      return
    }

    try {
      setError('')
      if (!streamRef.current) {
        streamRef.current = await getAudioPermission()
      }

      const recorder = startRecording(streamRef.current)
      mediaRecorderRef.current = recorder
      recorder.onstart = () => setIsListening(true)
      recorder.start()
    } catch {
      setError(
        language === 'EN'
          ? 'Please allow microphone access to continue.'
          : 'कृपया माइक्रोफोन एक्सेस की अनुमति दें।'
      )
    }
  }

  const stopVoiceInput = async () => {
    if (!mediaRecorderRef.current) {
      return
    }

    const recorder = mediaRecorderRef.current
    setIsListening(false)
    try {
      const blob = await stopRecording(recorder)
      mediaRecorderRef.current = null
      await processAudio(blob)
    } catch {
      setError(
        language === 'EN'
          ? 'Could not capture audio clearly. Please try again.'
          : 'ऑडियो साफ़ कैप्चर नहीं हो सका। कृपया फिर से प्रयास करें।'
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen bg-app-gradient flex flex-col relative overflow-hidden"
    >
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
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="text-[13px] font-bold text-[#1A1A1A] tracking-wide uppercase">
            {language === 'EN' ? 'Voice Conversation' : 'वॉइस बातचीत'}
          </span>
        </div>
        <div className="w-12 h-12" />
      </div>

      <div className="px-8 mt-4 mb-2 z-10 text-center">
        <h2 className="text-2xl font-semibold mb-2">
          {language === 'EN' ? `Hi ${userName || 'there'},` : `नमस्ते ${userName || 'दोस्त'},`}
        </h2>
        <p className="text-[#1A1A1A]/60 text-lg">
          {language === 'EN' ? 'record a voice transaction and I will guide the rest.' : 'वॉइस ट्रांजैक्शन रिकॉर्ड करें, बाकी मैं संभाल लूँगा।'}
        </p>
      </div>

      <div className="px-6 z-20">
        <div className="glass-card p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]/50">
              {language === 'EN' ? 'Conversation Status' : 'बातचीत की स्थिति'}
            </p>
            <label className="flex items-center gap-2 text-xs text-[#1A1A1A]/60">
              <input
                type="checkbox"
                checked={shouldStartNew}
                onChange={(event) => setShouldStartNew(event.target.checked)}
              />
              {language === 'EN' ? 'Start new transaction' : 'नई ट्रांजैक्शन शुरू करें'}
            </label>
          </div>

          <div className="rounded-2xl bg-white/60 border border-white/50 px-4 py-3 text-sm text-[#1A1A1A]">
            <p className="font-semibold mb-1">{language === 'EN' ? 'You said' : 'आपने कहा'}</p>
            <p className="text-[#1A1A1A]/70">{transcript || (language === 'EN' ? 'No transcript yet.' : 'अभी कोई ट्रांसक्रिप्ट नहीं।')}</p>
          </div>

          <div className="rounded-2xl bg-[#161211] text-[#F8F5F2] px-4 py-3 text-sm">
            <p className="font-semibold mb-1">{language === 'EN' ? 'Assistant reply' : 'सहायक का जवाब'}</p>
            <p>{assistantReply || (language === 'EN' ? 'Your spoken reply will appear here.' : 'आपके लिए बोला गया जवाब यहाँ दिखेगा।')}</p>
          </div>

          <div className="rounded-2xl bg-white/50 border border-white/50 px-4 py-3 text-sm text-[#1A1A1A]/80">
            <p className="font-semibold mb-1">{language === 'EN' ? 'Structured result' : 'स्ट्रक्चर्ड रिज़ल्ट'}</p>
            <p>{structuredSummary || (language === 'EN' ? 'Waiting for parsed transaction data.' : 'पार्स किए गए ट्रांजैक्शन डेटा का इंतज़ार है।')}</p>
          </div>

          {conversationResult && (
            <div className="text-xs text-[#1A1A1A]/65 space-y-1">
              <p>
                {language === 'EN' ? 'Clarification pending:' : 'स्पष्टीकरण लंबित:'} {conversationResult.conversation_state.clarification_pending ? 'Yes' : 'No'}
              </p>
              <p>
                {language === 'EN' ? 'Finalized:' : 'फाइनलाइज़्ड:'} {conversationResult.conversation_state.finalized ? 'Yes' : 'No'}
              </p>
              <p>
                {language === 'EN' ? 'Started fresh:' : 'नई शुरुआत:'} {conversationResult.conversation_state.started_new ? 'Yes' : 'No'}
              </p>
              {conversationResult.assistant.audio_needed && conversationResult.assistant.audio_url ? (
                <audio src={conversationResult.assistant.audio_url} controls className="w-full mt-2" />
              ) : (
                <p className="mt-2">
                  {language === 'EN' ? 'Voice reply unavailable right now.' : 'वॉइस रिप्लाई अभी उपलब्ध नहीं है।'}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-[#F85F54] font-semibold">{error}</p>}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative perspective-[1000px]">
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            filter: ['blur(8px)', 'blur(16px)', 'blur(8px)'],
            opacity: [0.9, 1, 0.9],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#0F0C0B] to-[#2B2B2B] shadow-[0_0_60px_15px_rgba(26,26,26,0.6)] z-10"
        />
        <motion.div
          animate={{ rotateZ: 360, rotateX: [60, 75, 60], rotateY: [0, 180, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute w-56 h-56 rounded-full border-[1.5px] border-[#1A1A1A] opacity-60 border-t-transparent shadow-[0_0_20px_rgba(26,26,26,0.3)]"
          style={{ transformStyle: 'preserve-3d' }}
        />
        <motion.div
          animate={{ rotateZ: -360, rotateX: [70, 85, 70], rotateY: [360, 180, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute w-48 h-48 rounded-full border-[2.5px] border-[#A89873] opacity-30 border-l-transparent shadow-[0_0_20px_rgba(168,152,115,0.2)]"
          style={{ transformStyle: 'preserve-3d' }}
        />
        <motion.div
          animate={{ rotateZ: 360, scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-72 h-72 rounded-full border-[1px] border-dashed border-[#1A1A1A] opacity-10"
        />
        <div className="w-8 h-8 rounded-full bg-white blur-md z-20 absolute" />
      </div>

      <div className="absolute left-1/2 bottom-[40px] -translate-x-1/2 z-30">
        <div className="bg-[#161211] rounded-[32px] p-2 shadow-2xl border border-white/5">
          <motion.button
            whileTap={!isProcessing ? { scale: 0.9 } : {}}
            whileHover={!isProcessing ? { scale: 1.05 } : {}}
            animate={isListening ? { scale: [1, 1.1, 1], boxShadow: ["0 0 20px rgba(248,95,84,0.4)", "0 0 40px rgba(248,95,84,0.8)", "0 0 20px rgba(248,95,84,0.4)"] } : {}}
            transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
            onClick={isProcessing ? undefined : (isListening ? () => void stopVoiceInput() : () => void startVoiceInput())}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isProcessing
                ? 'bg-[#1A1A1A] cursor-not-allowed border border-white/20'
                : 'bg-[#F85F54] cursor-pointer shadow-[0_0_20px_rgba(248,95,84,0.4)]'
            }`}
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isListening ? (
              <FiSquare className="w-6 h-6 text-white" fill="white" />
            ) : (
              <FiMic className="w-8 h-8 text-white" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
