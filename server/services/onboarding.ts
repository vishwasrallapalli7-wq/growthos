import { db } from '../db.js'

const CHECKLIST_ITEMS = [
  { key: 'logo', label: 'Upload your logo', icon: 'ti-photo' },
  { key: 'brand_colours', label: 'Share brand colours', icon: 'ti-palette' },
  { key: 'photos', label: 'Provide product/service photos', icon: 'ti-camera' },
  { key: 'social_logins', label: 'Connect social accounts', icon: 'ti-brand-instagram' },
  { key: 'website_url', label: 'Confirm website URL', icon: 'ti-world' },
  { key: 'business_info', label: 'Describe your business', icon: 'ti-file-text' },
  { key: 'first_design', label: 'Approve your first design', icon: 'ti-cards' },
]

export function seedOnboardingForUser(userId: number) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM onboarding_items WHERE user_id = ?').get(userId) as { c: number }
  if (existing.c > 0) return

  const insert = db.prepare(`
    INSERT INTO onboarding_items (user_id, item_key, label, icon, completed)
    VALUES (?, ?, ?, ?, 0)
  `)

  for (const item of CHECKLIST_ITEMS) {
    insert.run(userId, item.key, item.label, item.icon)
  }
}

export function getOnboarding(userId: number) {
  return db.prepare('SELECT * FROM onboarding_items WHERE user_id = ? ORDER BY id').all(userId)
}

export function completeOnboardingItem(id: number, userId: number) {
  db.prepare('UPDATE onboarding_items SET completed = 1, completed_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(id, userId)
  const items = getOnboarding(userId) as Array<{ completed: number }>
  const done = items.filter((i) => i.completed).length
  return { completed: done, total: items.length, percent: Math.round((done / items.length) * 100) }
}
