import type { NextApiRequest, NextApiResponse } from 'next'
import { assertAdminToken, normalizeText } from '../../../lib/ai-coach-supabase'
import { analyzeSubmission, processPendingAnalysis } from '../../../lib/ai-coach-v2'

type ApiResponse = {
  ok: boolean
  result?: unknown
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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])

    if (req.method === 'GET') {
      const limit = Math.max(1, Math.min(20, Number(req.query.limit || 10)))
      const result = await processPendingAnalysis(limit, getPublicBaseUrl(req))
      return res.status(200).json({ ok: true, result })
    }

    const submissionId = normalizeText(req.body?.submissionId || req.body?.submission_id)
    if (!submissionId) {
      return res.status(400).json({
        ok: false,
        error: 'submission_id_required',
        message: '提出IDを指定してください。',
      })
    }

    const result = await analyzeSubmission(submissionId, getPublicBaseUrl(req))
    return res.status(200).json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const statusCode = message === 'unauthorized' ? 401 : 500
    console.error('ai coach analyze api error', message)
    return res.status(statusCode).json({
      ok: false,
      error: statusCode === 401 ? 'unauthorized' : 'analysis_failed',
      message: '分析を実行できませんでした。設定と残高を確認してください。',
    })
  }
}
