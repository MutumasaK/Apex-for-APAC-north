import { getSupabaseAdminClient, isValidEmail, normalizeText } from './ai-coach-supabase'
import type { AiCoachSubmissionInput } from '../types/ai-coach'

export const AI_COACH_USERS_TABLE = 'ai_coach_users'
export const AI_COACH_TEAMS_TABLE_V2 = 'ai_coach_teams'
export const AI_COACH_TEAM_MEMBERS_TABLE = 'ai_coach_team_members'
export const AI_COACH_SUBMISSIONS_TABLE_V2 = 'ai_coach_submissions'
export const AI_COACH_ANALYSIS_REPORTS_TABLE = 'ai_coach_analysis_reports'
export const AI_COACH_SHARE_LINKS_TABLE = 'ai_coach_feedback_share_links'
export const AI_COACH_NOTIFICATIONS_TABLE = 'ai_coach_notifications'

export type AiCoachValidationResult =
  | { ok: true; input: AiCoachSubmissionInput }
  | { ok: false; message: string }

function getSiteUrl() {
  return normalizeText(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL).replace(/\/$/, '')
}

export function getFeedbackUrl(reportId: string, shareToken: string, fallbackBaseUrl = '') {
  const baseUrl = getSiteUrl() || fallbackBaseUrl.replace(/\/$/, '')
  const path = `/feedback/${encodeURIComponent(reportId)}?shareToken=${encodeURIComponent(shareToken)}`
  return baseUrl ? `${baseUrl}${path}` : path
}

export function validateSubmissionPayload(payload: Record<string, unknown>): AiCoachValidationResult {
  const input: AiCoachSubmissionInput = {
    teamName: normalizeText(payload.teamName || payload.team_name),
    submitterName: normalizeText(payload.submitterName || payload.submitter_name || payload.userName),
    email: normalizeText(payload.email).toLowerCase(),
    discordId: normalizeText(payload.discordId || payload.discord_id) || undefined,
    rankTier: normalizeText(payload.rankTier || payload.rank_tier),
    mapName: normalizeText(payload.mapName || payload.map_name),
    teamComp: normalizeText(payload.teamComp || payload.team_comp),
    sceneType: normalizeText(payload.sceneType || payload.scene_type),
    focusPoints: normalizeText(payload.focusPoints || payload.focus_points),
    description: normalizeText(payload.description),
    timestamps: normalizeText(payload.timestamps || payload.targetTimestamps || payload.target_timestamps),
    videoUrl: normalizeText(payload.videoUrl || payload.video_url) || undefined,
    videoFileUrl: normalizeText(payload.videoFileUrl || payload.video_file_url) || undefined,
    shareWithTeammates:
      payload.shareWithTeammates === false ||
      payload.shareWithTeammates === 'false' ||
      payload.share_with_teammates === false ||
      payload.share_with_teammates === 'false'
        ? false
        : true,
  }

  if (!input.teamName) return { ok: false, message: 'チーム名を入力してください。' }
  if (!input.submitterName) return { ok: false, message: '提出者名を入力してください。' }
  if (!input.email || !isValidEmail(input.email)) return { ok: false, message: '連絡用メールアドレスを正しく入力してください。' }
  if (!input.rankTier) return { ok: false, message: 'ランク帯を選択してください。' }
  if (!input.mapName) return { ok: false, message: 'マップ名を入力してください。' }
  if (!input.teamComp) return { ok: false, message: '使用構成を入力してください。' }
  if (!input.sceneType) return { ok: false, message: 'シーン種別を選択してください。' }
  if (!input.focusPoints) return { ok: false, message: '重点的に見てほしいポイントを入力してください。' }
  if (!input.description) return { ok: false, message: '補足説明を入力してください。' }
  if (!input.timestamps) return { ok: false, message: '分析対象のタイムスタンプを入力してください。' }
  if (!input.videoUrl && !input.videoFileUrl) return { ok: false, message: '動画URLまたは動画ファイルを指定してください。' }

  if (input.videoUrl) {
    try {
      new URL(input.videoUrl)
    } catch {
      return { ok: false, message: '動画URLを正しい形式で入力してください。' }
    }
  }

  return { ok: true, input }
}

function normalizeChecklist(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  const text = normalizeText(value)
  if (!text) return []
  return text.split('\n').map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
}

