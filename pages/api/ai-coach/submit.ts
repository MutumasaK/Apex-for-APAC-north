import type { NextApiRequest, NextApiResponse } from 'next'
import { analyzeSubmission, createSubmission, getFeedbackUrl, validateSubmissionPayload } from '../../../lib/ai-coach-v2'
import { normalizeText } from '../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  submission_id?: string
  report_id?: string
  feedback_url?: string
  share_token?: string
  message?: string
  error?: string
  analysis?: unknown
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

function publicMessageForError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('relation') || message.includes('schema')) return '保存先の準備がまだ完了していません。管理者に連絡してください。'
  return '提出の保存に失敗しました。時間をおいてもう一度お試しください。'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const payload = typeof req.body === 'object' && req.body ? req.body : {}
    const validation = validateSubmissionPayload(payload)
    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: 'validation_error', message: validation.message })
    }

    const created = await createSubmission(validation.input)
    const feedbackUrl = getFeedbackUrl(created.report.id, created.shareLink.share_token, getPublicBaseUrl(req))

    let analysis: unknown = { processed: false, reason: 'not_started' }
    try {
      analysis = await analyzeSubmission(created.submission.id, getPublicBaseUrl(req))
    } catch (analysisError) {
      console.warn('AI Coach analysis deferred or failed', analysisError)
      analysis = { processed: false, reason: 'analysis_deferred' }
    }

    return res.status(201).json({
      ok: true,
      submission_id: created.submission.id,
      report_id: created.report.id,
      feedback_url: feedbackUrl,
      share_token: created.shareLink.share_token,
      analysis,
      message: '提出を受け付けました。分析結果ページを準備しています。',
    })
  } catch (error) {
    console.error('ai-coach submit api error', error)
    return res.status(500).json({ ok: false, error: 'internal_error', message: publicMessageForError(error) })
  }
}
