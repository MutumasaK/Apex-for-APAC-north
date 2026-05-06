import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AI_COACH_REPORTS_TABLE,
  AI_COACH_SUBMISSIONS_TABLE,
  assertAdminToken,
  insertSupabaseRecord,
  normalizeText,
  patchSupabaseRecord,
  selectSupabaseRecords,
} from '../../../../lib/ai-coach-supabase'

type ApiResponse = {
  ok: boolean
  report?: Record<string, unknown>
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    assertAdminToken(req.headers['x-ai-coach-admin-token'])

    const payload = req.body ?? {}
    const submissionId = normalizeText(payload.submissionId)
    const summary = normalizeText(payload.summary)
    const goodPoints = normalizeText(payload.good_points || payload.goodPoints)
    const problems = normalizeText(payload.problems || payload.issues)
    const improvements = normalizeText(payload.improvements)
    const iglCalls = normalizeText(payload.igl_calls || payload.iglCalls)
    const nextChecklist = normalizeText(payload.next_checklist)
    const coachNotes = normalizeText(payload.coach_notes)
    const category = normalizeText(payload.category)
    const issueTags = Array.isArray(payload.issueTags)
      ? payload.issueTags.map(normalizeText).filter(Boolean)
      : normalizeText(payload.issueTags)
          .split(',')
          .map(normalizeText)
          .filter(Boolean)
    const priority = normalizeText(payload.priority)
    const teamActionItems = normalizeText(payload.team_action_items || payload.teamActionItems)
    const visibility = normalizeText(payload.visibility || 'customer')
    const status = normalizeText(payload.status || 'published')

    if (!submissionId || !summary) {
      return res.status(400).json({ ok: false, error: 'validation_error' })
    }

    const existingReports = await selectSupabaseRecords<{ id: string }>(
      AI_COACH_REPORTS_TABLE,
      `select=id&submission_id=eq.${encodeURIComponent(submissionId)}&limit=1`
    )

    const record = {
      submission_id: submissionId,
      summary,
      good_points: goodPoints,
      problems,
      improvements,
      igl_calls: iglCalls,
      next_checklist: nextChecklist,
      coach_notes: coachNotes,
      category,
      issue_tags: issueTags,
      priority,
      team_action_items: teamActionItems,
      visibility,
      status,
      updated_at: new Date().toISOString(),
    }

    const report = existingReports[0]?.id
      ? await patchSupabaseRecord(AI_COACH_REPORTS_TABLE, existingReports[0].id, record)
      : await insertSupabaseRecord(AI_COACH_REPORTS_TABLE, { id: crypto.randomUUID(), ...record })

    await patchSupabaseRecord(AI_COACH_SUBMISSIONS_TABLE, submissionId, {
      status: status === 'draft' ? 'feedback_draft' : 'feedback_ready',
      updated_at: new Date().toISOString(),
    })

    if (status !== 'draft') {
      try {
        await notifyFeedbackReady(req, submissionId)
      } catch (discordError) {
        console.warn('AI Coach feedback Discord notification failed', discordError)
      }
    }

    return res.status(200).json({ ok: true, report })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'internal_error'
    const statusCode = message === 'unauthorized' ? 401 : 500
    console.error('admin ai coach feedback api error', message)
    return res.status(statusCode).json({ ok: false, error: message })
  }
}

function getPublicBaseUrl(req: NextApiRequest) {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL)
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const host = normalizeText(req.headers.host)
  const proto = normalizeText(req.headers['x-forwarded-proto']) || 'http'
  return host ? `${proto}://${host}` : ''
}

async function notifyFeedbackReady(req: NextApiRequest, submissionId: string) {
  const webhookUrl = normalizeText(process.env.DISCORD_WEBHOOK_URL)

  if (!webhookUrl) {
    console.warn('AI Coach feedback Discord notification skipped: DISCORD_WEBHOOK_URL is not configured')
    return
  }

  const feedbackUrl = `${getPublicBaseUrl(req)}/ai-coach/feedback/${submissionId}`
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: ['**AI Coach feedback ready**', `Submission ID: ${submissionId}`, `Customer URL: ${feedbackUrl}`].join('\n'),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`discord_feedback_webhook_failed:${response.status}:${body}`)
  }
}
