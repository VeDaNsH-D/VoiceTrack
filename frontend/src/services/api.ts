import axios from 'axios'

const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:5001').replace(/\/$/, '')

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface AuthUser {
  _id: string
  name: string
  phone?: string
  email?: string
  businessId?: {
    _id: string
    name: string
    type: string
  } | null
}

export interface AuthResult {
  success: boolean
  user: AuthUser
  token: string
  message?: string
}

export interface ProcessedTransaction {
  sales: Array<{ item: string; qty: number; price: number }>
  expenses: Array<{ item: string; amount: number }>
  meta: {
    confidence: number
    source: string
    needs_clarification: boolean
    clarification_question: string | null
  }
  debug?: {
    llm_attempted: boolean
    llm_succeeded: boolean
    llm_used_live_response: boolean
    llm_error: string | null
  }
}

export interface HistoryEntry {
  id: string
  createdAt: string
  rawText: string
  normalizedText: string
  sales: Array<{ item: string; qty: number; price: number }>
  expenses: Array<{ item: string; amount: number }>
  totals: {
    salesAmount: number
    expenseAmount: number
    netAmount: number
  }
  meta: {
    confidence?: number
    source?: string
    needsClarification?: boolean
    clarificationQuestion?: string | null
  } | null
}

export interface HistoryResult {
  count: number
  transactions: HistoryEntry[]
}

export interface InsightsResult {
  totals: {
    sales: number
    expenses: number
  }
  transactionCount: number
}

export interface AssistantResult {
  needsClarification?: boolean
  clarificationQuestion?: string | null
  intent?: {
    intent?: string
    timeRange?: string
    product?: string | null
  }
  queryResult?: {
    type: string
    value?: number
    product?: string | null
    quantity?: number
  }
  reply: string
  audioNeeded: boolean
}

export interface ChatResult {
  reply: string
  audioNeeded: boolean
}

export function setAuthToken(token: string | null): void {
  if (!token) {
    delete apiClient.defaults.headers.common.Authorization
    return
  }

  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
}

export async function signupUser(payload: {
  name: string
  phone?: string
  email?: string
  password: string
}): Promise<AuthResult> {
  const response = await apiClient.post<AuthResult>('/api/auth/signup', payload)
  return response.data
}

export async function loginUser(payload: {
  identifier: string
  password: string
}): Promise<AuthResult> {
  const response = await apiClient.post<AuthResult>('/api/auth/login', payload)
  return response.data
}

export async function getAuthStatus(): Promise<{ authenticated: boolean; message: string }> {
  const response = await apiClient.get<{ authenticated: boolean; message: string }>('/api/auth/status')
  return response.data
}

export async function processTransactionText(payload: {
  text: string
  userId?: string
}): Promise<ProcessedTransaction> {
  const response = await apiClient.post<ProcessedTransaction>('/api/transactions/process-text', payload)
  return response.data
}

export async function getTransactionHistory(params: {
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
} = {}): Promise<HistoryResult> {
  const response = await apiClient.get<HistoryResult>('/api/transactions/history', {
    params,
  })
  return response.data
}

export async function getInsights(userId?: string): Promise<InsightsResult> {
  const response = await apiClient.get<InsightsResult>('/api/insights', {
    params: userId ? { userId } : undefined,
  })
  return response.data
}

export async function askAssistant(payload: {
  userId: string
  message: string
}): Promise<AssistantResult> {
  const response = await apiClient.post<AssistantResult>('/api/assistant/query', payload)
  return response.data
}

export async function chatWithAssistant(payload: {
  userId: string
  message: string
  source?: string
  sttProvider?: string
}): Promise<ChatResult> {
  const response = await apiClient.post<ChatResult>('/chat', payload)
  return response.data
}

export async function getProtectedProfile(): Promise<{ success: boolean; user: unknown }> {
  const response = await apiClient.get<{ success: boolean; user: unknown }>('/api/protected')
  return response.data
}

export async function sendWebhook(payload: Record<string, unknown>): Promise<{ received: boolean; payload: unknown }> {
  const response = await apiClient.post<{ received: boolean; payload: unknown }>('/api/webhooks', payload)
  return response.data
}

export default apiClient
