import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AI_COACH_SUBMISSIONS_TABLE,
  assertAdminToken,
  normalizeText,
  patchSupabaseRecord,
  selectSupabaseRecords,
} from '../../../../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  submission?: Record<string, unknown>
  error?: string
  message?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])
    const id = normalizeText(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id)

    if (!id) {
      return res.status(400).json({ ok: false, error: 'missing_id' })
    }

    const submissions = await selectSupabaseRecords<{ submission_type?: string }>(
      AI_COACH_SUBMISSIONS_TABLE,
      `select=submission_type&id=eq.${encodeURIComponent(id)}&limit=1`
    )
    const submission = submissions[0]

    if (!submission) {
      return res.status(404).json({ ok: false, error: 'not_found' })
    }

    const submissionType = normalizeText(submission.submission_type)
    const targetTimestamps = normalizeText(req.body?.target_timestamps ?? req.body?.targetTimestamps)
    const adminVideoMemo = normalizeText(req.body?.admin_video_memo ?? req.body?.adminVideoMemo)
    const aiVideoNotes = normalizeText(req.body?.ai_video_notes ?? req.body?.aiVideoNotes)

    if (submissionType === 'url' && !targetTimestamps) {
      return res.status(400).json({
        ok: false,
        error: 'missing_target_timestamps',
        message: 'URL提出の場合は、分析してほしい時間帯 / タイムスタンプを入力してください。',
      })
    }

    const record: Record<string, unknown> = {
      target_timestamps: targetTimestamps || null,
      admin_video_memo: adminVideoMemo || null,
      updated_at: new Date().toISOString(),
    }

    if (submissionType === 'file') {
      record.ai_video_notes = aiVideoNotes || null
      record.ai_video_notes_status = aiVideoNotes ? 'completed' : 'not_started'
      record.ai_video_notes_generated_at = aiVideoNotes ? new Date().toISOString() : null
    }

    const updated = await patchSupabaseRecord(AI_COACH_SUBMISSIONS_TABLE, id, record)

    return res.status(200).json({ ok: true, submission: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    const statusCode = message === 'unauthorized' ? 401 : 500
    console.error('admin ai coach submission notes api error', message)
    return res.status(statusCode).json({ ok: false, error: message })
  }
}
