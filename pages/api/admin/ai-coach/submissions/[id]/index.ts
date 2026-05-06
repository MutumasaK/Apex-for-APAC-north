import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AI_COACH_REPORTS_TABLE,
  AI_COACH_SUBMISSIONS_TABLE,
  assertAdminToken,
  normalizeText,
  selectSupabaseRecords,
} from '../../../../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  submission?: Record<string, unknown>
  report?: Record<string, unknown> | null
  feedbackLoadFailed?: boolean
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])
    const id = normalizeText(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id)

    if (!id) {
      return res.status(400).json({ ok: false, error: 'missing_id' })
    }

    const submissions = await selectSupabaseRecords(
      AI_COACH_SUBMISSIONS_TABLE,
      `select=id,team_id,team_name,user_name,discord_id,email,rank_tier,map_name,team_comp,scene_type,focus_points,description,status,video_path,video_url,submission_type,source_platform,target_timestamps,ai_video_notes,ai_video_notes_status,ai_video_notes_generated_at,admin_video_memo,original_filename,mime_type,file_size_bytes,created_at,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`
    )

    if (!submissions.length) {
      return res.status(404).json({ ok: false, error: 'not_found' })
    }

    let report: Record<string, unknown> | null = null
    let feedbackLoadFailed = false

    try {
      const reports = await selectSupabaseRecords(
        AI_COACH_REPORTS_TABLE,
        `select=id,submission_id,summary,good_points,problems,improvements,igl_calls,next_checklist,coach_notes,category,issue_tags,priority,team_action_items,visibility,status,created_at,updated_at&submission_id=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=1`
      )
      report = reports[0] || null
    } catch (feedbackError) {
      feedbackLoadFailed = true
      console.error('admin ai coach feedback report load failed', feedbackError)
    }

    return res.status(200).json({ ok: true, submission: submissions[0], report, feedbackLoadFailed })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    const statusCode = message === 'unauthorized' ? 401 : 500
    console.error('admin ai coach submission detail api error', message)
    return res.status(statusCode).json({ ok: false, error: message })
  }
}
