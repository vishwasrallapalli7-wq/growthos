import 'dotenv/config'

interface InstagramPostResult {
  success: boolean
  postId?: string
  provider: string
  message?: string
}

export async function postToInstagram(
  imageUrl: string,
  caption: string,
  accessToken?: string,
): Promise<InstagramPostResult> {
  const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!token || !accountId) {
    console.log(`[instagram] DEV mode — would post: "${caption.slice(0, 60)}..."`)
    const mockId = `ig_mock_${Date.now()}`
    return {
      success: true,
      postId: mockId,
      provider: 'mock',
      message: 'Configure INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID for real posting',
    }
  }

  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: token,
        }),
      },
    )
    const container = await containerRes.json()
    if (!container.id) throw new Error(container.error?.message || 'Failed to create media container')

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: token,
        }),
      },
    )
    const published = await publishRes.json()
    if (!published.id) throw new Error(published.error?.message || 'Failed to publish')

    return { success: true, postId: published.id, provider: 'instagram' }
  } catch (err) {
    console.error('[instagram] API error:', err)
    return { success: false, provider: 'instagram', message: String(err) }
  }
}

export async function postVideoToInstagram(
  videoUrl: string,
  caption: string,
  accessToken?: string,
): Promise<InstagramPostResult> {
  const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!token || !accountId) {
    const mockId = `ig_reel_mock_${Date.now()}`
    console.log(`[instagram] DEV mode — would post reel: "${caption.slice(0, 60)}..."`)
    return { success: true, postId: mockId, provider: 'mock', message: 'Mock reel posted' }
  }

  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption,
          access_token: token,
        }),
      },
    )
    const container = await containerRes.json()
    if (!container.id) throw new Error(container.error?.message || 'Failed to create reel container')

    await new Promise((r) => setTimeout(r, 5000))

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: token,
        }),
      },
    )
    const published = await publishRes.json()
    if (!published.id) throw new Error(published.error?.message || 'Failed to publish reel')

    return { success: true, postId: published.id, provider: 'instagram' }
  } catch (err) {
    console.error('[instagram] Reel error:', err)
    return { success: false, provider: 'instagram', message: String(err) }
  }
}
