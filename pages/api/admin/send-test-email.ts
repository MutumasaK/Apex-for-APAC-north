import type { NextApiRequest, NextApiResponse } from 'next'
import { assertAdminToken } from '../../../lib/ai-coach-supabase'
import { sendEmail } from '../../../lib/ai-coach-auto'

type ApiResponse = { ok: boolean; error?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' })
    }

    const body = req.body || {}
    const to = typeof body.to === 'string' ? body.to : String(process.env.DEV_TEST_EMAIL || '')
    if (!to) {
      return res.status(400).json({ ok: false, error: 'recipient_required' })
    }

    const subject = typeof body.subject === 'string' ? body.subject : 'AI Coach テストメール'
    const text = typeof body.text === 'string' ? body.text : `This is a test email sent from the Apex Dashboard. From: ${process.env.EMAIL_FROM || 'no-reply@example.com'}`
    const html = typeof body.html === 'string' ? body.html : `<p>This is a test email sent from the Apex Dashboard.</p><p>From: ${process.env.EMAIL_FROM_NAME || 'Apex AI Coach'} &lt;${process.env.EMAIL_FROM || 'no-reply@example.com'}&gt;</p>`

    await sendEmail(to, subject, text, html)

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('send-test-email error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