function createShareToken() {
  return Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex').toString('base64url')
}

async function findOrCreateUser(input: AiCoachSubmissionInput) {
  const supabase = getSupabaseAdminClient()
  const { data: existing, error: selectError } = await supabase
    .from(AI_COACH_USERS_TABLE)
    .select('id,email')
    .eq('email', input.email)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing?.id) {
    await supabase
      .from(AI_COACH_USERS_TABLE)
      .update({
        display_name: input.submitterName,
        discord_id: input.discordId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return existing as { id: string; email: string }
  }

  const { data, error } = await supabase
    .from(AI_COACH_USERS_TABLE)
    .insert({
      email: input.email,
      display_name: input.submitterName,
      discord_id: input.discordId || null,
    })
    .select('id,email')
    .single()

  if (error) throw error
  return data as { id: string; email: string }
}

async function findOrCreateTeam(teamName: string, ownerUserId: string) {
  const supabase = getSupabaseAdminClient()
  const { data: existing, error: selectError } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .select('id,name,team_name,plan,plan_name')
    .eq('name', teamName)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing?.id) return existing as { id: string; name?: string; team_name?: string }

  const { data: legacyExisting, error: legacySelectError } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .select('id,name,team_name,plan,plan_name')
    .eq('team_name', teamName)
    .maybeSingle()

  if (legacySelectError) throw legacySelectError
  if (legacyExisting?.id) return legacyExisting as { id: string; name?: string; team_name?: string }

  const { data, error } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .insert({
      name: teamName,
      team_name: teamName,
      owner_user_id: ownerUserId,
      plan: 'free',
      plan_name: 'Free',
    })
    .select('id,name,team_name')
    .single()

  if (error) throw error
  return data as { id: string; name?: string; team_name?: string }
}

async function ensureTeamMember(teamId: string, userId: string, role: 'owner' | 'member' = 'member') {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase
    .from(AI_COACH_TEAM_MEMBERS_TABLE)
    .upsert({ team_id: teamId, user_id: userId, role }, { onConflict: 'team_id,user_id' })

  if (error) throw error
}

export async function createSubmission(input: AiCoachSubmissionInput) {
  const supabase = getSupabaseAdminClient()
  const user = await findOrCreateUser(input)
  const team = await findOrCreateTeam(input.teamName, user.id)
  await ensureTeamMember(team.id, user.id, 'owner')

  const { data: submission, error: submissionError } = await supabase
    .from(AI_COACH_SUBMISSIONS_TABLE_V2)
    .insert({
      team_id: team.id,
      submitted_by_user_id: user.id,
      submitter_name: input.submitterName,
      email: input.email,
      discord_id: input.discordId || null,
      rank_tier: input.rankTier,
      map_name: input.mapName,
      team_comp: input.teamComp,
      scene_type: input.sceneType,
      focus_points: input.focusPoints,
      description: input.description,
      video_url: input.videoUrl || null,
      video_file_url: input.videoFileUrl || null,
      timestamps: input.timestamps,
      share_with_teammates: input.shareWithTeammates,
      status: 'submitted',
    })
    .select('*')
    .single()

  if (submissionError) throw submissionError

  const { data: report, error: reportError } = await supabase
    .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
    .insert({
      submission_id: submission.id,
      team_id: team.id,
      report_status: 'pending',
    })
    .select('*')
    .single()

  if (reportError) throw reportError

  const shareToken = createShareToken()
  const { data: shareLink, error: shareError } = await supabase
    .from(AI_COACH_SHARE_LINKS_TABLE)
    .insert({
      report_id: report.id,
      team_id: team.id,
      share_token: shareToken,
    })
    .select('*')
    .single()

  if (shareError) throw shareError

  await supabase.from(AI_COACH_SUBMISSIONS_TABLE_V2).update({ status: 'queued', updated_at: new Date().toISOString() }).eq('id', submission.id)

  return { user, team, submission, report, shareLink }
}

