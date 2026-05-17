import { getSupabaseAdminClient, AI_COACH_SUBMISSIONS_TABLE, AI_COACH_REPORTS_TABLE, AI_COACH_TEAMS_TABLE, insertSupabaseRecord, patchSupabaseRecord } from './ai-coach-supabase'

export const AI_COACH_PLAN_QUOTAS: Record<string, number> = {
  Free: 0,
  Lite: 3,
  Player: 10,
}

export type AiCoachPlanName = keyof typeof AI_COACH_PLAN_QUOTAS

export function normalizePlanName(value: unknown): AiCoachPlanName {
  const normalized = String(value ?? '').trim()
  if (normalized === 'Lite') return 'Lite'
  if (normalized === 'Player') return 'Player'
  return 'Free'
}

function getPlanQuota(planName: AiCoachPlanName) {
  return AI_COACH_PLAN_QUOTAS[planName] ?? 0
}

function buildPlanInstructions(planName: AiCoachPlanName) {
  if (planName === 'Lite') {
    return 'この提出はLiteプランです。月3回までの分析枠を想定し、簡潔で実用的な改善提案を優先してください。必要に応じて行動しやすい3〜5項目に絞ってください。'
  }

  if (planName === 'Player') {
    return 'この提出はPlayerプランです。月10回までの分析枠を想定し、やや詳細な改善提案を含めつつ、実行しやすいアクションプランを示してください。'
  }

  return 'この提出はFreeプランです。自動分析枠を持たないため、まずはプランアップグレードを検討してください。'
}

function buildFeedbackPrompt(submission: Record<string, unknown>) {
  const planName = normalizePlanName(submission.plan_name)
  const submissionType = String(submission.submission_type || 'file')
  const videoTypeNote = submissionType === 'url'
    ? 'この提出はURL提出です。動画本体は自動解析できないため、説明文とタイムスタンプを中心に分析してください。'
    : 'この提出はアップロード動画です。可能な範囲で管理者メモおよびタイムスタンプを参考に、映像の観点を含めて分析してください。'

  return `Apex LegendsのAIコーチとして、以下の提出内容をもとにフィードバックを作成してください。

【プラン】
${planName}

${buildPlanInstructions(planName)}

【提出ID】
${String(submission.id || '-')}

【チーム名】
${String(submission.team_name || '-')}

【提出者】
${String(submission.user_name || '-')}

【Discord】
${String(submission.discord_id || '-')}

【メール】
${String(submission.email || '-')}

【ランク帯】
${String(submission.rank_tier || '-')}

【マップ】
${String(submission.map_name || '-')}

【構成】
${String(submission.team_comp || '-')}

【シーン】
${String(submission.scene_type || '-')}

【重点ポイント】
${String(submission.focus_points || '-')}

【説明】
${String(submission.description || '-')}

【分析対象タイムスタンプ】
${String(submission.target_timestamps || '指定なし')}

【管理者メモ】
${String(submission.admin_video_memo || 'なし')}

${videoTypeNote}

【出力形式】
JSON形式で出力してください。キーは以下のとおりです。
summary, good_points, problems, improvements, igl_calls, next_checklist, coach_notes, team_action_items, category, issue_tags, priority

出力は必ず有効なJSONオブジェクトのみとしてください。
`
}

async function callOpenAi(prompt: string) {
  const apiKey = String(process.env.OPENAI_API_KEY || '')
  if (!apiKey) {
    throw new Error('openai_api_key_not_configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたはApex Legendsの専門AIコーチです。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`openai_request_failed:${response.status}:${body}`)
  }

  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('openai_response_missing_content')
  }

  return String(content)
}

function extractJsonFromText(text: string) {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('failed_to_extract_json')
  }

  const jsonText = text.slice(first, last + 1)
  return JSON.parse(jsonText)
}

export async function sendEmail(to: string, subject: string, text: string, html: string) {
  const sendgridKey = String(process.env.SENDGRID_API_KEY || '')
  const mailtrapToken = String(process.env.MAILTRAP_API_TOKEN || '')
  const fromEmail = String(process.env.EMAIL_FROM || 'no-reply@example.com')
  const fromName = String(process.env.EMAIL_FROM_NAME || 'Apex AI Coach')

  // Prefer SendGrid in production when API key is provided, fall back to Mailtrap for testing.
  if (sendgridKey) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`sendgrid_request_failed:${response.status}:${body}`)
    }

    return
  }

  if (mailtrapToken) {
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mailtrapToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject,
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`mailtrap_request_failed:${response.status}:${body}`)
    }

    return
  }

  throw new Error('no_email_provider_configured')
}

function buildEmailBody(submission: Record<string, unknown>, report: Record<string, unknown>, feedbackUrl: string) {
  const subject = 'AI Coach フィードバックが完成しました'
  const summary = String(report.summary || '-')
  const category = String(report.category || '-')
  const priority = String(report.priority || '-')
  const tags = Array.isArray(report.issue_tags) ? report.issue_tags.join(', ') : String(report.issue_tags || '-')

  const text = `AI Coachのフィードバックが準備できました。

提出ID: ${String(submission.id || '-')}
チーム: ${String(submission.team_name || '-')}
マップ: ${String(submission.map_name || '-')}
カテゴリー: ${category}
優先度: ${priority}
課題タグ: ${tags}

フィードバックはこちらから確認してください:
${feedbackUrl}

---
${summary}
`

  const html = `<p>AI Coachのフィードバックが準備できました。</p>
<p><strong>提出ID:</strong> ${String(submission.id || '-')}</p>
<p><strong>チーム:</strong> ${String(submission.team_name || '-')}</p>
<p><strong>マップ:</strong> ${String(submission.map_name || '-')}</p>
<p><strong>カテゴリー:</strong> ${category}</p>
<p><strong>優先度:</strong> ${priority}</p>
<p><strong>課題タグ:</strong> ${tags}</p>
<p>フィードバックはこちらから確認してください:<br /><a href="${feedbackUrl}">${feedbackUrl}</a></p>
<hr />
<p>${summary}</p>`

  return { subject, text, html }
}

