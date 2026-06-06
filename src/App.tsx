import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from 'react'
import {
  api,
  type ApiClient, type ApiClientDetail, type ApiOrder, type ApiContent, type ApiActivity,
  type ApiStats, type ApiCampaign, type ApiTask, type ApiOnboardingItem, type ApiReports, type ApiAudit,
} from './api'

type Screen = 'hero' | 'chat' | 'services' | 'signup' | 'dashboard' | 'audit'
type DashboardTab = 'overview' | 'content' | 'clients' | 'orders' | 'activity' | 'marketing' | 'tasks' | 'reports'

interface ChatData {
  name: string
  business: string
  problem: string
  budget: string
}

interface Phase {
  num: number
  name: string
  monthly: string
  daily: string
  description: string
  features: string[]
}

interface Client {
  name: string
  industry: string
  phase: number
  status: 'Active' | 'Trial'
  revenue: string
  tasks: number
  progress: number
  initials: string
}

interface ActivityItem {
  text: string
  time: string
  color: string
  icon: string
}

const PHASES: Phase[] = [
  {
    num: 1,
    name: 'Presence',
    monthly: '£297/mo',
    daily: '£9.90/day',
    description: 'Get online with a professional website and essential digital foundations.',
    features: ['Custom website build', 'Google Business Profile', 'Basic SEO setup', 'Monthly performance report'],
  },
  {
    num: 2,
    name: 'Visibility',
    monthly: '£597/mo',
    daily: '£19.90/day',
    description: 'Drive traffic with SEO, content marketing, and social media presence.',
    features: ['Advanced SEO strategy', 'Blog content creation', 'Social media management', 'Email marketing setup'],
  },
  {
    num: 3,
    name: 'Growth',
    monthly: '£1,197/mo',
    daily: '£39.90/day',
    description: 'Scale leads and sales with paid ads, funnels, and conversion optimisation.',
    features: ['Google & Meta ads', 'Landing page funnels', 'Lead nurturing sequences', 'Conversion tracking'],
  },
  {
    num: 4,
    name: 'Automation',
    monthly: '£2,197/mo',
    daily: '£73/day',
    description: 'Automate operations with AI chatbots, CRM workflows, and smart integrations.',
    features: ['AI chatbot deployment', 'CRM automation', 'Review management', 'Advanced analytics dashboard'],
  },
  {
    num: 5,
    name: 'Domination',
    monthly: '£3,997/mo',
    daily: '£133/day',
    description: 'Dominate your market with full-stack marketing, PR, and competitive intelligence.',
    features: ['Competitor analysis', 'PR & media outreach', 'Multi-channel campaigns', 'Dedicated account team'],
  },
]

const CLIENTS: Client[] = [
  { name: 'The Rustic Kitchen', industry: 'Restaurant', phase: 2, status: 'Active', revenue: '£2,340', tasks: 3, progress: 68, initials: 'RK' },
  { name: 'Bright Smiles Dental', industry: 'Healthcare', phase: 3, status: 'Active', revenue: '£7,190', tasks: 1, progress: 45, initials: 'BS' },
  { name: 'Elite Fitness Co.', industry: 'Wellness', phase: 1, status: 'Trial', revenue: '£297', tasks: 5, progress: 20, initials: 'EF' },
  { name: 'Metro Properties', industry: 'Real Estate', phase: 4, status: 'Active', revenue: '£8,788', tasks: 2, progress: 82, initials: 'MP' },
  { name: 'LegalEdge Solicitors', industry: 'Legal', phase: 2, status: 'Active', revenue: '£3,582', tasks: 0, progress: 55, initials: 'LE' },
]

const ACTIVITIES: ActivityItem[] = [
  { text: "SEO ranking improved — Bright Smiles #3 'dentist Birmingham'", time: '2h ago', color: '#0F6E56', icon: 'ti-trending-up' },
  { text: 'Email sequence sent to 47 leads for The Rustic Kitchen', time: '5h ago', color: '#3B82F6', icon: 'ti-mail' },
  { text: 'Google Ads CTR up 34% for Elite Fitness', time: 'Yesterday', color: '#F59E0B', icon: 'ti-ad' },
  { text: 'AI chatbot handled 12 enquiries for Metro Properties', time: 'Yesterday', color: '#8B5CF6', icon: 'ti-robot' },
  { text: 'New 5-star Google review for LegalEdge', time: '2 days ago', color: '#F97316', icon: 'ti-star' },
]

const CHAT_STEPS = [
  { key: 'name' as const, bot: "Hey! I'm Alex from GrowthOS. Before we show you exactly what we can do for your business, I'd love to learn a bit about you. What's your name?", type: 'text' as const },
  { key: 'business' as const, bot: (d: ChatData) => `Great to meet you, ${d.name}! What's your business called and what do you do?`, type: 'text' as const },
  { key: 'problem' as const, bot: (d: ChatData) => `Love it! So ${d.business} sounds brilliant. What's your biggest challenge right now when it comes to getting customers online?`, type: 'choices' as const, choices: ['I have no website', 'I have a website but no traffic', 'I need more leads and sales', "I'm overwhelmed doing everything manually", 'I want to dominate my market'] },
  { key: 'budget' as const, bot: () => "Perfect — that's exactly what we help with every single day. What's your current monthly budget for marketing?", type: 'choices' as const, choices: ['Under £300/mo', '£300–£600/mo', '£600–£1,500/mo', '£1,500–£4,000/mo', 'Open to discussion'] },
  { key: 'cta' as const, bot: () => "You're in the right place. Let me show you exactly what GrowthOS can do for you.", type: 'cta' as const },
]

