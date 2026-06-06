import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })
const DB_PATH = path.join(DATA_DIR, 'growthos.db')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      business_name TEXT,
      language TEXT DEFAULT 'en',
      phase INTEGER DEFAULT 1,
      website_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      industry TEXT,
      phase INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Trial',
      revenue REAL DEFAULT 0,
      tasks INTEGER DEFAULT 0,
      progress INTEGER DEFAULT 0,
      initials TEXT,
      email TEXT,
      website_url TEXT,
      language TEXT DEFAULT 'en'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      type TEXT DEFAULT 'subscription',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      video_url TEXT,
      status TEXT DEFAULT 'pending',
      language TEXT DEFAULT 'en',
      instagram_post_id TEXT,
      voice_url TEXT,
      caption TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      published_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      text TEXT NOT NULL,
      icon TEXT DEFAULT 'ti-activity',
      color TEXT DEFAULT '#0F6E56',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      provider TEXT NOT NULL,
      access_token TEXT,
      account_name TEXT,
      connected INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      content_id INTEGER,
      platform TEXT DEFAULT 'instagram',
      status TEXT DEFAULT 'scheduled',
      budget REAL DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      reach INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (content_id) REFERENCES content_items(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      message TEXT,
      sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      user_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'general',
      due_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS onboarding_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_key TEXT NOT NULL,
      label TEXT NOT NULL,
      icon TEXT DEFAULT 'ti-checkbox',
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS website_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      url TEXT NOT NULL,
      score INTEGER,
      summary TEXT,
      issues_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
  `)

  const clientCount = db.prepare('SELECT COUNT(*) as c FROM clients').get() as { c: number }
  if (clientCount.c === 0) seedData()

  const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks').get() as { c: number }
  if (taskCount.c === 0) seedTasks()

  const chatCount = db.prepare('SELECT COUNT(*) as c FROM chat_messages').get() as { c: number }
  if (chatCount.c === 0) seedChatMessages()
}

function seedTasks() {
  const tasks = [
    { client_id: 1, title: 'Upload spring menu photos', description: 'High-res food photography for social posts', status: 'pending', priority: 'high', category: 'content' },
    { client_id: 1, title: 'Approve homepage design', description: 'Swipe right in Content Studio', status: 'pending', priority: 'high', category: 'design' },
    { client_id: 1, title: 'Connect Instagram account', description: 'Link Meta Business account', status: 'completed', priority: 'medium', category: 'integration' },
    { client_id: 2, title: 'Review SEO keyword report', description: 'Monthly ranking update ready', status: 'pending', priority: 'medium', category: 'seo' },
    { client_id: 3, title: 'Provide gym facility photos', description: 'Equipment and class shots needed', status: 'pending', priority: 'high', category: 'onboarding' },
    { client_id: 3, title: 'Upload brand logo', description: 'SVG or PNG with transparent background', status: 'pending', priority: 'high', category: 'onboarding' },
    { client_id: 3, title: 'Share brand colour palette', description: 'Primary, secondary, accent colours', status: 'pending', priority: 'medium', category: 'onboarding' },
    { client_id: 3, title: 'Approve trial website', description: 'First design ready for review', status: 'pending', priority: 'high', category: 'design' },
    { client_id: 3, title: 'Connect Google Ads', description: 'Grant manager access', status: 'pending', priority: 'low', category: 'integration' },
    { client_id: 4, title: 'Review chatbot scripts', description: 'AI responses for property enquiries', status: 'pending', priority: 'medium', category: 'automation' },
    { client_id: 4, title: 'Approve listing reel', description: 'Video ready in Content Studio', status: 'pending', priority: 'high', category: 'content' },
    { client_id: 5, title: 'Monthly performance review', description: 'Schedule call with account manager', status: 'completed', priority: 'low', category: 'general' },
  ]

  const insert = db.prepare(`
    INSERT INTO tasks (client_id, title, description, status, priority, category)
    VALUES (@client_id, @title, @description, @status, @priority, @category)
  `)
  for (const t of tasks) insert.run(t)
}

function seedChatMessages() {
  const messages = [
    { client_id: 1, sender: 'Alex', message: 'Hi! Your spring menu campaign is ready for review in Content Studio.' },
    { client_id: 1, sender: 'client', message: 'Great, I\'ll check it out this afternoon!' },
    { client_id: 1, sender: 'Alex', message: 'Perfect — swipe right to approve and we\'ll post to Instagram automatically.' },
    { client_id: 2, sender: 'Alex', message: 'Bright Smiles is now ranking #3 for "dentist Birmingham" 🎉' },
    { client_id: 3, sender: 'Alex', message: 'Welcome to GrowthOS! Let\'s start with your logo and brand colours.' },
    { client_id: 4, sender: 'Alex', message: 'Your chatbot handled 12 enquiries yesterday — impressive results!' },
  ]

  const insert = db.prepare('INSERT INTO chat_messages (client_id, sender, message) VALUES (?, ?, ?)')
  for (const m of messages) insert.run(m.client_id, m.sender, m.message)
}

function seedData() {
  const clients = [
    { name: 'The Rustic Kitchen', industry: 'Restaurant', phase: 2, status: 'Active', revenue: 2340, tasks: 3, progress: 68, initials: 'RK', email: 'hello@rustickitchen.co.uk', language: 'en' },
    { name: 'Bright Smiles Dental', industry: 'Healthcare', phase: 3, status: 'Active', revenue: 7190, tasks: 1, progress: 45, initials: 'BS', email: 'info@brightsmiles.co.uk', language: 'en' },
    { name: 'Elite Fitness Co.', industry: 'Wellness', phase: 1, status: 'Trial', revenue: 297, tasks: 5, progress: 20, initials: 'EF', email: 'team@elitefitness.co.uk', language: 'en' },
    { name: 'Metro Properties', industry: 'Real Estate', phase: 4, status: 'Active', revenue: 8788, tasks: 2, progress: 82, initials: 'MP', email: 'sales@metroproperties.co.uk', language: 'en' },
    { name: 'LegalEdge Solicitors', industry: 'Legal', phase: 2, status: 'Active', revenue: 3582, tasks: 0, progress: 55, initials: 'LE', email: 'contact@legaledge.co.uk', language: 'en' },
  ]

  const insertClient = db.prepare(`
    INSERT INTO clients (name, industry, phase, status, revenue, tasks, progress, initials, email, language)
    VALUES (@name, @industry, @phase, @status, @revenue, @tasks, @progress, @initials, @email, @language)
  `)

  for (const c of clients) insertClient.run(c)

  const orders = [
    { client_id: 1, title: 'Phase 2 — Visibility (Monthly)', amount: 597, status: 'completed', type: 'subscription' },
    { client_id: 1, title: 'Social media campaign — Spring menu', amount: 450, status: 'completed', type: 'campaign' },
    { client_id: 1, title: 'Email sequence setup', amount: 200, status: 'pending', type: 'one-time' },
    { client_id: 2, title: 'Phase 3 — Growth (Monthly)', amount: 1197, status: 'completed', type: 'subscription' },
    { client_id: 2, title: 'Google Ads management', amount: 800, status: 'completed', type: 'campaign' },
    { client_id: 3, title: 'Phase 1 — Presence trial', amount: 297, status: 'pending', type: 'subscription' },
    { client_id: 4, title: 'Phase 4 — Automation (Monthly)', amount: 2197, status: 'completed', type: 'subscription' },
    { client_id: 4, title: 'AI chatbot deployment', amount: 1200, status: 'completed', type: 'one-time' },
    { client_id: 5, title: 'Phase 2 — Visibility (Monthly)', amount: 597, status: 'completed', type: 'subscription' },
  ]

  const insertOrder = db.prepare(`
    INSERT INTO orders (client_id, title, amount, status, type) VALUES (@client_id, @title, @amount, @status, @type)
  `)
  for (const o of orders) insertOrder.run(o)

  const contentItems = [
    {
      client_id: 1, type: 'website_design', title: 'Homepage — Rustic Kitchen',
      description: 'Warm, inviting restaurant homepage with hero food photography and online booking CTA.',
      image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=1000&fit=crop',
      status: 'pending', language: 'en',
      caption: 'Experience authentic flavours at The Rustic Kitchen 🍽️ Book your table today.',
    },
    {
      client_id: 1, type: 'video', title: 'Chef\'s special — Reel',
      description: '15-second reel showcasing tonight\'s special. Natural lighting, handheld feel.',
      image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=1000&fit=crop',
      video_url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
      status: 'pending', language: 'en',
      caption: 'Tonight\'s special is here 👨‍🍳 #RusticKitchen #Foodie',
    },
    {
      client_id: 2, type: 'website_design', title: 'Services page — Bright Smiles',
      description: 'Clean dental services layout with trust badges, before/after gallery, and booking widget.',
      image_url: 'https://images.unsplash.com/photo-1629909613654-28e377b37fa8?w=800&h=1000&fit=crop',
      status: 'pending', language: 'en',
      caption: 'Your smile deserves the best care 😁 Book a free consultation.',
    },
    {
      client_id: 3, type: 'video', title: 'Morning workout — Reel',
      description: 'Authentic gym reel with real trainer, natural audio, motivational tone.',
      image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=1000&fit=crop',
      video_url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4',
      status: 'pending', language: 'en',
      caption: 'Start your day strong 💪 Free trial at Elite Fitness.',
    },
    {
      client_id: 4, type: 'social_post', title: 'New listing — Metro Properties',
      description: 'Property showcase carousel with lifestyle photography and neighbourhood highlights.',
      image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=1000&fit=crop',
      status: 'pending', language: 'en',
      caption: 'Just listed 🏡 3-bed Victorian terrace in Edgbaston. DM for viewing.',
    },
  ]

  const insertContent = db.prepare(`
    INSERT INTO content_items (client_id, type, title, description, image_url, video_url, status, language, caption)
    VALUES (@client_id, @type, @title, @description, @image_url, @video_url, @status, @language, @caption)
  `)
  for (const c of contentItems) insertContent.run({ ...c, video_url: c.video_url ?? null })

  const activities = [
    { client_id: 2, text: "SEO ranking improved — Bright Smiles #3 'dentist Birmingham'", icon: 'ti-trending-up', color: '#0F6E56' },
    { client_id: 1, text: 'Email sequence sent to 47 leads for The Rustic Kitchen', icon: 'ti-mail', color: '#3B82F6' },
    { client_id: 3, text: 'Google Ads CTR up 34% for Elite Fitness', icon: 'ti-ad', color: '#F59E0B' },
    { client_id: 4, text: 'AI chatbot handled 12 enquiries for Metro Properties', icon: 'ti-robot', color: '#8B5CF6' },
    { client_id: 5, text: 'New 5-star Google review for LegalEdge', icon: 'ti-star', color: '#F97316' },
  ]

  const insertActivity = db.prepare(`
    INSERT INTO activities (client_id, text, icon, color) VALUES (@client_id, @text, @icon, @color)
  `)
  for (const a of activities) insertActivity.run(a)
}
