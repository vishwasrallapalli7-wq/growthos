import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VIDEO_DIR = path.join(__dirname, '..', '..', 'data', 'videos')
fs.mkdirSync(VIDEO_DIR, { recursive: true })

function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'])
    proc.on('error', () => resolve(false))
    proc.on('close', (code) => resolve(code === 0))
  })
}

async function downloadFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
}

export async function mergeVideoWithVoice(
  videoUrl: string,
  voiceUrl: string,
): Promise<{ success: boolean; outputUrl?: string; provider: string; message?: string }> {
  const id = `render_${Date.now()}`
  const videoPath = path.join(VIDEO_DIR, `${id}_video.mp4`)
  const audioPath = path.join(VIDEO_DIR, `${id}_audio.mp3`)
  const outputPath = path.join(VIDEO_DIR, `${id}_final.mp4`)

  try {
    const voiceFull = voiceUrl.startsWith('http')
      ? voiceUrl
      : `http://localhost:${process.env.PORT || 3001}${voiceUrl}`

    await downloadFile(videoUrl, videoPath)

    if (voiceUrl.startsWith('/api/media/audio/')) {
      const localAudio = path.join(__dirname, '..', '..', 'data', 'audio', path.basename(voiceUrl))
      if (fs.existsSync(localAudio)) fs.copyFileSync(localAudio, audioPath)
      else await downloadFile(voiceFull, audioPath)
    } else {
      await downloadFile(voiceFull, audioPath)
    }

    const hasFfmpeg = await ffmpegAvailable()

    if (!hasFfmpeg) {
      console.log('[video] FFmpeg not installed — using original video with separate voice track')
      return {
        success: true,
        outputUrl: videoUrl,
        provider: 'fallback',
        message: 'Install FFmpeg for merged video output',
      }
    }

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-y', '-i', videoPath, '-i', audioPath,
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
        '-map', '0:v:0', '-map', '1:a:0',
        '-shortest', outputPath,
      ]
      const proc = spawn('ffmpeg', args)
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`))))
      proc.on('error', reject)
    })

    return {
      success: true,
      outputUrl: `/api/media/videos/${path.basename(outputPath)}`,
      provider: 'ffmpeg',
    }
  } catch (err) {
    console.error('[video] Render error:', err)
    return { success: false, provider: 'ffmpeg', message: String(err), outputUrl: videoUrl }
  }
}