const GLOBAL_CSS = `
  :root {
    --font-display: 'Instrument Serif', serif;
    --font-body: 'Inter', sans-serif;
    --background: 201 100% 13%;
    --foreground: 0 0% 100%;
    --muted-foreground: 240 4% 66%;
    --primary: 0 0% 100%;
    --primary-foreground: 0 0% 4%;
    --secondary: 0 0% 10%;
    --muted: 0 0% 10%;
    --accent: 0 0% 10%;
    --border: 0 0% 18%;
    --input: 0 0% 18%;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--font-body);
    background: hsl(201, 100%, 13%);
    color: #fff;
    overflow-x: hidden;
  }
  .liquid-glass {
    background: rgba(255, 255, 255, 0.01);
    background-blend-mode: luminosity;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease;
  }
  .liquid-glass:hover { transform: scale(1.02); }
  .liquid-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(180deg,
      rgba(255,255,255,0.45) 0%,
      rgba(255,255,255,0.15) 20%,
      rgba(255,255,255,0) 40%,
      rgba(255,255,255,0) 60%,
      rgba(255,255,255,0.15) 80%,
      rgba(255,255,255,0.45) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  @keyframes fade-rise {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-rise         { animation: fade-rise 0.8s ease-out both; }
  .animate-fade-rise-delay   { animation: fade-rise 0.8s ease-out 0.2s both; }
  .animate-fade-rise-delay-2 { animation: fade-rise 0.8s ease-out 0.4s both; }
  .animate-fade-rise-delay-3 { animation: fade-rise 0.8s ease-out 0.6s both; }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; }
    50%     { opacity: 0.3; }
  }
  .typing-dot {
    display: inline-block; width: 6px; height: 6px;
    border-radius: 50%; background: #0F6E56;
    animation: pulse-dot 1s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes slide-in-right {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slide-in-left {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .msg-user { animation: slide-in-right 0.3s ease-out both; }
  .msg-bot  { animation: slide-in-left  0.3s ease-out both; }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .scale-in { animation: scale-in 0.4s ease-out both; }
  .input-field {
    width: 100%;
    padding: 12px 16px;
    background: rgba(255,255,255,0.05);
    border: 0.5px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    color: #fff;
    font-family: var(--font-body);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }
  .input-field:focus { border-color: #0F6E56; }
  .input-field::placeholder { color: rgba(255,255,255,0.35); }
  .btn-teal {
    background: #0F6E56;
    color: #fff;
    border: none;
    cursor: pointer;
    font-family: var(--font-body);
    transition: background 0.2s, transform 0.2s;
  }
  .btn-teal:hover { background: #085041; transform: scale(1.02); }
  .tab-btn { border: none; cursor: pointer; font-family: var(--font-body); font-size: 13px; padding: 8px 16px; border-radius: 8px; transition: background 0.2s; }
  .tab-btn.active { background: #0F6E56; color: #fff; }
  .tab-btn.inactive { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
  .tab-btn.inactive:hover { background: rgba(255,255,255,0.1); }
  .crm-row { border-bottom: 0.5px solid rgba(255,255,255,0.06); transition: background 0.2s; }
  .crm-row:hover { background: rgba(255,255,255,0.03); }
  .phase-card { transition: transform 0.2s; cursor: pointer; }
  .phase-card:hover { transform: translateY(-4px); }
  .choice-btn {
    background: rgba(255,255,255,0.05);
    border: 0.5px solid rgba(255,255,255,0.15);
    color: #fff;
    padding: 10px 18px;
    border-radius: 999px;
    font-size: 13px;
    cursor: pointer;
    font-family: var(--font-body);
    transition: background 0.2s, border-color 0.2s;
    text-align: left;
  }
  .choice-btn:hover { background: #0F6E56; border-color: #0F6E56; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
  .nav-link { color: rgba(255,255,255,0.5); text-decoration: none; font-size: 14px; transition: color 0.2s; cursor: pointer; }
  .nav-link:hover { color: #fff; }
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-12px) rotate(2deg); }
  }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(15,110,86,0.3); }
    50% { box-shadow: 0 0 40px rgba(15,110,86,0.6); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes swipe-out-right {
    to { opacity: 0; transform: translateX(150%) rotate(20deg); }
  }
  @keyframes swipe-out-left {
    to { opacity: 0; transform: translateX(-150%) rotate(-20deg); }
  }
  @keyframes count-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes particle-drift {
    0% { transform: translateY(100vh) scale(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 0.6; }
    100% { transform: translateY(-10vh) scale(1); opacity: 0; }
  }
  .animate-float { animation: float 4s ease-in-out infinite; }
  .animate-glow { animation: glow-pulse 2.5s ease-in-out infinite; }
  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(15,110,86,0.3), transparent);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  .stat-card { animation: count-up 0.6s ease-out both; }
  .stat-card:nth-child(1) { animation-delay: 0.1s; }
  .stat-card:nth-child(2) { animation-delay: 0.2s; }
  .stat-card:nth-child(3) { animation-delay: 0.3s; }
  .stat-card:nth-child(4) { animation-delay: 0.4s; }
  .swipe-card { touch-action: none; user-select: none; cursor: grab; transition: box-shadow 0.2s; }
  .swipe-card:active { cursor: grabbing; }
  .swipe-out-right { animation: swipe-out-right 0.4s ease-in forwards; }
  .swipe-out-left { animation: swipe-out-left 0.4s ease-in forwards; }
  .particle {
    position: absolute; border-radius: 50%;
    background: rgba(15,110,86,0.4);
    animation: particle-drift linear infinite;
    pointer-events: none;
  }
  .pipeline-step { transition: all 0.4s ease; }
  .pipeline-step.active { transform: scale(1.05); }
  @media (max-width: 768px) {
    .desktop-sidebar { display: none !important; }
    .mobile-bottom-nav { display: flex !important; }
    .main-content { padding: 20px 16px 90px !important; }
    .hero-nav-links { display: none !important; }
    .hero-stats { gap: 24px !important; }
    .crm-grid { grid-template-columns: 1fr !important; }
    .crm-grid-header { display: none !important; }
    .client-modal { width: 100% !important; max-height: 95vh !important; border-radius: 16px 16px 0 0 !important; }
  }
  .mobile-bottom-nav { display: none; }
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    animation: fade-rise 0.3s ease-out both;
  }
  .bar-chart-bar { transition: width 0.8s ease-out; }
`

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false)
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return mobile
}

function Logo({ size = 28 }: { size?: number }) {
  return (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: size, letterSpacing: '-0.5px' }}>
      GrowthOS<sup style={{ fontSize: size * 0.45 }}>®</sup>
    </span>
  )
}

