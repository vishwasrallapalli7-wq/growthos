import 'dotenv/config'

const LANGUAGE_VOICES: Record<string, string> = {
  en: '21m00Tcm4TlvDq8ikWAM',
  es: 'EXAVITQu4vr4xnSDxMaL',
  fr: 'pNInz6obpgDQGcFmaJgB',
  de: 'VR6AewLTigWG4xSOukaG',
  hi: 'pFZP5JQG7iQjIQuC4Bku',
  ar: 'yoZ06aMxZJJ28mfd3POQ',
  pt: 'onwK4e9ZLuTAKqWW03F9',
}

export async function generateVoiceover(
  text: string,
  language = 'en',
): Promise<{ success: boolean; voiceUrl?: string; provider: string; message?: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    console.log(`[voiceover] DEV mode — would generate voice in ${language}: "${text.slice(0, 80)}..."`)
    return {
      success: true,
      provider: 'mock',
      voiceUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,
      message: 'Configure ELEVENLABS_API_KEY for real voice generation',
    }
  }

  const voiceId = LANGUAGE_VOICES[language] || LANGUAGE_VOICES.en

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(err)
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    const filename = `voice_${Date.now()}.mp3`
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'audio')
    fs.mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, filename)
    fs.writeFileSync(filePath, buffer)

    return {
      success: true,
      provider: 'elevenlabs',
      voiceUrl: `/api/media/audio/${filename}`,
    }
  } catch (err) {
    console.error('[voiceover] ElevenLabs error:', err)
    return { success: false, provider: 'elevenlabs', message: String(err) }
  }
}
