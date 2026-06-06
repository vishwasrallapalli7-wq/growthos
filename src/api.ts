const API = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export interface ApiClient {
  id: number
  name: string
  industry: string
  phase: number
  status: string
  revenue: number
  tasks: number
  progress: number
  initials: string
  email?: string
  language?: string
}

export interface ApiClientDetail extends Omit<ApiClient, 'tasks'> {
  orders: ApiOrder[]
  content: ApiContent[]
  tasks: ApiTask[]
  chat: ApiChatMessage[]
  campaigns: ApiCampaign[]
}

export interface ApiOrder {
  id: number
  client_id: number
  client_name: string
  client_initials: string
  title: string
  amount: number
  status: string
  type: string
  created_at: string
}

export interface ApiContent {
  id: number
  client_id: number
  client_name: string
  client_initials: string
  type: string
  title: string
  description: string
  image_url: string
  video_url?: string
  status: string
  language: string
  caption?: string
  voice_url?: string
  instagram_post_id?: string
}

export interface ApiActivity {
  id: number
  text: string
  icon: string
  color: string
  time: string
  client_name?: string
}

export interface ApiStats {
  totalClients: number
  monthlyRevenue: number
  activeTasks: number
  avgPhase: number
  totalOrders: number
  orderValue: number
  pendingContent: number
  activeCampaigns: number
}

export interface ApiCampaign {
  id: number
  client_name: string
  content_title: string
  platform: string
  status: string
  budget: number
  impressions: number
  reach: number
}

export interface ApiTask {
  id: number
  client_id: number
  client_name: string
  client_initials: string
  title: string
  description: string
  status: string
  priority: string
  category: string
}

export interface ApiOnboardingItem {
  id: number
  item_key: string
  label: string
  icon: string
  completed: number
}

export interface ApiReports {
  revenueByClient: Array<{ name: string; revenue: number; phase: number; progress: number }>
  contentStats: Array<{ status: string; count: number }>
  orderStats: Array<{ status: string; total: number; count: number }>
  campaignStats: { totalBudget: number; totalImpressions: number; totalReach: number; count: number }
  monthlyOrders: Array<{ month: string; total: number }>
}

export interface ApiAudit {
  url: string
  score: number
  issues: Array<{ id: number; title: string; impact: string; fix: string }>
  summary: string
  provider: string
}

export interface ApiChatMessage {
  id: number
  client_id: number
  sender: string
  message: string
  created_at: string
}

export const api = {
  health: () => request<{ ok: boolean; integrations: Record<string, boolean> }>('/health'),

  signup: (data: {
    email: string
    password: string
    name?: string
    businessName?: string
    phase?: number
    websiteUrl?: string
    language?: string
  }) => request<{ userId: number; emailSent: { success: boolean; provider: string } }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  connectIntegration: (provider: string, userId = 1) =>
    request('/integrations/connect', {
      method: 'POST',
      body: JSON.stringify({ userId, provider, accessToken: 'oauth_connected', accountName: provider }),
    }),

  getInstagramOAuthUrl: () => `${API}/oauth/instagram`,

  getClients: () => request<ApiClient[]>('/clients'),
  getClient: (id: number) => request<ApiClientDetail>(`/clients/${id}`),
  addClient: (data: { name: string; industry?: string; phase?: number; email?: string }) =>
    request('/clients', { method: 'POST', body: JSON.stringify(data) }),

  getOrders: () => request<ApiOrder[]>('/orders'),
  getActivities: () => request<ApiActivity[]>('/activities'),
  getStats: () => request<ApiStats>('/stats'),
  getPendingContent: () => request<ApiContent[]>('/content/pending'),
  getCampaigns: () => request<ApiCampaign[]>('/campaigns'),
  getTasks: () => request<ApiTask[]>('/tasks'),
  updateTask: (id: number, status: string) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getOnboarding: (userId: number) =>
    request<{ items: ApiOnboardingItem[]; completed: number; total: number; percent: number }>(`/onboarding/${userId}`),

  completeOnboarding: (id: number, userId: number) =>
    request<{ completed: number; total: number; percent: number }>(`/onboarding/${id}/complete`, { method: 'POST', body: JSON.stringify({ userId }) }),

  getReports: () => request<ApiReports>('/reports'),
  runAudit: (url: string, userId?: number) =>
    request<ApiAudit>('/audit', { method: 'POST', body: JSON.stringify({ url, userId }) }),

  sendChatMessage: (clientId: number, message: string, sender = 'client') =>
    request(`/chat/${clientId}`, { method: 'POST', body: JSON.stringify({ sender, message }) }),

  approveContent: (id: number, userEmail?: string, userName?: string) =>
    request<{ success: boolean; pipeline: unknown }>(`/content/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ userEmail, userName }),
    }),

  rejectContent: (id: number, reason?: string) =>
    request(`/content/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  generateContent: (clientId: number, prompt: string, type = 'website_design', language = 'en') =>
    request<{ item: ApiContent; generated: boolean }>('/content/generate', {
      method: 'POST',
      body: JSON.stringify({ clientId, type, prompt, language }),
    }),
}
