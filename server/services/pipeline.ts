import { db } from '../db.js'
import { generateVoiceover } from './voiceover.js'
import { postToInstagram, postVideoToInstagram } from './instagram.js'
import { sendEmail, contentApprovedEmailHtml } from './email.js'
import { mergeVideoWithVoice } from './video.js'

export async function runApprovalPipeline(contentId: number, userEmail?: string, userName?: string) {
  const content = db.prepare(`
    SELECT c.*, cl.name as client_name, cl.language as client_language, cl.email as client_email
    FROM content_items c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = ?
  `).get(contentId) as Record<string, unknown> | undefined

  if (!content) throw new Error('Content not found')

  const language = (content.language as string) || (content.client_language as string) || 'en'
  const caption = (content.caption as string) || (content.description as string) || ''

  const voiceText = caption || `Check out this amazing content from ${content.client_name}`

  const voiceResult = await generateVoiceover(voiceText, language)

  if (voiceResult.voiceUrl) {
    db.prepare('UPDATE content_items SET voice_url = ? WHERE id = ?').run(voiceResult.voiceUrl, contentId)
  }

  let finalVideoUrl = content.video_url as string | undefined
  let videoRender = null

  if (content.type === 'video' && content.video_url && voiceResult.voiceUrl) {
    videoRender = await mergeVideoWithVoice(content.video_url as string, voiceResult.voiceUrl)
    if (videoRender.outputUrl) {
      finalVideoUrl = videoRender.outputUrl.startsWith('http')
        ? videoRender.outputUrl
        : `http://localhost:${process.env.PORT || 3001}${videoRender.outputUrl}`
      db.prepare('UPDATE content_items SET video_url = ? WHERE id = ?').run(videoRender.outputUrl, contentId)
    }
  }

  const integration = db.prepare(`
    SELECT access_token FROM integrations WHERE provider = 'instagram' AND connected = 1 LIMIT 1
  `).get() as { access_token: string } | undefined

  let instagramResult
  if (content.type === 'video' && finalVideoUrl) {
    instagramResult = await postVideoToInstagram(
      finalVideoUrl,
      caption,
      integration?.access_token,
    )
  } else {
    instagramResult = await postToInstagram(
      content.image_url as string,
      caption,
      integration?.access_token,
    )
  }

  db.prepare(`
    UPDATE content_items SET status = 'published', instagram_post_id = ?, published_at = datetime('now') WHERE id = ?
  `).run(instagramResult.postId || null, contentId)

  const campaign = db.prepare(`
    INSERT INTO marketing_campaigns (client_id, content_id, platform, status, budget, impressions)
    VALUES (?, ?, 'instagram', 'active', 150, 0)
  `).run(content.client_id, contentId)

  db.prepare(`
    INSERT INTO activities (client_id, text, icon, color)
    VALUES (?, ?, 'ti-brand-instagram', '#E1306C')
  `).run(
    content.client_id,
    `Published to Instagram — ${content.title} (${instagramResult.provider})`,
  )

  db.prepare(`
    INSERT INTO activities (client_id, text, icon, color)
    VALUES (?, ?, 'ti-speakerphone', '#0F6E56')
  `).run(
    content.client_id,
    `Marketing campaign started — £150 boost for ${content.client_name}`,
  )

  const email = userEmail || (content.client_email as string)
  const name = userName || (content.client_name as string) || 'there'

  if (email) {
    await sendEmail({
      to: email,
      subject: `✅ "${content.title}" is live on Instagram`,
      html: contentApprovedEmailHtml(name, content.title as string, 'Instagram'),
      text: `Your content "${content.title}" has been approved and published to Instagram. Marketing campaign started.`,
    })
  }

  return {
    voice: voiceResult,
    video: videoRender,
    instagram: instagramResult,
    campaignId: campaign.lastInsertRowid,
  }
}