async function callOpenAiForAnalysis(submission: Record<string, unknown>, teamName: string, teamTrends: string) {
  const apiKey = normalizeText(process.env.OPENAI_API_KEY)
  if (!apiKey) return null

  const prompt = [
    'Apex Legendsのチーム向けAI Coachとして、提出情報だけを根拠に初期フィードバックを作成してください。',
    '動画本体を直接解析できていない場合は断定を避け、提出者の説明とタイムスタンプに基づく仮説として表現してください。',
    'JSONのみで返してください。キーは summary, good_points, problems, improvements, igl_call_examples, checklist, team_trends です。',
    '',
    `チーム名: ${teamName}`,
    `ランク帯: ${submission.rank_tier || '-'}`,
    `マップ: ${submission.map_name || '-'}`,
    `使用構成: ${submission.team_comp || '-'}`,
    `シーン種別: ${submission.scene_type || '-'}`,
    `重点ポイント: ${submission.focus_points || '-'}`,
    `補足説明: ${submission.description || '-'}`,
    `タイムスタンプ: ${submission.timestamps || '-'}`,
    `動画URL: ${submission.video_url || submission.video_file_url || '-'}`,
    `過去傾向: ${teamTrends || 'まだ十分な履歴はありません。'}`,
  ].join('\n')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a careful Apex Legends coach. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`openai_request_failed:${response.status}:${body.slice(0, 200)}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (!content) throw new Error('openai_response_missing_content')
  return JSON.parse(String(content)) as Record<string, unknown>
}

async function getTeamTrends(teamId: string) {
  const supabase = getSupabaseAdminClient()
  const { data } = await supabase
    .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
    .select('summary,problems,improvements,team_trends')
    .eq('team_id', teamId)
    .eq('report_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(3)

  if (!Array.isArray(data) || !data.length) return ''
  return data
    .map((item, index) => `${index + 1}. ${normalizeText(item.team_trends || item.problems || item.improvements || item.summary)}`)
    .filter(Boolean)
    .join('\n')
}

export async function sendDiscordNotification(message: string) {
  const webhookUrl = normalizeText(process.env.DISCORD_WEBHOOK_URL)
  if (!webhookUrl) return { sent: false, reason: 'discord_not_configured' }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`discord_webhook_failed:${response.status}:${body.slice(0, 200)}`)
  }

  return { sent: true }
}

export async function sendEmailNotification(to: string, subject: string, text: string) {
  const sendgridKey = normalizeText(process.env.SENDGRID_API_KEY)
  const mailtrapToken = normalizeText(process.env.MAILTRAP_API_TOKEN)
  const fromEmail = normalizeText(process.env.MAIL_FROM || process.env.EMAIL_FROM || 'no-reply@example.com')
  const fromName = normalizeText(process.env.EMAIL_FROM_NAME || 'Apex AI Coach')

  if (sendgridKey) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: fromEmail, name: fromName },
        content: [{ type: 'text/plain', value: text }],
      }),
    })
    if (!response.ok) throw new Error(`sendgrid_request_failed:${response.status}`)
    return { sent: true, provider: 'sendgrid' }
  }

  if (mailtrapToken) {
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mailtrapToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: fromEmail, name: fromName },
        content: [{ type: 'text/plain', value: text }],
      }),
    })
    if (!response.ok) throw new Error(`mailtrap_request_failed:${response.status}`)
    return { sent: true, provider: 'mailtrap' }
  }

  return { sent: false, reason: 'email_not_configured' }
}

async function recordNotification(
  reportId: string,
  teamId: string,
  channel: 'discord' | 'email',
  destination: string,
  status: 'sent' | 'skipped' | 'failed',
  errorMessage?: string
) {
  const supabase = getSupabaseAdminClient()
  await supabase.from(AI_COACH_NOTIFICATIONS_TABLE).insert({
    report_id: reportId,
    team_id: teamId,
    notification_type: 'feedback_ready',
    channel,
    destination,
    status,
    error_message: errorMessage || null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })
}

export async function notifyFeedbackReady(params: {
  reportId: string
  teamId: string
  teamName: string
  mapName: string
  sceneType: string
  email: string
  discordId?: string | null
  feedbackUrl: string
}) {
  const message = [
    'AI Coachの分析が完了しました。',
    '',
    `チーム: ${params.teamName}`,
    `マップ: ${params.mapName}`,
    `シーン: ${params.sceneType}`,
    '',
    'フィードバックはこちら:',
    params.feedbackUrl,
    '',
    '※このURLはチーム内共有用です。第三者への共有は控えてください。',
  ].join('\n')

  if (normalizeText(process.env.DISCORD_WEBHOOK_URL)) {
    const destination = params.discordId || 'discord_webhook'
    try {
      await sendDiscordNotification(message)
      await recordNotification(params.reportId, params.teamId, 'discord', destination, 'sent')
      return
    } catch (error) {
      await recordNotification(params.reportId, params.teamId, 'discord', destination, 'failed', error instanceof Error ? error.message : String(error))
    }
  }

  const emailResult = await sendEmailNotification(params.email, 'AI Coachの分析が完了しました', message)
  await recordNotification(
    params.reportId,
    params.teamId,
    'email',
    params.email,
    emailResult.sent ? 'sent' : 'skipped',
    emailResult.sent ? undefined : emailResult.reason
  )
}

export async function analyzeSubmission(submissionId: string, fallbackBaseUrl = '') {
  const supabase = getSupabaseAdminClient()
  const { data: submission, error: submissionError } = await supabase
    .from(AI_COACH_SUBMISSIONS_TABLE_V2)
    .select('*')
    .eq('id', submissionId)
    .maybeSingle()

  if (submissionError) throw submissionError
  if (!submission) throw new Error('submission_not_found')

  const { data: report, error: reportError } = await supabase
    .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
    .select('*')
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (reportError) throw reportError
  if (!report) throw new Error('report_not_found')

  const { data: shareLink, error: shareError } = await supabase
    .from(AI_COACH_SHARE_LINKS_TABLE)
    .select('*')
    .eq('report_id', report.id)
    .maybeSingle()

  if (shareError) throw shareError
  const feedbackUrl = getFeedbackUrl(report.id, normalizeText(shareLink?.share_token), fallbackBaseUrl)

  const { data: team } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .select('id,name,team_name')
    .eq('id', submission.team_id)
    .maybeSingle()

  if (!process.env.OPENAI_API_KEY) {
    await supabase
      .from(AI_COACH_SUBMISSIONS_TABLE_V2)
      .update({ status: 'queued', updated_at: new Date().toISOString() })
      .eq('id', submissionId)
    return { processed: false, reason: 'openai_not_configured', reportId: report.id, feedbackUrl }
  }

  await supabase
    .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
    .update({ report_status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', report.id)

  try {
    const teamName = normalizeText(team?.name || team?.team_name) || '未設定チーム'
    const teamTrends = await getTeamTrends(normalizeText(submission.team_id))
    const parsed = await callOpenAiForAnalysis(submission, teamName, teamTrends)
    if (!parsed) throw new Error('openai_not_configured')

    await supabase
      .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
      .update({
        report_status: 'completed',
        summary: normalizeText(parsed.summary),
        good_points: normalizeText(parsed.good_points),
        problems: normalizeText(parsed.problems),
        improvements: normalizeText(parsed.improvements),
        igl_call_examples: normalizeText(parsed.igl_call_examples),
        checklist: normalizeChecklist(parsed.checklist),
        team_trends: normalizeText(parsed.team_trends),
        raw_ai_response: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id)

    await supabase
      .from(AI_COACH_SUBMISSIONS_TABLE_V2)
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', submissionId)

    await notifyFeedbackReady({
      reportId: report.id,
      teamId: normalizeText(submission.team_id),
      teamName,
      mapName: normalizeText(submission.map_name),
      sceneType: normalizeText(submission.scene_type),
      email: normalizeText(submission.email),
      discordId: normalizeText(submission.discord_id),
      feedbackUrl,
    })

    return { processed: true, reportId: report.id, feedbackUrl }
  } catch (error) {
    await supabase
      .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
      .update({
        report_status: 'failed',
        raw_ai_response: { error: error instanceof Error ? error.message : String(error) },
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.id)
    await supabase
      .from(AI_COACH_SUBMISSIONS_TABLE_V2)
      .update({ status: 'analysis_failed', updated_at: new Date().toISOString() })
      .eq('id', submissionId)
    throw error
  }
}

export async function processPendingAnalysis(limit = 10, fallbackBaseUrl = '') {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from(AI_COACH_SUBMISSIONS_TABLE_V2)
    .select('id')
    .in('status', ['queued', 'analysis_failed'])
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  const results: unknown[] = []
  if (!Array.isArray(data)) return results

  for (const row of data) {
    const submissionId = normalizeText(row?.id)
    if (!submissionId) continue
    try {
      results.push(await analyzeSubmission(submissionId, fallbackBaseUrl))
    } catch (error) {
      results.push({
        submissionId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}
