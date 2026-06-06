import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { db, initDb } from './db.js'
import { sendEmail, welcomeEmailHtml } from './services/email.js'
import { runApprovalPipeline } from './services/pipeline.js'
import { runWebsiteAudit } from './services/audit.js'
import { seedOnboardingForUser, getOnboarding, completeOnboardingItem } from './services/onboarding.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 3001)

initDb()

const app = express()
app.use(cors())
app.use(express.json())

const audioDir = path.join(__dirname, '..', 'data', 'audio')
const videoDir = path.join(__dirname, '..', 'data', 'videos')
fs.mkdirSync(audioDir, { recursive: true })
fs.mkdirSync(videoDir, { recursive: true })
app.use('/api/media/audio', express.static(audioDir))
app.use('/api/media/videos', express.static(videoDir))

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    integrations: {
      email: !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
      instagram: !!(process.env.INSTAGRAM_ACCESS_TOKEN),
      voiceover: !!process.env.ELEVENLABS_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
    },
  })
})

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, businessName, phase, websiteUrl, language } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hash = bcrypt.hashSync(password, 10)
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, business_name, phase, website_url, language)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(email, hash, name || '', businessName || '', phase || 1, websiteUrl || '', language || 'en')

    const emailResult = await sendEmail({
      to: email,
      subject: 'Welcome to GrowthOS — Your 14-day trial starts now',
      html: welcomeEmailHtml(name || 'there', businessName || 'your business', phase || 1),
      text: `Welcome to GrowthOS, ${name}! Your trial for ${businessName} (Phase ${phase}) has started.`,
    })

    db.prepare(`
      INSERT INTO notifications (user_id, type, message, sent) VALUES (?, 'welcome', ?, ?)
    `).run(result.lastInsertRowid, 'Welcome email sent', emailResult.success ? 1 : 0)

    seedOnboardingForUser(Number(result.lastInsertRowid))

    res.json({ userId: result.lastInsertRowid, emailSent: emailResult })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.post('/api/integrations/connect', (req, res) => {
  const { userId, provider, accessToken, accountName } = req.body
  const existing = db.prepare('SELECT id FROM integrations WHERE user_id = ? AND provider = ?').get(userId || 1, provider)

  if (existing) {
    db.prepare('UPDATE integrations SET connected = 1, access_token = ?, account_name = ? WHERE id = ?')
      .run(accessToken || 'connected', accountName || provider, (existing as { id: number }).id)
  } else {
    db.prepare(`
      INSERT INTO integrations (user_id, provider, access_token, account_name, connected)
      VALUES (?, ?, ?, ?, 1)
    `).run(userId || 1, provider, accessToken || 'connected', accountName || provider)
  }

  res.json({ connected: true, provider })
})

app.get('/api/clients', (_req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY name').all()
  res.json(clients)
})

