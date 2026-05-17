import { getSupabaseAdminClient, isValidEmail, normalizeText } from './ai-coach-supabase'
import type { AiCoachRawAnalysis, AiCoachSubmissionInput } from '../types/ai-coach'

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

type LandmarkCorrection = {
  map: string
  oldNames: string[]
  correctedName: string
}

type TeamRecord = {
  id: string
  name?: string
  team_name?: string
  plan?: string
  plan_name?: string
}

export const AI_COACH_GPTS_URL =
  process.env.AI_COACH_GPTS_URL || 'https://chatgpt.com/g/g-69f87f4df608819193b73730363e9698-apex-ai-coach'

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 0,
  lite: 3,
  player: 10,
  team: 999,
  beta: 10,
}

const LANDMARK_CORRECTIONS: LandmarkCorrection[] = [
  { map: 'Olympus', oldNames: ['軌道砲', 'Orbital Cannon'], correctedName: 'ソマーズ大学 / Somers University' },
  { map: 'Olympus', oldNames: ['エネルギー貯蔵庫', 'Energy Depot'], correctedName: 'グラビティエンジン / Gravity Engine' },
  { map: 'Olympus', oldNames: ['ドック', 'Docks'], correctedName: 'スタビライザー / Stabilizer' },
  { map: 'Storm Point', oldNames: ['アンテナ', 'Antenna'], correctedName: "ワットソンのパイロン / Wattson's Pylon / The Pylon" },
  { map: 'Storm Point', oldNames: ['ハイポイント', 'Highpoint'], correctedName: 'ZEUS Station' },
  { map: 'Storm Point', oldNames: ['プラウラーアイランド', 'Prowler Island'], correctedName: 'CETO Station' },
  { map: 'Storm Point', oldNames: ['ゲイルステーション', 'Gale Station'], correctedName: 'ECHO HQ' },
  { map: 'Storm Point', oldNames: ['フィッシュファーム', 'Fish Farms'], correctedName: 'Devastated Coast' },
  { map: 'Storm Point', oldNames: ['シップフォール', 'Shipfall'], correctedName: 'Coastal Camp' },
  { map: 'Broken Moon', oldNames: ['プロムナード東', 'Promenade East'], correctedName: 'Quarantine Zone' },
  { map: 'Broken Moon', oldNames: ['プロムナード西', 'Promenade West'], correctedName: 'Cliff Side' },
  { map: 'Broken Moon', oldNames: ['旧ブレイカーワーフ', 'Old Breaker Wharf'], correctedName: 'Space Port' },
  { map: 'Broken Moon', oldNames: ['バックアップアトモ', 'Backup Atmostation'], correctedName: 'New Breaker Wharf' },
]

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
    videoFileUrl: normalizeText(payload.videoFileUrl || payload.video_file_url || payload.storagePath || payload.storage_path) || undefined,
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
  if (!input.videoUrl && !input.videoFileUrl) return { ok: false, message: '動画URLを入力してください。ファイル提出は現在準備中です。' }

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
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  const text = normalizeText(value)
  if (!text) return []
  return text.split('\n').map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
}

function normalizeTextList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean).join('\n')
  return normalizeText(value)
}

function createShareToken() {
  return Buffer.from(crypto.randomUUID().replace(/-/g, ''), 'hex').toString('base64url')
}

function normalizePlanName(value: unknown) {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized.includes('team')) return 'team'
  if (normalized.includes('beta')) return 'beta'
  if (normalized.includes('player')) return 'player'
  if (normalized.includes('lite')) return 'lite'
  return 'free'
}

function getMonthlyLimit(planName: string) {
  return PLAN_MONTHLY_LIMITS[normalizePlanName(planName)] ?? 0
}

function includesIgnoreCase(text: string, needle: string) {
  return text.toLowerCase().includes(needle.toLowerCase())
}

