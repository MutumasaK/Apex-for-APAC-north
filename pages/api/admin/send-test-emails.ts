import type { NextApiRequest, NextApiResponse } from 'next'
import { assertAdminToken, getSupabaseAdminClient, AI_COACH_SUBMISSIONS_TABLE } from '../../../lib/ai-coach-supabase'
import { sendEmail } from '../../../lib/ai-coach-auto'

type ApiResponse = { ok: boolean; results?: unknown; error?: string }

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])

    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method_not_allowed' })
    }

    const body = req.body || {}
    const submissionIds = Array.isArray(body.submissionIds) ? body.submissionIds : []
    if (!submissionIds.length) {
      return res.status(400).json({ ok: false, error: 'submission_ids_required' })
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { data: rows, error: selectError } = await supabaseAdmin
      .from(AI_COACH_SUBMISSIONS_TABLE)
      .select('id,email,team_name')
      .in('id', submissionIds)

    if (selectError) {
      console.error('bulk_select_failed', selectError)
      throw new Error('bulk_select_failed')
    }

    const sendPromises = (rows || []).map(async (r: any) => {
      const to = String(r.email || '')
      if (!to) return { id: r.id, ok: false, error: 'no_email' }

      try {
        const subject = 'AI Coach テストメール'
        const text = `これはテストメールです。提出ID: ${r.id}`
        const html = `<p>これはテストメールです。</p><p>提出ID: ${r.id}</p>`
        await sendEmail(to, subject, text, html)
        return { id: r.id, ok: true }
      } catch (err) {
        return { id: r.id, ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })

    const results = await Promise.all(sendPromises)

    return res.status(200).json({ ok: true, results })
  } catch (error) {
    console.error('bulk send-test-emails error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
