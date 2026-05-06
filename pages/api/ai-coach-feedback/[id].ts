import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AI_COACH_REPORTS_TABLE,
  AI_COACH_SUBMISSIONS_TABLE,
  normalizeText,
  selectSupabaseRecords,
} from '../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  submission?: Record<string, unknown>
  report?: Record<string, unknown> | null
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const id = normalizeText(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id)

    if (!id) {
      return res.status(400).json({ ok: false, error: 'missing_id' })
    }

    const submissions = await selectSupabaseRecords(
      AI_COACH_SUBMISSIONS_TABLE,
      `select=id,team_id,team_name,user_name,rank_tier,map_name,team_comp,scene_type,focus_points,description,status,created_at&order=created_at.desc&id=eq.${encodeURIComponent(id)}&limit=1`
    )

    if (!submissions.length) {
      return res.status(404).json({ ok: false, error: 'not_found' })
    }

    const reports = await selectSupabaseRecords(
      AI_COACH_REPORTS_TABLE,
      `select=id,submission_id,summary,good_points,problems,improvements,igl_calls,next_checklist,coach_notes,category,issue_tags,priority,team_action_items,visibility,status,created_at,updated_at&submission_id=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=1`
    )

    return res.status(200).json({ ok: true, submission: submissions[0], report: reports[0] || null })
  } catch (error) {
    console.error('ai-coach-feedback api error', error)
    return res.status(500).json({ ok: false, error: 'internal_error' })
  }
}