function detectLandmarkCorrection(submission: Record<string, unknown>) {
  const sourceText = [
    submission.map_name,
    submission.focus_points,
    submission.description,
    submission.timestamps,
    submission.video_url,
    submission.video_file_url,
    submission.ai_video_notes,
    submission.admin_video_memo,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join('\n')

  const mapName = normalizeText(submission.map_name)
  const sameMap = (correction: LandmarkCorrection) => {
    if (!mapName) return true
    return includesIgnoreCase(mapName, correction.map) || includesIgnoreCase(correction.map, mapName)
  }

  for (const correction of LANDMARK_CORRECTIONS) {
    if (!sameMap(correction)) continue
    const oldName = correction.oldNames.find((name) => includesIgnoreCase(sourceText, name))
    if (oldName) {
      return {
        oldLandmarkCorrected: true,
        oldLandmarkName: oldName,
        correctedLandmarkName: correction.correctedName,
        promptText: `${oldName} は現在 ${correction.correctedName} として扱ってください。旧名称を最新ランドマーク名として断定しないでください。`,
      }
    }
  }

  return {
    oldLandmarkCorrected: false,
    oldLandmarkName: '',
    correctedLandmarkName: '',
    promptText: '旧ランドマーク名の補正対象は検出されていません。',
  }
}

function buildUsedSources(submission: Record<string, unknown>, hasLandmarkKnowledge: boolean) {
  return {
    video: false,
    screenshot: false,
    ai_video_memo: Boolean(normalizeText(submission.ai_video_notes)),
    admin_memo: Boolean(normalizeText(submission.admin_video_memo)),
    user_description: Boolean(normalizeText(submission.description)),
    map_knowledge: hasLandmarkKnowledge,
  }
}

function buildFallbackAnalysis(
  submission: Record<string, unknown>,
  teamName: string,
  teamTrends: string,
  reason: string
): AiCoachRawAnalysis {
  const landmarkCorrection = detectLandmarkCorrection(submission)
  const mapName = normalizeText(submission.map_name)
  const sceneType = normalizeText(submission.scene_type)
  const rankTier = normalizeText(submission.rank_tier)
  const teamComp = normalizeText(submission.team_comp)
  const focusPoints = normalizeText(submission.focus_points)
  const description = normalizeText(submission.description)
  const timestamps = normalizeText(submission.timestamps)
  const correctedLandmark = landmarkCorrection.correctedLandmarkName

  return {
    summary: [
      '提出情報とタイムスタンプをもとにした自動簡易フィードバックです。',
      '現時点では動画そのものを直接確認していないため、断定ではなく提出文面から読み取れる範囲で整理しています。',
      `${teamName}は、${mapName || '指定マップ'}の${sceneType || '指定シーン'}について、${focusPoints || '判断の整理'}を優先して見直すと次回に活かしやすいです。`,
    ].join('\n'),
    good_points: [
      timestamps ? `分析したい時間帯が ${timestamps} と指定されているため、振り返る場面を絞れています。` : '',
      focusPoints ? `重点ポイントが「${focusPoints}」として明確なので、チーム内で議論する軸を作れています。` : '',
      teamComp ? `構成情報（${teamComp}）があるため、役割分担とスキル使用の観点で見直しやすいです。` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    problems: [
      '動画確認なしの簡易分析のため、実際の射線、人数差、物資状況、リング位置までは確定できません。',
      description ? `提出説明から見ると、「${description}」の場面で、入るタイミング・見る射線・コールの優先順位を整理する余地があります。` : '',
      correctedLandmark ? `旧ランドマーク名「${landmarkCorrection.oldLandmarkName}」が含まれているため、現在名「${correctedLandmark}」として扱う必要があります。` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    improvements: [
      '次回は、移動開始前に「先に取る位置」「絶対に見られたくない射線」「撃ち合いを始める条件」を短く共有してください。',
      'ファイト前は、誰が入口を作るか、誰がカバーを見るか、誰が引く判断を出すかを固定すると再現性が上がります。',
      rankTier ? `${rankTier}帯では、難しいプロ基準の展開よりも、人数差を崩さない移動とフォーカスの統一を優先してください。` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    igl_call_examples: [
      '「今は撃ち切らず、先に右の射線だけ消す」',
      '「3人で同じ入口を見る。割れたら前、割れなければ引く」',
      '「移動役が先、カバー役は5秒だけ残る。ダウンが出たら即リセット」',
    ],
    checklist: [
      'タイムスタンプの場面で、最初に受けた射線を1つ書き出す',
      'ファイト開始前に、3人の役割を1文で決める',
      '移動前に、引く条件と押す条件をチームで合わせる',
      '次回提出時は、可能ならリング位置・残り部隊数・直前のダメージ交換も補足する',
    ],
    team_trends: teamTrends || '過去分析がまだ少ないため、今回の提出内容を初回傾向として蓄積します。',
    map: mapName,
    landmark: correctedLandmark || landmarkCorrection.oldLandmarkName || '',
    scene_type: sceneType,
    video_reviewed: false,
    used_sources: buildUsedSources(submission, Boolean(landmarkCorrection.promptText)),
    fight_decision_type: '簡易判定: ファイト前準備 / 射線整理',
    macro_decision_type: '簡易判定: 進入タイミング / ポジション選択',
    main_issue: '動画未確認のため、提出情報上は判断基準とコールの明文化が主な改善点です。',
    main_recommendation: '次回はタイムスタンプごとに、押す条件・引く条件・見る射線を事前に決めてから同じ場面を再現してください。',
    confidence: 'low',
    requires_human_review: true,
    missing_info: ['動画の直接確認', 'リング位置', '残り部隊数', '直前のダメージ交換', '各メンバーの視点'],
    discord_summary: 'AI自動分析の代替として、提出情報ベースの簡易フィードバックを作成しました。',
    old_landmark_corrected: landmarkCorrection.oldLandmarkCorrected,
    old_landmark_name: landmarkCorrection.oldLandmarkName,
    corrected_landmark_name: landmarkCorrection.correctedLandmarkName,
    gpts_reference_url: AI_COACH_GPTS_URL,
    fallback_reason: reason,
  } as AiCoachRawAnalysis
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

async function findOrCreateTeam(teamName: string, ownerUserId: string): Promise<TeamRecord> {
  const supabase = getSupabaseAdminClient()
  const { data: existing, error: selectError } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .select('id,name,team_name,plan,plan_name')
    .eq('name', teamName)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing?.id) return existing as TeamRecord

  const { data: legacyExisting, error: legacySelectError } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .select('id,name,team_name,plan,plan_name')
    .eq('team_name', teamName)
    .maybeSingle()

  if (legacySelectError) throw legacySelectError
  if (legacyExisting?.id) return legacyExisting as TeamRecord

  const { data, error } = await supabase
    .from(AI_COACH_TEAMS_TABLE_V2)
    .insert({
      name: teamName,
      team_name: teamName,
      owner_user_id: ownerUserId,
      plan: 'free',
      plan_name: 'Free',
    })
    .select('id,name,team_name,plan,plan_name')
    .single()

  if (error) throw error
  return data as TeamRecord
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

  await supabase
    .from(AI_COACH_SUBMISSIONS_TABLE_V2)
    .update({ status: 'queued', updated_at: new Date().toISOString() })
    .eq('id', submission.id)

  return { user, team, submission, report, shareLink }
}

function buildAnalysisPrompt(
  submission: Record<string, unknown>,
  teamName: string,
  teamTrends: string,
  landmarkCorrection: ReturnType<typeof detectLandmarkCorrection>
) {
  const usedSources = buildUsedSources(submission, Boolean(landmarkCorrection.promptText))
  return [
    'You are Apex AI Coach, an Apex Legends specialist coach for ranked and competitive teams.',
    'Output natural Japanese text in all human-facing fields.',
    'Do not stop at asking follow-up questions. Analyze the scene with the available information, and list missing information separately.',
    'Do not pretend to have watched a video. If the video itself was not reviewed, set video_reviewed=false and base the analysis on timestamps, user description, AI video memo, admin memo, and map knowledge.',
    'Separate facts from inference. Use wording such as "提出情報から見ると" or "推測として" when evidence is incomplete.',
    'Use a competitive perspective, but do not force pro-team solutions onto ranked teams. Adjust recommendations to rank, team maturity, composition, and scene type.',
    'Analyze through fight decision, macro decision, and IGL communication. Prefer actionable next-game behavior.',
    'If team trends exist, reflect them without overfitting.',
    'Correct old landmark names before analysis. Do not treat old names as current map knowledge.',
    'Return valid JSON only. No markdown, no commentary outside JSON.',
    '',
    'Required JSON schema:',
    JSON.stringify({
      summary: '',
      good_points: '',
      problems: '',
      improvements: '',
      igl_call_examples: '',
      checklist: [],
      team_trends: '',
      map: '',
      landmark: '',
      scene_type: '',
      video_reviewed: false,
      used_sources: {
        video: false,
        screenshot: false,
        ai_video_memo: false,
        admin_memo: false,
        user_description: true,
        map_knowledge: true,
      },
      fight_decision_type: '',
      macro_decision_type: '',
      main_issue: '',
      main_recommendation: '',
      confidence: 'high | medium | low',
      requires_human_review: false,
      missing_info: [],
      discord_summary: '',
      old_landmark_corrected: false,
      old_landmark_name: '',
      corrected_landmark_name: '',
    }),
    '',
    'Submission:',
    `team_name: ${teamName}`,
    `rank_tier: ${normalizeText(submission.rank_tier) || '-'}`,
    `map_name: ${normalizeText(submission.map_name) || '-'}`,
    `team_comp: ${normalizeText(submission.team_comp) || '-'}`,
    `scene_type: ${normalizeText(submission.scene_type) || '-'}`,
    `focus_points: ${normalizeText(submission.focus_points) || '-'}`,
    `description: ${normalizeText(submission.description) || '-'}`,
    `timestamps: ${normalizeText(submission.timestamps) || '-'}`,
    `video_url_or_file: ${normalizeText(submission.video_url || submission.video_file_url) || '-'}`,
    `ai_video_memo: ${normalizeText(submission.ai_video_notes) || '-'}`,
    `admin_memo: ${normalizeText(submission.admin_video_memo) || '-'}`,
    `team_trends: ${teamTrends || 'なし'}`,
    '',
    'Source flags to preserve unless evidence says otherwise:',
    JSON.stringify(usedSources),
    '',
    'Landmark correction:',
    landmarkCorrection.promptText,
  ].join('\n')
}

async function callOpenAiForAnalysis(
  submission: Record<string, unknown>,
  teamName: string,
  teamTrends: string
): Promise<AiCoachRawAnalysis | null> {
  const apiKey = normalizeText(process.env.OPENAI_API_KEY)
  if (!apiKey) return null

  const landmarkCorrection = detectLandmarkCorrection(submission)
  const prompt = buildAnalysisPrompt(submission, teamName, teamTrends, landmarkCorrection)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are Apex AI Coach. Return one strict JSON object only. Never call or reference the GPTs URL at runtime; it is for operator reference only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      max_tokens: 1800,
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

  const parsed = JSON.parse(String(content)) as Record<string, unknown>
  return {
    ...parsed,
    used_sources: parsed.used_sources || buildUsedSources(submission, Boolean(landmarkCorrection.promptText)),
    video_reviewed: parsed.video_reviewed === true,
    old_landmark_corrected: landmarkCorrection.oldLandmarkCorrected || parsed.old_landmark_corrected === true,
    old_landmark_name: landmarkCorrection.oldLandmarkName || normalizeText(parsed.old_landmark_name),
    corrected_landmark_name: landmarkCorrection.correctedLandmarkName || normalizeText(parsed.corrected_landmark_name),
    gpts_reference_url: AI_COACH_GPTS_URL,
  }
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

async function countCompletedReportsThisMonth(teamId: string) {
  const supabase = getSupabaseAdminClient()
  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('report_status', 'completed')
    .gte('updated_at', startOfMonth.toISOString())

  if (error) throw error
  return count || 0
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
  discordSummary?: string
}) {
  const message = [
    'AI Coachの分析が完了しました。',
    '',
    `チーム: ${params.teamName}`,
    `マップ: ${params.mapName}`,
    `シーン: ${params.sceneType}`,
    params.discordSummary ? `要約: ${params.discordSummary}` : '',
    '',
    'フィードバックはこちら:',
    params.feedbackUrl,
    '',
    '※このURLはチーム内共有用です。第三者への共有は控えてください。',
  ]
    .filter(Boolean)
    .join('\n')

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
    .select('id,name,team_name,plan,plan_name')
    .eq('id', submission.team_id)
    .maybeSingle()

  const teamRecord = (team || {}) as TeamRecord
  const teamName = normalizeText(teamRecord.name || teamRecord.team_name) || '未設定チーム'
  const planName = normalizePlanName(teamRecord.plan_name || teamRecord.plan)
  const monthlyLimit = getMonthlyLimit(planName)
  const completedCount = await countCompletedReportsThisMonth(normalizeText(submission.team_id))
  const teamTrends = await getTeamTrends(normalizeText(submission.team_id))

  if (monthlyLimit <= 0 || completedCount >= monthlyLimit) {
    const parsed = buildFallbackAnalysis(submission, teamName, teamTrends, 'monthly_plan_limit_simple_report')
    await supabase
      .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
      .update({
        report_status: 'completed',
        summary: normalizeText(parsed.summary),
        good_points: normalizeText(parsed.good_points),
        problems: normalizeText(parsed.problems),
        improvements: normalizeText(parsed.improvements),
        igl_call_examples: normalizeTextList(parsed.igl_call_examples),
        checklist: normalizeChecklist(parsed.checklist),
        team_trends: normalizeText(parsed.team_trends),
        raw_ai_response: {
          ...parsed,
          plan: planName,
          monthly_limit: monthlyLimit,
          completed_count: completedCount,
        },
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
      mapName: normalizeText(parsed.map || submission.map_name),
      sceneType: normalizeText(parsed.scene_type || submission.scene_type),
      email: normalizeText(submission.email),
      discordId: normalizeText(submission.discord_id),
      feedbackUrl,
      discordSummary: normalizeText(parsed.discord_summary),
    })

    return {
      processed: true,
      fallback: true,
      reason: 'monthly_plan_limit_simple_report',
      reportId: report.id,
      feedbackUrl,
      planName,
      monthlyLimit,
      completedCount,
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    const parsed = buildFallbackAnalysis(submission, teamName, teamTrends, 'openai_not_configured_simple_report')
    await supabase
      .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
      .update({
        report_status: 'completed',
        summary: normalizeText(parsed.summary),
        good_points: normalizeText(parsed.good_points),
        problems: normalizeText(parsed.problems),
        improvements: normalizeText(parsed.improvements),
        igl_call_examples: normalizeTextList(parsed.igl_call_examples),
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
      mapName: normalizeText(parsed.map || submission.map_name),
      sceneType: normalizeText(parsed.scene_type || submission.scene_type),
      email: normalizeText(submission.email),
      discordId: normalizeText(submission.discord_id),
      feedbackUrl,
      discordSummary: normalizeText(parsed.discord_summary),
    })

    return { processed: true, fallback: true, reason: 'openai_not_configured_simple_report', reportId: report.id, feedbackUrl }
  }

  await supabase
    .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
    .update({ report_status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', report.id)

  try {
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
        igl_call_examples: normalizeTextList(parsed.igl_call_examples),
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
      mapName: normalizeText(parsed.map || submission.map_name),
      sceneType: normalizeText(parsed.scene_type || submission.scene_type),
      email: normalizeText(submission.email),
      discordId: normalizeText(submission.discord_id),
      feedbackUrl,
      discordSummary: normalizeText(parsed.discord_summary),
    })

    return { processed: true, reportId: report.id, feedbackUrl }
  } catch (error) {
    const parsed = buildFallbackAnalysis(
      submission,
      teamName,
      teamTrends,
      error instanceof Error ? `openai_failed:${error.message}` : 'openai_failed'
    )
    await supabase
      .from(AI_COACH_ANALYSIS_REPORTS_TABLE)
      .update({
        report_status: 'completed',
        summary: normalizeText(parsed.summary),
        good_points: normalizeText(parsed.good_points),
        problems: normalizeText(parsed.problems),
        improvements: normalizeText(parsed.improvements),
        igl_call_examples: normalizeTextList(parsed.igl_call_examples),
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
      mapName: normalizeText(parsed.map || submission.map_name),
      sceneType: normalizeText(parsed.scene_type || submission.scene_type),
      email: normalizeText(submission.email),
      discordId: normalizeText(submission.discord_id),
      feedbackUrl,
      discordSummary: normalizeText(parsed.discord_summary),
    })

    return {
      processed: true,
      fallback: true,
      reason: 'openai_failed_simple_report',
      reportId: report.id,
      feedbackUrl,
    }
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
