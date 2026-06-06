import 'dotenv/config'

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; provider: string; message?: string }> {
  const resendKey = process.env.RESEND_API_KEY
  const smtpHost = process.env.SMTP_HOST

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'GrowthOS <onboarding@growthos.app>',
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Resend API error')
      return { success: true, provider: 'resend', message: data.id }
    } catch (err) {
      console.error('[email] Resend failed:', err)
      return { success: false, provider: 'resend', message: String(err) }
    }
  }

  if (smtpHost) {
    try {
      const nodemailer = await import('nodemailer')
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'GrowthOS <noreply@growthos.app>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      })
      return { success: true, provider: 'smtp', message: info.messageId }
    } catch (err) {
      console.error('[email] SMTP failed:', err)
      return { success: false, provider: 'smtp', message: String(err) }
    }
  }

  console.log('\n📧 [DEV EMAIL — no API keys configured]\n')
  console.log(`To: ${payload.to}`)
  console.log(`Subject: ${payload.subject}`)
  console.log(`Body: ${payload.text || payload.html.slice(0, 200)}...\n`)
  return { success: true, provider: 'console', message: 'Logged to console (configure RESEND_API_KEY or SMTP)' }
}

export function welcomeEmailHtml(name: string, business: string, phase: number) {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #002233; color: #fff; padding: 40px; border-radius: 16px;">
      <h1 style="font-family: Georgia, serif; color: #0F6E56; margin: 0 0 8px;">GrowthOS®</h1>
      <p style="color: rgba(255,255,255,0.6); margin: 0 0 32px;">Your business. On autopilot.</p>
      <h2 style="font-weight: 400; font-family: Georgia, serif;">Welcome, ${name}!</h2>
      <p style="color: rgba(255,255,255,0.8); line-height: 1.6;">
        Your 14-day free trial for <strong>${business}</strong> (Phase ${phase}) has started.
        Alex and the team are already preparing your first designs.
      </p>
      <div style="background: rgba(15,110,86,0.2); border: 1px solid #0F6E56; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px;">✅ Login details enclosed</p>
        <p style="margin: 0 0 8px;">⏱ Website live within 5 working days</p>
        <p style="margin: 0;">📞 Account manager calls within 24 hours</p>
      </div>
      <p style="color: rgba(255,255,255,0.5); font-size: 13px;">Swipe to approve your designs in the Content Studio.</p>
    </div>
  `
}

export function contentApprovedEmailHtml(name: string, title: string, platform: string) {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; background: #002233; color: #fff; padding: 40px; border-radius: 16px;">
      <h2 style="font-family: Georgia, serif; color: #0F6E56;">Content approved & published 🎉</h2>
      <p>Hi ${name},</p>
      <p>Your content <strong>"${title}"</strong> has been approved and is now live on <strong>${platform}</strong>.</p>
      <p>We've also started a marketing campaign to promote your brand.</p>
      <p style="color: rgba(255,255,255,0.5); font-size: 13px;">— The GrowthOS Team</p>
    </div>
  `
}
