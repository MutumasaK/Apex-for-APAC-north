import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseAdminClient, normalizeText } from '../../../../lib/ai-coach-supabase'
import {
  AI_COACH_ANALYSIS_REPORTS_TABLE,
  AI_COACH_SHARE_LINKS_TABLE,
  AI_COACH_SUBMISSIONS_TABLE_V2,
  AI_COACH_TEAMS_TABLE_V2,
} from '../../../../lib/ai-coach-v2'
import type { AiCoachFeedbackPayload } from '../../../../types/ai-coach'

type ApiResponse = {
  ok: boolean
  data?: AiCoachFeedbackPayload
  error?: string
  message?: string
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(',') : value || ''
}

function getPublicBaseUrl(req: NextApiRequest) {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL).replace(/\/$/, '')
  if (configuredUrl) return configuredUrl
  const proto = getHeaderValue(req.headers['x-forwarded-proto']) || 'https'
  const host = getHeaderValue(req.headers['x-forwarded-host']) || getHeaderValue(req.headers.host)
  return host ? `${proto}://${host}` : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const reportId = normalizeText(Array.isArray(req.query.reportId) ? req.query.reportId[0] : req.query.reportId)
    const shareToken = normalizeText(Array.isArray(req.query.shareToken) ? req.query.shareToken[0] : req.query.shareToken)

    if (!reportId || !shareToken) {
      return res.status(403).json({ ok: false, error: 'forbidden', message: '共有URLを確認してください。' })
    }

    const supabase = getSupabaseAdminClient()
    const { data: shareLink, error: shareError } = await supabase
      .from(AI_COACH_SHARE_LINKS_TABLE)
      .select('id,report_id,team_id,share_token,expires_at')
      .eq('report_id', reportId)
      .eq('share_token', shareToken)
      .maybeSingle()

    if (shareError) throw shareError
    if (!shareLink?.id) {
      return res.status(403).json({ ok: false, error: 'forbidden', message: '共有URLを確認してください。' })
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at).getTime() < Date.now()) {
      return res.status(403).json({ ok: false, error: 'expired', message: 'この共有URLの有効期限が切れています。' })
    }

    const { data: report, error: reportError } = await supabase
      .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
      .select('*')
      .eq('id', reportId)
      .eq('team_id', shareLink.team_id)
      .maybeSingle()

    if (reportError) throw reportError
    if (!report?.id) {
      return res.status(404).json({ ok: false, error: 'not_found', message: '分析結果が見つかりません。' })
    }

    const { data: submission, error: submissionError } = await supabase
      .from(AI_COACH_SUBMISSIONS_TABLE_V2)
      .select('id,team_id,submitter_name,email,discord_id,rank_tier,map_name,team_comp,scene_type,focus_points,description,timestamps,share_with_teammates,status,created_at')
      .eq('id', report.submission_id)
      .eq('team_id', report.team_id)
      .maybeSingle()

    if (submissionError) throw submissionError
    if (!submission?.id) {
      return res.status(404).json({ ok: false, error: 'not_found', message: '提出内容が見つかりません。' })
    }

    const { data: team, error: teamError } = await supabase
      .from(AI_COACH_TEAMS_TABLE_V2)
      .select('id,name,team_name,plan')
      .eq('id', report.team_id)
      .maybeSingle()

    if (teamError) throw teamError

    const shareUrl = `${getPublicBaseUrl(req)}/feedback/${encodeURIComponent(reportId)}?shareToken=${encodeURIComponent(shareToken)}`

    return res.status(200).json({
      ok: true,
      data: {
        report,
        submission,
        team: team || { id: report.team_id },
        shareUrl,
      },
    })
  } catch (error) {
    console.error('ai-coach feedback v2 api error', error)
    return res.status(500).json({ ok: false, error: 'internal_error', message: '分析結果を読み込めませんでした。時間をおいて再度お試しください。' })
  }
}