app.get('/api/clients/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id)
  if (!client) return res.status(404).json({ error: 'Not found' })
  const orders = db.prepare('SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id)
  const content = db.prepare('SELECT * FROM content_items WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id)
  const tasks = db.prepare('SELECT * FROM tasks WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id)
  const chat = db.prepare('SELECT * FROM chat_messages WHERE client_id = ? ORDER BY created_at ASC').all(req.params.id)
  const campaigns = db.prepare('SELECT * FROM marketing_campaigns WHERE client_id = ?').all(req.params.id)
  res.json({ ...client, orders, content, tasks, chat, campaigns })
})

app.post('/api/clients', (req, res) => {
  const { name, industry, phase, email } = req.body
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const result = db.prepare(`
    INSERT INTO clients (name, industry, phase, status, revenue, tasks, progress, initials, email)
    VALUES (?, ?, ?, 'Trial', 0, 0, 0, ?, ?)
  `).run(name, industry || 'General', phase || 1, initials, email || '')
  res.json({ id: result.lastInsertRowid })
})

app.get('/api/orders', (_req, res) => {
  const orders = db.prepare(`
    SELECT o.*, c.name as client_name, c.initials as client_initials
    FROM orders o
    JOIN clients c ON o.client_id = c.id
    ORDER BY o.created_at DESC
  `).all()
  res.json(orders)
})

app.get('/api/activities', (_req, res) => {
  const rows = db.prepare(`
    SELECT a.*, c.name as client_name FROM activities a
    LEFT JOIN clients c ON a.client_id = c.id
    ORDER BY a.created_at DESC LIMIT 20
  `).all() as Array<Record<string, string>>

  res.json(rows.map((a) => ({ ...a, time: timeAgo(a.created_at) })))
})

app.get('/api/stats', (_req, res) => {
  const clients = db.prepare('SELECT COUNT(*) as count, AVG(phase) as avgPhase, SUM(revenue) as revenue, SUM(tasks) as tasks FROM clients').get() as Record<string, number>
  const orders = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM orders').get() as Record<string, number>
  const pendingContent = db.prepare("SELECT COUNT(*) as count FROM content_items WHERE status = 'pending'").get() as { count: number }
  const campaigns = db.prepare("SELECT COUNT(*) as count FROM marketing_campaigns WHERE status = 'active'").get() as { count: number }

  res.json({
    totalClients: clients.count,
    monthlyRevenue: clients.revenue,
    activeTasks: clients.tasks,
    avgPhase: Number(clients.avgPhase?.toFixed(1) || 0),
    totalOrders: orders.count,
    orderValue: orders.total,
    pendingContent: pendingContent.count,
    activeCampaigns: campaigns.count,
  })
})

app.get('/api/content/pending', (_req, res) => {
  const items = db.prepare(`
    SELECT c.*, cl.name as client_name, cl.initials as client_initials
    FROM content_items c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.status = 'pending'
    ORDER BY c.created_at ASC
  `).all()
  res.json(items)
})

app.get('/api/content', (_req, res) => {
  const items = db.prepare(`
    SELECT c.*, cl.name as client_name FROM content_items c
    LEFT JOIN clients cl ON c.client_id = cl.id
    ORDER BY c.created_at DESC
  `).all()
  res.json(items)
})

app.post('/api/content/:id/approve', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const { userEmail, userName } = req.body

    db.prepare("UPDATE content_items SET status = 'approved' WHERE id = ?").run(id)

    const pipeline = await runApprovalPipeline(id, userEmail, userName)

    res.json({ success: true, pipeline })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.post('/api/content/:id/reject', (req, res) => {
  const id = Number(req.params.id)
  const { reason } = req.body
  db.prepare("UPDATE content_items SET status = 'rejected' WHERE id = ?").run(id)

  const content = db.prepare('SELECT * FROM content_items WHERE id = ?').get(id) as Record<string, unknown>
  if (content) {
    db.prepare(`
      INSERT INTO activities (client_id, text, icon, color) VALUES (?, ?, 'ti-x', '#EF4444')
    `).run(content.client_id, `Content rejected — ${content.title}${reason ? `: ${reason}` : ''}`)
  }

  res.json({ success: true })
})

app.post('/api/content/generate', async (req, res) => {
  const { clientId, type, prompt, language } = req.body
  const apiKey = process.env.OPENAI_API_KEY

  let imageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1000&fit=crop'
  let title = 'AI-generated design'
  let description = prompt || 'Custom design for your brand'

  if (apiKey && prompt) {
    try {
      const res2 = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `${prompt}. Professional marketing design, photorealistic, human-made aesthetic, natural lighting, not AI-looking.`,
          n: 1,
          size: '1024x1024',
        }),
      })
      const data = await res2.json()
      if (data.data?.[0]?.url) {
        imageUrl = data.data[0].url
        title = `Design — ${prompt.slice(0, 40)}`
      }
    } catch (err) {
      console.error('[openai] Image generation failed:', err)
    }
  }

  const result = db.prepare(`
    INSERT INTO content_items (client_id, type, title, description, image_url, status, language, caption)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(clientId || 1, type || 'website_design', title, description, imageUrl, language || 'en', description)

  const item = db.prepare('SELECT * FROM content_items WHERE id = ?').get(result.lastInsertRowid)
  res.json({ item, generated: !!apiKey })
})

app.get('/api/campaigns', (_req, res) => {
  const campaigns = db.prepare(`
    SELECT mc.*, c.title as content_title, cl.name as client_name
    FROM marketing_campaigns mc
    LEFT JOIN content_items c ON mc.content_id = c.id
    LEFT JOIN clients cl ON mc.client_id = cl.id
    ORDER BY mc.created_at DESC
  `).all()
  res.json(campaigns)
})

app.get('/api/tasks', (_req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, c.name as client_name, c.initials as client_initials
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    ORDER BY CASE t.status WHEN 'pending' THEN 0 ELSE 1 END, t.created_at DESC
  `).all()
  res.json(tasks)
})

