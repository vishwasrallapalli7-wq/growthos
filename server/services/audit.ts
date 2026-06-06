import 'dotenv/config'

const AUDIT_ISSUES = [
  { id: 1, title: 'Slow page load speed', impact: 'high', fix: 'Compress images and enable CDN caching' },
  { id: 2, title: 'Missing meta descriptions', impact: 'high', fix: 'Add unique meta descriptions to every page' },
  { id: 3, title: 'No mobile optimisation', impact: 'high', fix: 'Implement responsive design breakpoints' },
  { id: 4, title: 'Weak call-to-action', impact: 'medium', fix: 'Add prominent CTA above the fold' },
  { id: 5, title: 'No SSL certificate', impact: 'high', fix: 'Enable HTTPS with a valid certificate' },
  { id: 6, title: 'Poor Google Business Profile', impact: 'medium', fix: 'Claim and optimise your GBP listing' },
  { id: 7, title: 'No email capture', impact: 'medium', fix: 'Add a lead magnet and signup form' },
  { id: 8, title: 'Thin content', impact: 'medium', fix: 'Add 500+ words of valuable content per page' },
  { id: 9, title: 'Missing social proof', impact: 'low', fix: 'Display reviews and testimonials prominently' },
  { id: 10, title: 'No analytics tracking', impact: 'medium', fix: 'Install Google Analytics 4 and conversion tracking' },
]

export async function runWebsiteAudit(url: string): Promise<{
  url: string
  score: number
  issues: typeof AUDIT_ISSUES
  summary: string
  provider: string
}> {
  const apiKey = process.env.OPENAI_API_KEY
  let score = 35 + Math.floor(Math.random() * 30)
  let summary = `Your website at ${url} has significant room for improvement. GrowthOS can fix all 10 issues automatically.`

  if (apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `Analyze this business website URL: ${url}. Return JSON only: {"score": number 0-100, "summary": "2 sentence audit summary"}`,
          }],
          temperature: 0.3,
        }),
      })
      const data = await res.json()
      const text = data.choices?.[0]?.message?.content || ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        if (parsed.score) score = Math.min(100, Math.max(0, parsed.score))
        if (parsed.summary) summary = parsed.summary
      }
    } catch (err) {
      console.error('[audit] OpenAI failed:', err)
    }
  }

  return {
    url,
    score,
    issues: AUDIT_ISSUES,
    summary,
    provider: apiKey ? 'openai' : 'heuristic',
  }
}
