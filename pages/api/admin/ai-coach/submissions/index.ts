import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AI_COACH_SUBMISSIONS_TABLE,
  assertAdminToken,
  normalizeText,
  selectSupabaseRecords,
} from '../../../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  submissions?: Record<string, unknown>[]
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])
    const status = normalizeText(req.query.status)
    const statusFilter = status ? `&status=eq.${encodeURIComponent(status)}` : ''
    const submissions = await selectSupabaseRecords(
      AI_COACH_SUBMISSIONS_TABLE,
      `select=id,team_id,team_name,plan_name,user_name,discord_id,email,rank_tier,map_name,team_comp,scene_type,focus_points,description,status,video_path,video_url,submission_type,source_platform,original_filename,mime_type,file_size_bytes,created_at,updated_at&order=created_at.desc&limit=50${statusFilter}`
    )

    return res.status(200).json({ ok: true, submissions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    const statusCode = message === 'unauthorized' ? 401 : 500
    console.error('admin ai coach submissions api error', message)
    return res.status(statusCode).json({ ok: false, error: message })
  }
}