function buildFeedbackRecord(parsed: Record<string, unknown>, submissionId: string) {
  return {
    id: crypto.randomUUID(),
    submission_id: submissionId,
    summary: String(parsed.summary || ''),
    good_points: String(parsed.good_points || ''),
    problems: String(parsed.problems || ''),
    improvements: String(parsed.improvements || ''),
    igl_calls: String(parsed.igl_calls || ''),
    next_checklist: String(parsed.next_checklist || ''),
    coach_notes: String(parsed.coach_notes || ''),
    category: String(parsed.category || ''),
    issue_tags: Array.isArray(parsed.issue_tags)
      ? parsed.issue_tags.map(String)
      : String(parsed.issue_tags || '').split(',').map((item) => item.trim()).filter(Boolean),
    priority: String(parsed.priority || ''),
    team_action_items: String(parsed.team_action_items || ''),
    visibility: 'customer',
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function countMonthlyFeedbackForTeam(teamId: string) {
  const supabaseAdmin = getSupabaseAdminClient()
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const { data, error, count } = await supabaseAdmin
    .from(AI_COACH_SUBMISSIONS_TABLE)
    .select('id', { count: 'exact', head: false })
    .eq('team_id', teamId)
    .eq('status', 'feedback_ready')
    .gte('updated_at', startOfMonth.toISOString())

  if (error) {
    throw error
  }

  return typeof count === 'number' ? count : 0
}

export async function processSubmission(submissionId: string) {
  const supabaseAdmin = getSupabaseAdminClient()
  const { data: submissions, error: submissionError } = await supabaseAdmin
    .from(AI_COACH_SUBMISSIONS_TABLE)
    .select('*')
    .eq('id', submissionId)
    .maybeSingle()

  if (submissionError) {
    throw submissionError
  }

  const submission = submissions as Record<string, unknown> | null
  if (!submission) {
    throw new Error('submission_not_found')
  }

  // Only process submissions that are in 'submitted' state. Attempt to
  // claim the submission by atomically setting status -> 'processing'.
  // If the claim fails (another worker claimed it), skip.
  if (String(submission.status || '').toLowerCase() !== 'submitted') {
    return { skipped: true, reason: 'not_submitted' }
  }

  // Attempt to claim the submission to avoid concurrent processing.
  const { data: claimedRows, error: claimError } = await supabaseAdmin
    .from(AI_COACH_SUBMISSIONS_TABLE)
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', submissionId)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()

  if (claimError) {
    console.warn('submission_claim_error', claimError)
    return { skipped: true, reason: 'claim_error' }
  }

  if (!claimedRows || !claimedRows.id) {
    // Another worker likely claimed it
    return { skipped: true, reason: 'already_claimed' }
  }

  const planName = normalizePlanName(submission.plan_name)
  const quota = getPlanQuota(planName)
  const teamId = String(submission.team_id || '')

  // Re-check monthly usage after claiming to reduce quota race conditions.
  const used = teamId ? await countMonthlyFeedbackForTeam(teamId) : 0

  if (quota <= 0) {
    await patchSupabaseRecord(AI_COACH_SUBMISSIONS_TABLE, submissionId, {
      status: 'plan_unavailable',
      updated_at: new Date().toISOString(),
    })
    return { skipped: true, reason: 'plan_unavailable', planName }
  }

  if (used >= quota) {
    await patchSupabaseRecord(AI_COACH_SUBMISSIONS_TABLE, submissionId, {
      status: 'plan_exceeded',
      updated_at: new Date().toISOString(),
    })
    return { skipped: true, reason: 'plan_exceeded', planName, quota, used }
  }

  const prompt = buildFeedbackPrompt(submission)
  const aiResult = await callOpenAi(prompt)
  const parsed = extractJsonFromText(aiResult)
  const report = buildFeedbackRecord(parsed, submissionId)

  await insertSupabaseRecord(AI_COACH_REPORTS_TABLE, report)
  await patchSupabaseRecord(AI_COACH_SUBMISSIONS_TABLE, submissionId, {
    status: 'feedback_ready',
    updated_at: new Date().toISOString(),
  })

  const feedbackUrl = `${String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').replace(/\/$/, '')}/ai-coach/feedback/${encodeURIComponent(submissionId)}`
  const email = String(submission.email || '')
  if (email && email.includes('@')) {
    const { subject, text, html } = buildEmailBody(submission, report, feedbackUrl)
    await sendEmail(email, subject, text, html)
  }

  return { processed: true, submissionId, planName, feedbackUrl }
}

export async function processPendingSubmissions(limit = 10) {
  const supabaseAdmin = getSupabaseAdminClient()
  const { data, error } = await supabaseAdmin
    .from(AI_COACH_SUBMISSIONS_TABLE)
    .select('id')
    .eq('status', 'submitted')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw error
  }

  const results: Array<unknown> = []
  if (!Array.isArray(data)) return results

  for (const record of data) {
    if (!record?.id) continue
    try {
      results.push(await processSubmission(String(record.id)))
    } catch (error) {
      results.push({ submissionId: record.id, error: String(error) })
    }
  }

  return results
}
