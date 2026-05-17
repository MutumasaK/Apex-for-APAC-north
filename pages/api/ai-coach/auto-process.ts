import type { NextApiRequest, NextApiResponse } from 'next'
import { assertAdminToken } from '../../../lib/ai-coach-supabase'
import { processPendingSubmissions, processSubmission } from '../../../lib/ai-coach-auto'

// Legacy endpoint for the pre-v2 AI Coach pipeline.
// GitHub Actions and new UI should call /api/ai-coach/analyze instead.

type ApiResponse = {
  ok: boolean
  results?: unknown
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])

    if (req.method === 'GET') {
      const results = await processPendingSubmissions(20)
      return res.status(200).json({ ok: true, results })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const submissionId = typeof body.submissionId === 'string' ? body.submissionId : ''
      if (!submissionId) {
        return res.status(400).json({ ok: false, error: 'submission_id_required' })
      }

      const result = await processSubmission(submissionId)
      return res.status(200).json({ ok: true, results: result })
    }

    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  } catch (error) {
    console.error('ai coach auto process error', error)
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
