import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AI_COACH_SUBMISSIONS_TABLE,
  AI_COACH_VIDEO_BUCKET,
  assertAdminToken,
  getSupabaseAdminClient,
  normalizeText,
  selectSupabaseRecords,
} from '../../../../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  signedUrl?: string
  expiresIn?: number
  error?: string
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

    const submissions = await selectSupabaseRecords<{ video_path?: string }>(
      AI_COACH_SUBMISSIONS_TABLE,
      `select=video_path&id=eq.${encodeURIComponent(id)}&limit=1`
    )
    const submission = submissions[0]
    const videoPath = normalizeText(submission?.video_path)

    if (!videoPath) {
      return res.status(404).json({ ok: false, error: 'not_found' })
    }

    const expiresIn = 60 * 15
    const supabaseAdmin = getSupabaseAdminClient()
    const { data, error } = await supabaseAdmin.storage.from(AI_COACH_VIDEO_BUCKET).createSignedUrl(videoPath, expiresIn)

    if (error) {
      throw new Error(`signed_url_failed:${error.message}`)
    }

    const signedUrl = normalizeText(data?.signedUrl)

    return res.status(200).json({ ok: true, signedUrl, expiresIn })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    const statusCode = message === 'unauthorized' ? 401 : 500
    console.error('admin ai coach signed url api error', message)
    return res.status(statusCode).json({ ok: false, error: message })
  }
}