function HeroScreen({ onBegin, onAudit }: { onBegin: () => void; onAudit: () => void }) {
  const mobile = useIsMobile()
  const stats = [
    { num: '333M', label: 'Small businesses worldwide' },
    { num: '£9.90', label: 'Per day, Phase 1' },
    { num: '14 days', label: 'Free trial, no card' },
    { num: '95%+', label: 'Profit margin' },
  ]

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${8 + (i * 7.5) % 90}%`,
    size: 4 + (i % 3) * 2,
    delay: `${i * 1.2}s`,
    duration: `${12 + (i % 5) * 3}s`,
  }))

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <video autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" type="video/mp4" />
      </video>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,20,15,0.55)', zIndex: 1 }} />
      {particles.map((p) => (
        <div key={p.id} className="particle" style={{ left: p.left, width: p.size, height: p.size, bottom: -10, animationDuration: p.duration, animationDelay: p.delay, zIndex: 2 }} />
      ))}

      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <Logo />
        <div style={{ display: 'flex', gap: mobile ? 12 : 32, alignItems: 'center' }}>
          <div className="hero-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {['Home', 'Services', 'Pricing', 'About', 'Contact'].map((l) => (
              <span key={l} className="nav-link">{l}</span>
            ))}
            <span className="nav-link" onClick={onAudit}>Free Audit</span>
          </div>
          <button className="liquid-glass" onClick={onBegin} style={{ borderRadius: 999, padding: mobile ? '8px 18px' : '10px 24px', fontSize: 14, color: '#fff', background: 'transparent' }}>
            Begin Journey
          </button>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px 80px' }}>
        <div className="animate-fade-rise" style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 999, border: '1px solid #0F6E56', color: '#0F6E56', fontSize: 13, marginBottom: 28, background: 'rgba(15,110,86,0.1)' }}>
          Your business. On autopilot.
        </div>

        <h1 className="animate-fade-rise" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 8vw, 96px)', letterSpacing: '-2.46px', fontWeight: 400, lineHeight: 1.05, maxWidth: 900, marginBottom: 24 }}>
          Where <em className="not-italic" style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'normal' }}>dreams</em> rise <em className="not-italic" style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'normal' }}>through the silence.</em>
        </h1>

        <p className="animate-fade-rise-delay" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 580, fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
          We build your website, run your marketing, automate your operations and grow your revenue — for less than £10 a day.
        </p>

        <button className="liquid-glass animate-fade-rise-delay-2 animate-glow" onClick={onBegin} style={{ borderRadius: 999, padding: '20px 56px', fontSize: 16, color: '#fff', background: 'transparent', marginBottom: 64 }}>
          Begin Journey
        </button>

        <div className="animate-fade-rise-delay-3 hero-stats" style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 4 }}>{s.num}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ChatMessage {
  id: number
  type: 'bot' | 'user'
  text: string
}

function ChatScreen({ onComplete, chatData }: { onComplete: (data: ChatData) => void; chatData: ChatData }) {
  const [step, setStep] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const [data, setData] = useState<ChatData>(chatData)
  const [showInput, setShowInput] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgId = useRef(0)

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const addBotMessage = useCallback((text: string, onDone?: () => void) => {
    setTyping(true)
    setShowInput(false)
    const delay = 900 + Math.random() * 400
    setTimeout(() => {
      setTyping(false)
      msgId.current += 1
      setMessages((prev) => [...prev, { id: msgId.current, type: 'bot', text }])
      onDone?.()
    }, delay)
  }, [])

  useEffect(() => {
    if (step === 0 && messages.length === 0) {
      const s = CHAT_STEPS[0]
      addBotMessage(s.bot as string, () => setShowInput(true))
    }
  }, [step, messages.length, addBotMessage])

  useEffect(() => { scrollBottom() }, [messages, typing, showInput, scrollBottom])

  const advanceStep = (answer: string, key: keyof ChatData | 'cta') => {
    msgId.current += 1
    setMessages((prev) => [...prev, { id: msgId.current, type: 'user', text: answer }])
    setInput('')
    setShowInput(false)

    if (key !== 'cta') {
      const newData = { ...data, [key]: answer }
      setData(newData)
      const nextStep = step + 1
      setStep(nextStep)
      const next = CHAT_STEPS[nextStep]
      if (next) {
        const botText = typeof next.bot === 'function' ? next.bot(newData) : next.bot
        addBotMessage(botText, () => {
          if (next.type === 'text') setShowInput(true)
        })
      }
    }
  }

  const handleTextSubmit = () => {
    if (!input.trim()) return
    const key = CHAT_STEPS[step].key
    if (key !== 'cta') advanceStep(input.trim(), key)
  }

  const currentStep = CHAT_STEPS[step]

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(201,100%,10%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="scale-in" style={{ width: '100%', maxWidth: 620, background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '0.5px solid rgba(255,255,255,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: '20px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-user" style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Alex — GrowthOS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                Online
              </div>
            </div>
          </div>
          <Logo size={18} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 400 }}>
          {messages.map((m) => (
            <div key={m.id} className={m.type === 'user' ? 'msg-user' : 'msg-bot'} style={{ display: 'flex', justifyContent: m.type === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: 16,
                background: m.type === 'user' ? '#0F6E56' : 'rgba(255,255,255,0.06)',
                fontSize: 14, lineHeight: 1.5,
                borderBottomRightRadius: m.type === 'user' ? 4 : 16,
                borderBottomLeftRadius: m.type === 'bot' ? 4 : 16,
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="msg-bot" style={{ display: 'flex', gap: 4, padding: '12px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 16, width: 'fit-content' }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '16px 24px 20px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          {showInput && currentStep?.type === 'text' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input-field" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()} placeholder="Type your answer..." autoFocus />
              <button className="btn-teal" onClick={handleTextSubmit} style={{ borderRadius: 10, padding: '0 20px', fontSize: 14 }}>Send</button>
            </div>
          )}
          {!typing && currentStep?.type === 'choices' && messages.length > 0 && messages[messages.length - 1].type === 'bot' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {currentStep.choices!.map((c) => (
                <button key={c} className="choice-btn" onClick={() => advanceStep(c, currentStep.key)}>{c}</button>
              ))}
            </div>
          )}
          {!typing && currentStep?.type === 'cta' && messages.length > 0 && messages[messages.length - 1].type === 'bot' && (
            <button className="btn-teal" onClick={() => onComplete(data)} style={{ width: '100%', borderRadius: 12, padding: '14px 20px', fontSize: 15, fontWeight: 500 }}>
              Show me what GrowthOS can do →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ServicesScreen({ selectedPhase, onSelectPhase, onStartTrial }: { selectedPhase: number; onSelectPhase: (n: number) => void; onStartTrial: () => void }) {
  const phase = PHASES.find((p) => p.num === selectedPhase)!

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(201,100%,11%)', padding: '48px 24px 80px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 999, background: 'rgba(15,110,86,0.15)', color: '#0F6E56', fontSize: 13, marginBottom: 16 }}>Choose your phase</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 400, letterSpacing: '-1px', marginBottom: 12, lineHeight: 1.2 }}>
            Every business starts somewhere.<br />Where do you want to begin?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 480, margin: '0 auto', fontSize: 15, lineHeight: 1.6 }}>
            Start with the phase that fits your goals today. Upgrade anytime as your business grows.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 40 }}>
          {PHASES.map((p) => {
            const selected = p.num === selectedPhase
            return (
              <div key={p.num} className="phase-card" onClick={() => onSelectPhase(p.num)} style={{
                background: selected ? 'rgba(15,110,86,0.12)' : 'rgba(255,255,255,0.03)',
                border: selected ? '1.5px solid #0F6E56' : '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: 'rgba(15,110,86,0.2)', color: '#0F6E56', fontSize: 11, marginBottom: 10, width: 'fit-content' }}>
                  Phase {p.num}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 8 }}>{p.name}</div>
                <div style={{ color: '#0F6E56', fontSize: 18, fontWeight: 500, marginBottom: 2 }}>{p.monthly}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12 }}>{p.daily}</div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>{p.description}</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <i className="ti ti-check" style={{ color: '#0F6E56', fontSize: 14, flexShrink: 0, marginTop: 1 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {selected && (
                  <div style={{ marginTop: 16, padding: '8px 0', textAlign: 'center', background: '#0F6E56', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
                    Selected ✓
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '8px 20px', borderRadius: 999, background: 'rgba(15,110,86,0.1)', color: '#0F6E56', fontSize: 13, marginBottom: 20 }}>
            14-day free trial · No card needed · Cancel any time
          </div>
          <br />
          <button className="btn-teal" onClick={onStartTrial} style={{ borderRadius: 12, padding: '16px 36px', fontSize: 16, fontWeight: 500 }}>
            Start free trial — Phase {phase.num} →
          </button>
        </div>
      </div>
    </div>
  )
}

function SignupScreen({ phase, chatData, onComplete }: { phase: number; chatData: ChatData; onComplete: (email: string, userId: number) => void }) {
  const [signupStep, setSignupStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState(chatData.business || '')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [emailProvider, setEmailProvider] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('en')
  const [userId, setUserId] = useState(0)
  const [connections, setConnections] = useState({ google: false, meta: false, gsc: false })

  const phaseData = PHASES.find((p) => p.num === phase)!
  const steps = ['Account', 'Connect', "You're in"]

  const handleCreateAccount = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true)
    setError('')
    try {
      const result = await api.signup({
        email, password, name: chatData.name, businessName, phase, websiteUrl, language,
      })
      setUserId(result.userId)
      setEmailSent(true)
      setEmailProvider(result.emailSent.provider)
      setTimeout(() => setSignupStep(2), 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleConnection = async (key: keyof typeof connections) => {
    const next = !connections[key]
    setConnections((prev) => ({ ...prev, [key]: next }))
    if (next) {
      const provider = key === 'meta' ? 'instagram' : key === 'google' ? 'google' : 'gsc'
      try {
        if (key === 'meta') window.open(api.getInstagramOAuthUrl(), '_blank', 'width=600,height=700')
        else await api.connectIntegration(provider, userId || 1)
      } catch { /* dev fallback */ }
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(201,100%,10%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="scale-in" style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '0.5px solid rgba(255,255,255,0.1)', padding: '32px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
          {steps.map((s, i) => {
            const num = i + 1
            const done = signupStep > num
            const active = signupStep === num
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  background: done || active ? '#0F6E56' : 'rgba(255,255,255,0.08)',
                  color: done || active ? '#fff' : 'rgba(255,255,255,0.4)',
                }}>
                  {done ? <i className="ti ti-check" style={{ fontSize: 14 }} /> : num}
                </div>
                <span style={{ fontSize: 12, color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>{s}</span>
                {i < steps.length - 1 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.15)', marginLeft: 4 }} />}
              </div>
            )
          })}
        </div>

        {signupStep === 1 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Create your account</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28 }}>
              Starting with Phase {phase} — {phaseData.name} at {phaseData.daily}
            </p>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #EF4444', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#EF4444', marginBottom: 16 }}>
                {error}
              </div>
            )}
            {emailSent && (
              <div style={{ background: 'rgba(15,110,86,0.15)', border: '1px solid #0F6E56', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#0F6E56', marginBottom: 20 }}>
                Confirmation email sent via {emailProvider}! Check your inbox.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <input className="input-field" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="input-field" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <input className="input-field" type="text" placeholder="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <button className="btn-teal" onClick={handleCreateAccount} disabled={loading} style={{ width: '100%', borderRadius: 12, padding: '14px', fontSize: 15, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating account...' : 'Create account & start free trial'}
            </button>
          </div>
        )}

        {signupStep === 2 && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Connect your accounts</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28 }}>
              Give us access so we can start building...
            </p>
            <div style={{ marginBottom: 14 }}>
              <input className="input-field" type="text" placeholder="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Content & voice-over language</label>
              <select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value)} style={{ cursor: 'pointer' }}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
                <option value="ar">Arabic</option>
                <option value="pt">Portuguese</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { key: 'google' as const, label: 'Google Ads & Analytics', icon: 'ti-brand-google', color: '#3B82F6' },
                { key: 'meta' as const, label: 'Meta Facebook & Instagram', icon: 'ti-brand-facebook', color: '#8B5CF6' },
                { key: 'gsc' as const, label: 'Google Search Console', icon: 'ti-brand-google', color: '#F59E0B' },
              ].map((c) => (
                <button key={c.key} onClick={() => toggleConnection(c.key)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  background: connections[c.key] ? 'rgba(15,110,86,0.12)' : 'rgba(255,255,255,0.05)',
                  border: connections[c.key] ? '1px solid #0F6E56' : '0.5px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <i className={`ti ${c.icon}`} style={{ color: c.color, fontSize: 20 }} />
                    {c.label}
                  </span>
                  <span style={{ fontSize: 13, color: connections[c.key] ? '#0F6E56' : 'rgba(255,255,255,0.5)' }}>
                    {connections[c.key] ? 'Connected ✓' : 'Connect'}
                  </span>
                </button>
              ))}
            </div>
            <button className="btn-teal" onClick={() => setSignupStep(3)} style={{ width: '100%', borderRadius: 12, padding: '14px', fontSize: 15 }}>
              Continue to dashboard →
            </button>
          </div>
        )}

        {signupStep === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <i className="ti ti-check" style={{ fontSize: 36, color: '#fff' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, marginBottom: 12 }}>You're all set!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28 }}>
              Welcome to GrowthOS. Your 14-day free trial has started.
            </p>
            <div style={{ background: 'rgba(15,110,86,0.12)', border: '1px solid rgba(15,110,86,0.3)', borderRadius: 12, padding: '16px 20px', textAlign: 'left', marginBottom: 28 }}>
              {[
                { icon: 'ti-mail', text: 'Login details sent to your email' },
                { icon: 'ti-clock', text: 'Website will be live within 5 working days' },
                { icon: 'ti-phone', text: 'Your account manager calls within 24 hours' },
              ].map((item) => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                  <i className={`ti ${item.icon}`} style={{ color: '#0F6E56', fontSize: 18 }} />
                  {item.text}
                </div>
              ))}
            </div>
            <button className="btn-teal" onClick={() => onComplete(email, userId)} style={{ width: '100%', borderRadius: 12, padding: '14px', fontSize: 15 }}>
              Open my GrowthOS dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SwipeStudio({ items, userEmail, userName, onUpdate }: {
  items: ApiContent[]
  userEmail?: string
  userName?: string
  onUpdate: () => void
}) {
  const [queue, setQueue] = useState(items)
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false })
  const [exitClass, setExitClass] = useState('')
  const [pipeline, setPipeline] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const startPos = useRef({ x: 0, y: 0 })

  useEffect(() => { setQueue(items) }, [items])

  const current = queue[0]
  const rotate = drag.x * 0.08
  const likeOpacity = Math.min(Math.max(drag.x / 100, 0), 1)
  const nopeOpacity = Math.min(Math.max(-drag.x / 100, 0), 1)

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!current || processing) return
    setProcessing(true)
    setExitClass(direction === 'right' ? 'swipe-out-right' : 'swipe-out-left')

    setTimeout(async () => {
      try {
        if (direction === 'right') {
          setPipeline(['Voice-over generating...', 'Rendering final video...', 'Posting to Instagram...', 'Starting marketing campaign...'])
          await api.approveContent(current.id, userEmail, userName)
          setPipeline(['✓ Voice-over added', '✓ Video rendered', '✓ Posted to Instagram', '✓ Marketing campaign live'])
        } else {
          await api.rejectContent(current.id)
        }
      } catch { /* continue */ }
      setQueue((q) => q.slice(1))
      setDrag({ x: 0, y: 0, active: false })
      setExitClass('')
      setProcessing(false)
      setTimeout(() => setPipeline([]), 2000)
      onUpdate()
    }, 400)
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY }
    setDrag((d) => ({ ...d, active: true }))
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!drag.active) return
    setDrag({ x: e.clientX - startPos.current.x, y: (e.clientY - startPos.current.y) * 0.3, active: true })
  }

  const onPointerUp = () => {
    if (!drag.active) return
    if (drag.x > 100) handleSwipe('right')
    else if (drag.x < -100) handleSwipe('left')
    else setDrag({ x: 0, y: 0, active: false })
  }

  if (!current) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="animate-float" style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>All caught up!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>New designs and videos will appear here for your approval.</p>
      </div>
    )
  }

  const typeLabel = current.type === 'video' ? 'Video Reel' : current.type === 'website_design' ? 'Website Design' : 'Social Post'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>Content Studio</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Swipe right to approve → voice-over → Instagram → marketing</p>
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          <span>{queue.length} pending</span>
        </div>
      </div>

      {pipeline.length > 0 && (
        <div className="scale-in" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {pipeline.map((step, i) => (
            <div key={i} className="pipeline-step active" style={{
              padding: '8px 14px', borderRadius: 999, fontSize: 12,
              background: step.startsWith('✓') ? 'rgba(15,110,86,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${step.startsWith('✓') ? '#0F6E56' : 'rgba(255,255,255,0.1)'}`,
              color: step.startsWith('✓') ? '#0F6E56' : 'rgba(255,255,255,0.7)',
            }}>{step}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, minHeight: 520 }}>
        <button onClick={() => handleSwipe('left')} disabled={processing} style={{
          width: 56, height: 56, borderRadius: '50%', border: '2px solid #EF4444', background: 'rgba(239,68,68,0.1)',
          color: '#EF4444', fontSize: 24, cursor: 'pointer', flexShrink: 0,
        }}>✕</button>

        <div style={{ position: 'relative', width: 340, height: 480 }}>
          {queue[1] && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 20, background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)', transform: 'scale(0.95) translateY(8px)', zIndex: 0,
            }} />
          )}
          <div
            className={`swipe-card ${exitClass}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden', zIndex: 1,
              transform: `translate(${drag.x}px, ${drag.y}px) rotate(${rotate}deg)`,
              border: '0.5px solid rgba(255,255,255,0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            {current.type === 'video' && current.video_url ? (
              <video src={current.video_url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <img src={current.image_url} alt={current.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <div style={{
              position: 'absolute', top: 20, left: 20, padding: '6px 14px', borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 500,
              border: '2px solid #22C55E', color: '#22C55E', opacity: likeOpacity, transform: 'rotate(-12deg)',
            }}>APPROVE ✓</div>
            <div style={{
              position: 'absolute', top: 20, right: 20, padding: '6px 14px', borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 500,
              border: '2px solid #EF4444', color: '#EF4444', opacity: nopeOpacity, transform: 'rotate(12deg)',
            }}>NOPE ✕</div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 20px 20px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                  {current.client_initials}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{current.client_name}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(15,110,86,0.3)', fontSize: 10, color: '#0F6E56' }}>{typeLabel}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 6 }}>{current.title}</div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{current.description}</p>
              {current.caption && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8, fontStyle: 'italic' }}>"{current.caption}"</p>
              )}
            </div>
          </div>
        </div>

        <button onClick={() => handleSwipe('right')} disabled={processing} className="animate-glow" style={{
          width: 56, height: 56, borderRadius: '50%', border: 'none', background: '#0F6E56',
          color: '#fff', fontSize: 24, cursor: 'pointer', flexShrink: 0,
        }}>♥</button>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 16 }}>
        ← Swipe left to reject &nbsp;·&nbsp; Swipe right to approve, add voice-over in {current.language || 'en'}, post to Instagram & start marketing →
      </p>
    </div>
  )
}

function ClientModal({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<ApiClientDetail | null>(null)
  const [chatInput, setChatInput] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getClient(clientId).then(setDetail).catch(() => {})
  }, [clientId])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [detail?.chat])

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    await api.sendChatMessage(clientId, chatInput.trim())
    setChatInput('')
    const updated = await api.getClient(clientId)
    setDetail(updated)
  }

  if (!detail) return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ color: 'rgba(255,255,255,0.5)' }}>Loading...</div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="client-modal scale-in" onClick={(e) => e.stopPropagation()} style={{
        width: 640, maxHeight: '85vh', overflow: 'auto', background: 'hsl(201,100%,10%)',
        borderRadius: 20, border: '0.5px solid rgba(255,255,255,0.12)', padding: 28,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>{detail.initials}</div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400 }}>{detail.name}</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{detail.industry} · Phase {detail.phase} · {detail.status}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Revenue', value: `£${detail.revenue.toLocaleString()}` },
            { label: 'Progress', value: `${detail.progress}%` },
            { label: 'Orders', value: String(detail.orders?.length || 0) },
          ].map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {detail.content && detail.content.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 10, color: '#0F6E56' }}>Campaign content</h3>
            {detail.content.slice(0, 3).map((c) => (
              <div key={c.id} style={{ fontSize: 13, padding: '8px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{c.title}</span>
                <span style={{ color: c.status === 'published' ? '#0F6E56' : '#F59E0B', fontSize: 11 }}>{c.status}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 10, color: '#0F6E56' }}>Chat with Alex — Account Manager</h3>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
            {(detail.chat || []).map((m) => (
              <div key={m.id} className={m.sender === 'Alex' ? 'msg-bot' : 'msg-user'} style={{
                display: 'flex', justifyContent: m.sender === 'Alex' ? 'flex-start' : 'flex-end', marginBottom: 8,
              }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13,
                  background: m.sender === 'Alex' ? 'rgba(255,255,255,0.08)' : '#0F6E56',
                }}>{m.message}</div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input-field" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Message your account manager..." />
            <button className="btn-teal" onClick={sendMessage} style={{ borderRadius: 10, padding: '0 16px' }}><i className="ti ti-send" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardScreen({ chatData, userEmail, userId }: { chatData: ChatData; userEmail?: string; userId?: number }) {
  const mobile = useIsMobile()
  const [tab, setTab] = useState<DashboardTab>('content')
  const [clients, setClients] = useState<ApiClient[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [activities, setActivities] = useState<ApiActivity[]>([])
  const [content, setContent] = useState<ApiContent[]>([])
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([])
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [reports, setReports] = useState<ApiReports | null>(null)
  const [onboarding, setOnboarding] = useState<ApiOnboardingItem[]>([])
  const [onboardingPct, setOnboardingPct] = useState(0)
  const [stats, setStats] = useState<ApiStats | null>(null)
  const [selectedClient, setSelectedClient] = useState<number | null>(null)
  const [modalClient, setModalClient] = useState<number | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [c, o, a, s, ct, camp, t, r] = await Promise.all([
        api.getClients(), api.getOrders(), api.getActivities(), api.getStats(),
        api.getPendingContent(), api.getCampaigns(), api.getTasks(), api.getReports(),
      ])
      setClients(c)
      setOrders(o)
      setActivities(a)
      setStats(s)
      setContent(ct)
      setCampaigns(camp)
      setTasks(t)
      setReports(r)
      if (userId) {
        const ob = await api.getOnboarding(userId)
        setOnboarding(ob.items)
        setOnboardingPct(ob.percent)
      }
    } catch {
      setClients(CLIENTS.map((c, i) => ({
        id: i + 1, name: c.name, industry: c.industry, phase: c.phase, status: c.status,
        revenue: parseInt(c.revenue.replace(/[£,]/g, '')), tasks: c.tasks, progress: c.progress, initials: c.initials,
      })))
      setActivities(ACTIVITIES.map((a, i) => ({ id: i, text: a.text, icon: a.icon, color: a.color, time: a.time })))
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  const toggleTask = async (id: number) => {
    await api.updateTask(id, 'completed')
    loadData()
  }

  const completeOnboardingItem = async (id: number) => {
    if (!userId) return
    const result = await api.completeOnboarding(id, userId)
    setOnboardingPct(result.percent)
    const ob = await api.getOnboarding(userId)
    setOnboarding(ob.items)
  }

  const navItems: { id: DashboardTab; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'ti-layout-dashboard' },
    { id: 'content', label: 'Content Studio', icon: 'ti-cards', badge: content.length },
    { id: 'clients', label: 'Clients', icon: 'ti-users' },
    { id: 'orders', label: 'Orders', icon: 'ti-shopping-cart' },
    { id: 'activity', label: 'Activity', icon: 'ti-activity' },
    { id: 'marketing', label: 'Marketing', icon: 'ti-speakerphone' },
    { id: 'tasks', label: 'Tasks', icon: 'ti-checkbox' },
    { id: 'reports', label: 'Reports', icon: 'ti-chart-bar' },
  ]

  const userName = chatData.name || 'Admin'
  const initials = userName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const clientOrders = selectedClient ? orders.filter((o) => o.client_id === selectedClient) : []

  const mobileNavItems = [
    { id: 'content' as DashboardTab, icon: 'ti-cards', label: 'Studio' },
    { id: 'overview' as DashboardTab, icon: 'ti-layout-dashboard', label: 'Home' },
    { id: 'clients' as DashboardTab, icon: 'ti-users', label: 'Clients' },
    { id: 'tasks' as DashboardTab, icon: 'ti-checkbox', label: 'Tasks' },
    { id: 'reports' as DashboardTab, icon: 'ti-chart-bar', label: 'Reports' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'hsl(201,100%,13%)' }}>
      {modalClient && <ClientModal clientId={modalClient} onClose={() => setModalClient(null)} />}
      <aside className="desktop-sidebar" style={{ width: 220, flexShrink: 0, borderRight: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
        <div style={{ marginBottom: 32, paddingLeft: 8 }}><Logo size={22} /></div>
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left',
              background: tab === n.id ? 'rgba(15,110,86,0.2)' : 'transparent',
              color: tab === n.id ? '#0F6E56' : 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-body)', position: 'relative',
            }}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 18 }} />
              {n.label}
              {n.badge ? (
                <span style={{ marginLeft: 'auto', background: '#0F6E56', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{n.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{userName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Account Manager</div>
          </div>
        </div>
      </aside>

      <main className="main-content" style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        {showOnboarding && onboarding.length > 0 && onboardingPct < 100 && (
          <div className="scale-in" style={{
            background: 'rgba(15,110,86,0.1)', border: '1px solid rgba(15,110,86,0.3)', borderRadius: 14,
            padding: '16px 20px', marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 500 }}>Onboarding checklist</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{onboardingPct}% complete — help us build your brand</p>
              </div>
              <button onClick={() => setShowOnboarding(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ width: `${onboardingPct}%`, height: '100%', background: '#0F6E56', borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {onboarding.map((item) => (
                <button key={item.id} onClick={() => !item.completed && completeOnboardingItem(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, cursor: item.completed ? 'default' : 'pointer',
                  background: item.completed ? 'rgba(15,110,86,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `0.5px solid ${item.completed ? '#0F6E56' : 'rgba(255,255,255,0.12)'}`,
                  color: item.completed ? '#0F6E56' : 'rgba(255,255,255,0.7)',
                }}>
                  <i className={`ti ${item.completed ? 'ti-check' : item.icon}`} style={{ fontSize: 14 }} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'content' && (
          <SwipeStudio items={content} userEmail={userEmail} userName={userName} onUpdate={loadData} />
        )}

        {tab === 'overview' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 28 }}>Good morning 👋</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 36 }}>
              {[
                { label: 'Total clients', value: String(stats?.totalClients ?? clients.length), icon: 'ti-users', color: '#0F6E56' },
                { label: 'Monthly revenue', value: `£${(stats?.monthlyRevenue ?? 0).toLocaleString()}`, icon: 'ti-trending-up', color: '#3B82F6' },
                { label: 'Pending content', value: String(stats?.pendingContent ?? content.length), icon: 'ti-cards', color: '#F59E0B' },
                { label: 'Active campaigns', value: String(stats?.activeCampaigns ?? 0), icon: 'ti-speakerphone', color: '#8B5CF6' },
              ].map((s) => (
                <div key={s.label} className="stat-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '20px 18px', border: '0.5px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 500, fontFamily: 'var(--font-display)' }}>{s.value}</div>
                  <i className={`ti ${s.icon}`} style={{ position: 'absolute', top: 18, right: 18, fontSize: 20, color: s.color, opacity: 0.7 }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <i className="ti ti-activity" style={{ color: '#0F6E56', fontSize: 20 }} />
              <h2 style={{ fontSize: 18, fontWeight: 500 }}>Recent Activity</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activities.map((a) => (
                <div key={a.id} className="scale-in" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${a.icon}`} style={{ color: a.color, fontSize: 18 }} />
                  </div>
                  <div style={{ flex: 1, fontSize: 14 }}>{a.text}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'clients' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 500 }}>Clients & Orders</h1>
              <button className="btn-teal" style={{ borderRadius: 10, padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-plus" style={{ fontSize: 16 }} /> Add client
              </button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr', padding: '12px 20px', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
                <span>Client</span><span>Industry</span><span>Phase</span><span>Status</span><span>Revenue</span><span>Tasks</span><span>Progress</span>
              </div>
              {clients.map((c) => (
                <div key={c.id} className="crm-row crm-grid" onClick={() => { setSelectedClient(selectedClient === c.id ? null : c.id); setModalClient(c.id) }} style={{
                  display: 'grid', gridTemplateColumns: mobile ? '1fr' : '2fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr', padding: '14px 20px', alignItems: 'center', fontSize: 13, cursor: 'pointer',
                  background: selectedClient === c.id ? 'rgba(15,110,86,0.08)' : undefined,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,110,86,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#0F6E56' }}>{c.initials}</div>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{c.industry}</span>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: 'rgba(15,110,86,0.15)', color: '#0F6E56', fontSize: 11, width: 'fit-content' }}>Phase {c.phase}</span>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, width: 'fit-content',
                    background: c.status === 'Active' ? 'rgba(15,110,86,0.15)' : 'rgba(245,158,11,0.15)',
                    color: c.status === 'Active' ? '#0F6E56' : '#F59E0B',
                  }}>{c.status}</span>
                  <span>£{c.revenue.toLocaleString()}</span>
                  <span style={{ color: c.tasks > 0 ? '#F59E0B' : 'rgba(255,255,255,0.35)' }}>{c.tasks}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${c.progress}%`, height: '100%', background: '#0F6E56', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 30 }}>{c.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
            {selectedClient && clientOrders.length > 0 && (
              <div className="scale-in" style={{ marginTop: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.08)', padding: 20 }}>
                <h3 style={{ fontSize: 15, marginBottom: 12, color: '#0F6E56' }}>Orders for {clients.find((c) => c.id === selectedClient)?.name}</h3>
                {clientOrders.map((o) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                    <span>{o.title}</span>
                    <span style={{ color: o.status === 'completed' ? '#0F6E56' : '#F59E0B' }}>£{o.amount} — {o.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Orders</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>All client orders linked to CRM — £{(stats?.orderValue ?? 0).toLocaleString()} total value</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map((o) => (
                <div key={o.id} className="crm-row scale-in" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(15,110,86,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#0F6E56', fontWeight: 600 }}>{o.client_initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{o.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{o.client_name} · {o.type}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>£{o.amount.toLocaleString()}</div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 11,
                    background: o.status === 'completed' ? 'rgba(15,110,86,0.15)' : 'rgba(245,158,11,0.15)',
                    color: o.status === 'completed' ? '#0F6E56' : '#F59E0B',
                  }}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 24 }}>Activity</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activities.map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${a.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`ti ${a.icon}`} style={{ color: a.color, fontSize: 20 }} />
                  </div>
                  <div style={{ flex: 1, fontSize: 14 }}>{a.text}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{a.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'marketing' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Marketing Campaigns</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>Auto-launched when you approve content in Content Studio</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campaigns.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Approve content to start your first campaign</p>
              ) : campaigns.map((c) => (
                <div key={c.id} className="scale-in" style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{c.content_title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.client_name} · {c.platform}</div>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(15,110,86,0.15)', color: '#0F6E56', fontSize: 11 }}>{c.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                    <span>Budget: <strong>£{c.budget}</strong></span>
                    <span>Impressions: <strong>{c.impressions}</strong></span>
                    <span>Reach: <strong>{c.reach}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'tasks' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>Tasks</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24 }}>
              {tasks.filter((t) => t.status === 'pending').length} pending · {tasks.filter((t) => t.status === 'completed').length} completed
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map((t) => (
                <div key={t.id} className="scale-in" style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                  background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.06)',
                  opacity: t.status === 'completed' ? 0.6 : 1,
                }}>
                  <button onClick={() => t.status !== 'completed' && toggleTask(t.id)} style={{
                    width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.status === 'completed' ? '#0F6E56' : 'rgba(255,255,255,0.2)'}`,
                    background: t.status === 'completed' ? '#0F6E56' : 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {t.status === 'completed' && <i className="ti ti-check" style={{ fontSize: 14, color: '#fff' }} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, textDecoration: t.status === 'completed' ? 'line-through' : 'none' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.client_name} · {t.category}</div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 10,
                    background: t.priority === 'high' ? 'rgba(239,68,68,0.15)' : t.priority === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
                    color: t.priority === 'high' ? '#EF4444' : t.priority === 'medium' ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                  }}>{t.priority}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'reports' && reports && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 24 }}>Reports</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 20, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 14, marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>Revenue by client</h3>
                {reports.revenueByClient.map((c) => (
                  <div key={c.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{c.name}</span>
                      <span>£{c.revenue.toLocaleString()}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div className="bar-chart-bar" style={{
                        width: `${(c.revenue / (reports.revenueByClient[0]?.revenue || 1)) * 100}%`,
                        height: '100%', background: '#0F6E56', borderRadius: 4,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 20, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 14, marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>Content pipeline</h3>
                {reports.contentStats.map((s) => (
                  <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                    <span style={{ textTransform: 'capitalize' }}>{s.status}</span>
                    <span style={{ color: '#0F6E56', fontWeight: 500 }}>{s.count}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 20, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 14, marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>Campaign performance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Total budget', value: `£${reports.campaignStats?.totalBudget || 0}` },
                    { label: 'Campaigns', value: String(reports.campaignStats?.count || 0) },
                    { label: 'Impressions', value: String(reports.campaignStats?.totalImpressions || 0) },
                    { label: 'Reach', value: String(reports.campaignStats?.totalReach || 0) },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center', padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {reports.monthlyOrders.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 20, border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: 14, marginBottom: 16, color: 'rgba(255,255,255,0.6)' }}>Monthly order value</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
                  {[...reports.monthlyOrders].reverse().map((m) => {
                    const max = Math.max(...reports.monthlyOrders.map((o) => o.total))
                    return (
                      <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                        <div className="bar-chart-bar" style={{
                          height: `${(m.total / max) * 100}px`, background: '#0F6E56', borderRadius: '4px 4px 0 0', minHeight: 4,
                        }} />
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{m.month.slice(5)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'reports' && !reports && (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>Loading reports...</div>
        )}
      </main>

      <nav className="mobile-bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 64,
        background: 'hsl(201,100%,9%)', borderTop: '0.5px solid rgba(255,255,255,0.1)',
        justifyContent: 'space-around', alignItems: 'center', zIndex: 50, padding: '0 8px',
      }}>
        {mobileNavItems.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer',
            color: tab === n.id ? '#0F6E56' : 'rgba(255,255,255,0.4)', fontSize: 10, padding: '4px 8px',
          }}>
            <i className={`ti ${n.icon}`} style={{ fontSize: 22 }} />
            {n.label}
            {n.id === 'content' && content.length > 0 && (
              <span style={{ position: 'absolute', top: 8, background: '#0F6E56', width: 6, height: 6, borderRadius: '50%' }} />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

function AuditScreen({ onBegin, onBack }: { onBegin: () => void; onBack: () => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [audit, setAudit] = useState<ApiAudit | null>(null)

  const runAudit = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const result = await api.runAudit(url.startsWith('http') ? url : `https://${url}`)
      setAudit(result)
    } catch {
      setAudit(null)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = audit ? (audit.score >= 70 ? '#0F6E56' : audit.score >= 40 ? '#F59E0B' : '#EF4444') : '#0F6E56'

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(201,100%,10%)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button onClick={onBack} className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 32, background: 'none', border: 'none' }}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: 999, background: 'rgba(15,110,86,0.15)', color: '#0F6E56', fontSize: 13, marginBottom: 16 }}>Free tool</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 400, marginBottom: 12 }}>Website audit</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Enter your URL — get an instant AI report with 10 things hurting your business</p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          <input className="input-field" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runAudit()} placeholder="yourbusiness.com" />
          <button className="btn-teal" onClick={runAudit} disabled={loading} style={{ borderRadius: 10, padding: '0 24px', whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Analysing...' : 'Audit'}
          </button>
        </div>

        {audit && (
          <div className="scale-in">
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div className="animate-glow" style={{
                width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
                border: `4px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 42, color: scoreColor,
              }}>{audit.score}</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>{audit.summary}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
              {audit.issues.map((issue, i) => (
                <div key={issue.id} className="scale-in" style={{
                  padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12,
                  border: '0.5px solid rgba(255,255,255,0.06)', animationDelay: `${i * 0.05}s`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{i + 1}. {issue.title}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 999,
                      background: issue.impact === 'high' ? 'rgba(239,68,68,0.15)' : issue.impact === 'medium' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)',
                      color: issue.impact === 'high' ? '#EF4444' : issue.impact === 'medium' ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                    }}>{issue.impact}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Fix: {issue.fix}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 }}>GrowthOS fixes all of this automatically — from £9.90/day</p>
              <button className="btn-teal animate-glow" onClick={onBegin} style={{ borderRadius: 12, padding: '16px 40px', fontSize: 16 }}>
                Fix everything — start free trial →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('hero')
  const [selectedPhase, setSelectedPhase] = useState(1)
  const [chatData, setChatData] = useState<ChatData>({ name: '', business: '', problem: '', budget: '' })
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState<number | undefined>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('instagram') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {screen === 'hero' && <HeroScreen onBegin={() => setScreen('chat')} onAudit={() => setScreen('audit')} />}
      {screen === 'audit' && <AuditScreen onBegin={() => setScreen('chat')} onBack={() => setScreen('hero')} />}
      {screen === 'chat' && (
        <ChatScreen
          chatData={chatData}
          onComplete={(data) => { setChatData(data); setScreen('services') }}
        />
      )}
      {screen === 'services' && (
        <ServicesScreen
          selectedPhase={selectedPhase}
          onSelectPhase={setSelectedPhase}
          onStartTrial={() => setScreen('signup')}
        />
      )}
      {screen === 'signup' && (
        <SignupScreen
          phase={selectedPhase}
          chatData={chatData}
          onComplete={(e, id) => { setUserEmail(e); setUserId(id); setScreen('dashboard') }}
        />
      )}
      {screen === 'dashboard' && <DashboardScreen chatData={chatData} userEmail={userEmail} userId={userId} />}
    </>
  )
}