app.patch('/api/tasks/:id', (req, res) => {
  const { status } = req.body
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status || 'completed', req.params.id)
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json(task)
})

app.get('/api/onboarding/:userId', (req, res) => {
  const userId = Number(req.params.userId)
  seedOnboardingForUser(userId)
  const items = getOnboarding(userId) as Array<{ completed: number }>
  const done = items.filter((i) => i.completed).length
  res.json({ items, completed: done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 })
})

app.post('/api/onboarding/:id/complete', (req, res) => {
  const { userId } = req.body
  const result = completeOnboardingItem(Number(req.params.id), userId)
  res.json(result)
})

app.get('/api/reports', (_req, res) => {
  const revenueByClient = db.prepare(`
    SELECT name, revenue, phase, progress FROM clients ORDER BY revenue DESC
  `).all()
  const contentStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM content_items GROUP BY status
  `).all()
  const orderStats = db.prepare(`
    SELECT status, SUM(amount) as total, COUNT(*) as count FROM orders GROUP BY status
  `).all()
  const campaignStats = db.prepare(`
    SELECT SUM(budget) as totalBudget, SUM(impressions) as totalImpressions, SUM(reach) as totalReach,
           COUNT(*) as count FROM marketing_campaigns
  `).get()
  const monthlyOrders = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(amount) as total
    FROM orders GROUP BY month ORDER BY month DESC LIMIT 6
  `).all()

  res.json({ revenueByClient, contentStats, orderStats, campaignStats, monthlyOrders })
})

app.post('/api/audit', async (req, res) => {
  try {
    const { url, userId } = req.body
    if (!url) return res.status(400).json({ error: 'URL required' })
    const audit = await runWebsiteAudit(url)
    db.prepare(`
      INSERT INTO website_audits (user_id, url, score, summary, issues_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId || null, url, audit.score, audit.summary, JSON.stringify(audit.issues))
    res.json(audit)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get('/api/oauth/instagram', (_req, res) => {
  const appId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI || `http://localhost:${PORT}/api/oauth/instagram/callback`
  if (!appId) {
    return res.json({ mock: true, message: 'Set META_APP_ID for real OAuth. Use integrations/connect for dev mode.' })
  }
  const scope = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement'
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`
  res.redirect(url)
})

app.get('/api/oauth/instagram/callback', async (req, res) => {
  const { code } = req.query
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI || `http://localhost:${PORT}/api/oauth/instagram/callback`

  if (!code || !appId || !appSecret) {
    return res.redirect(`http://localhost:5173/?instagram=error`)
  }

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`,
    )
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    db.prepare(`
      INSERT INTO integrations (user_id, provider, access_token, account_name, connected)
      VALUES (1, 'instagram', ?, 'Instagram Business', 1)
    `).run(accessToken)

    res.redirect('http://localhost:5173/?instagram=connected')
  } catch {
    res.redirect('http://localhost:5173/?instagram=error')
  }
})

app.post('/api/chat/:clientId', (req, res) => {
  const { sender, message } = req.body
  const result = db.prepare(`
    INSERT INTO chat_messages (client_id, sender, message) VALUES (?, ?, ?)
  `).run(req.params.clientId, sender || 'client', message)
  res.json({ id: result.lastInsertRowid })
})

const isProd = process.env.NODE_ENV === 'production'
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('/{*splat}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

app.listen(PORT, () => {
  console.log(`\n🚀 GrowthOS ${isProd ? 'Production' : 'API'} running at http://localhost:${PORT}`)
  console.log(`   Database: SQLite (data/growthos.db)`)
  console.log(`   Email: ${process.env.RESEND_API_KEY ? 'Resend' : process.env.SMTP_HOST ? 'SMTP' : 'Console (dev)'}`)
  console.log(`   Instagram: ${process.env.INSTAGRAM_ACCESS_TOKEN ? 'Connected' : 'Mock mode'}`)
  console.log(`   Voice: ${process.env.ELEVENLABS_API_KEY ? 'ElevenLabs' : 'Mock mode'}\n`)
})
