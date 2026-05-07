import type { NextApiRequest, NextApiResponse } from 'next'
import Busboy from 'busboy'
import {
  AI_COACH_SUBMISSIONS_TABLE,
  AI_COACH_TEAMS_TABLE,
  AI_COACH_VIDEO_BUCKET,
  getSupabaseAdminClient,
  isValidEmail,
  normalizeText,
} from '../../../lib/ai-coach-supabase'

export const config = {
  api: {
    bodyParser: false,
  },
}

const MAX_VIDEO_BYTES = 750 * 1024 * 1024
const ALLOWED_VIDEO_MIME_PREFIX = 'video/'
const PUBLIC_UPLOAD_FAILURE_MESSAGE =
  '動画提出の保存に失敗しました。時間をおいて再度お試しください。解消しない場合は運営へご連絡ください。'

const SAFE_ERROR_CODES = new Set([
  'supabase_not_configured',
  'supabase_service_role_key_invalid',
  'team_select_failed',
  'team_insert_failed',
  'signed_upload_url_failed',
  'video_storage_upload_failed',
  'video_submission_insert_failed',
  'file_upload_finalize_select_failed',
  'file_upload_finalize_update_failed',
])

type UploadResponse = {
  ok: boolean
  submissionId?: string
  feedbackUrl?: string
  message?: string
  error?: string
  debugCode?: string
  debugDetail?: string
  userMessage?: string
  upload?: {
    path: string
    token: string
  }
}

type ParsedUpload = {
  fields: Record<string, string>
  file?: {
    fieldName: string
    filename: string
    mimeType: string
    buffer: Buffer
    truncated: boolean
  }
}

type TeamRecord = {
  id: string
  team_name: string
}

type SubmissionNotificationRecord = Record<string, string>

function getFileExtension(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (ext) return ext
  if (mimeType === 'video/mp4') return 'mp4'
  if (mimeType === 'video/webm') return 'webm'
  if (mimeType === 'video/quicktime') return 'mov'
  if (mimeType === 'video/x-matroska') return 'mkv'

  return 'bin'
}

function getSourcePlatform(videoUrl: string) {
  try {
    const hostname = new URL(videoUrl).hostname.replace(/^www\./, '').toLowerCase()

    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube'
    if (hostname.includes('twitch.tv')) return 'twitch'
    if (hostname.includes('drive.google.com')) return 'google_drive'
    if (hostname.includes('dropbox.com')) return 'dropbox'

    return hostname || 'url'
  } catch {
    return 'url'
  }
}

function getInternalDetail(error: unknown) {
  if (!error) return ''
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) return normalizeText((error as { message?: unknown }).message)
  return String(error)
}

function getSafeDebugDetail(detail: string) {
  return detail
    .replace(/https:\/\/[a-z0-9.-]+\.supabase\.co/gi, 'https://<supabase-project>.supabase.co')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer <redacted>')
    .replace(/apikey['":\s]+[A-Za-z0-9._-]+/gi, 'apikey <redacted>')
    .slice(0, 500)
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join(',') : value || ''
}

function isJsonRequest(req: NextApiRequest) {
  return getHeaderValue(req.headers['content-type']).toLowerCase().includes('application/json')
}

function getPublicBaseUrl(req: NextApiRequest) {
  const configuredUrl = normalizeText(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL).replace(/\/$/, '')
  if (configuredUrl) return configuredUrl

  const proto = getHeaderValue(req.headers['x-forwarded-proto']) || 'https'
  const host = getHeaderValue(req.headers['x-forwarded-host']) || getHeaderValue(req.headers.host)

  return host ? `${proto}://${host}` : ''
}

function getFeedbackUrl(req: NextApiRequest, submissionId: string) {
  const path = `/ai-coach/feedback/${submissionId}`
  const baseUrl = getPublicBaseUrl(req)

  return baseUrl ? `${baseUrl}${path}` : path
}

function readJsonBody(req: NextApiRequest): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8')
        const json = rawBody ? JSON.parse(rawBody) : {}
        const fields = Object.fromEntries(
          Object.entries(json).map(([key, value]) => [key, typeof value === 'string' ? value : String(value ?? '')])
        )

        resolve({ fields })
      } catch (error) {
        reject(error)
      }
    })
  })
}

function parseMultipartForm(req: NextApiRequest): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fields: 40,
        files: 1,
        fileSize: MAX_VIDEO_BYTES,
      },
    })

    const fields: Record<string, string> = {}
    let file: ParsedUpload['file']
    let fileLimitHit = false

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (fieldName, stream, info) => {
      const chunks: Buffer[] = []

      stream.on('limit', () => {
        fileLimitHit = true
      })

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      stream.on('end', () => {
        file = {
          fieldName,
          filename: info.filename,
          mimeType: info.mimeType,
          buffer: Buffer.concat(chunks),
          truncated: fileLimitHit,
        }
      })
    })

    busboy.on('error', reject)
    busboy.on('finish', () => resolve({ fields, file }))

    req.pipe(busboy as any)
  })
}

async function parseRequest(req: NextApiRequest) {
  return isJsonRequest(req) ? readJsonBody(req) : parseMultipartForm(req)
}

async function findOrCreateTeam(teamName: string, discordId: string): Promise<TeamRecord> {
  const supabaseAdmin = getSupabaseAdminClient()
  const normalizedTeamName = normalizeText(teamName)
  const contactDiscordId = normalizeText(discordId) || null

  const { data: existingTeam, error: selectTeamError } = await supabaseAdmin
    .from(AI_COACH_TEAMS_TABLE)
    .select('id, team_name')
    .eq('team_name', normalizedTeamName)
    .maybeSingle()

  if (selectTeamError) {
    console.error('team_select_failed', selectTeamError)
    throw new Error('team_select_failed')
  }

  if (existingTeam?.id) {
    return existingTeam as TeamRecord
  }

  const { data: createdTeam, error: insertTeamError } = await supabaseAdmin
    .from(AI_COACH_TEAMS_TABLE)
    .insert({
      team_name: normalizedTeamName,
      contact_discord_id: contactDiscordId,
    })
    .select('id, team_name')
    .single()

  if (insertTeamError) {
    console.error('team_insert_failed', insertTeamError)

    const { data: retryTeam } = await supabaseAdmin
      .from(AI_COACH_TEAMS_TABLE)
      .select('id, team_name')
      .eq('team_name', normalizedTeamName)
      .single()

    if (retryTeam?.id) {
      return retryTeam as TeamRecord
    }

    throw new Error('team_insert_failed')
  }

  return createdTeam as TeamRecord
}

async function uploadPrivateVideo(path: string, file: NonNullable<ParsedUpload['file']>) {
  const supabaseAdmin = getSupabaseAdminClient()
  const { error } = await supabaseAdmin.storage.from(AI_COACH_VIDEO_BUCKET).upload(path, file.buffer, {
    cacheControl: '31536000',
    contentType: file.mimeType || 'application/octet-stream',
    upsert: false,
  })

  if (error) {
    console.error('video_storage_upload_failed', error)
    throw new Error('video_storage_upload_failed')
  }
}

async function createSignedUpload(path: string) {
  const supabaseAdmin = getSupabaseAdminClient()
  const { data, error } = await supabaseAdmin.storage
    .from(AI_COACH_VIDEO_BUCKET)
    .createSignedUploadUrl(path, { upsert: false })

  if (error || !data?.token) {
    console.error('signed_upload_url_failed', error)
    throw new Error('signed_upload_url_failed')
  }

  return {
    path: data.path || path,
    token: data.token,
  }
}

async function notifyDiscord(record: SubmissionNotificationRecord, feedbackUrl: string) {
  const webhookUrl = normalizeText(process.env.DISCORD_WEBHOOK_URL)

  if (!webhookUrl) {
    console.warn('AI Coach video Discord notification skipped: DISCORD_WEBHOOK_URL is not configured')
    return
  }

  const isUrlSubmission = record.submission_type === 'url'
  const content = [
    '**AI Coach beta: new video submission**',
    `Submission Method: ${isUrlSubmission ? 'URL' : 'File Upload'}`,
    `Team: ${record.team_name || '-'}`,
    `Team ID: ${record.team_id || '-'}`,
    `Submitter: ${record.user_name || '-'}`,
    `Discord ID: ${record.discord_id || '-'}`,
    `Email: ${record.email || '-'}`,
    `Rank: ${record.rank_tier || '-'}`,
    `Map: ${record.map_name || '-'}`,
    `Scene: ${record.scene_type || '-'}`,
    `Focus: ${record.focus_points || '-'}`,
    `Submission ID: ${record.id}`,
    `Feedback URL: ${feedbackUrl}`,
    isUrlSubmission
      ? `Video URL: ${record.video_url || 'N/A'}`
      : 'The video is stored privately. Issue a signed URL from the admin screen only when needed.',
  ].join('\n')

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`discord_webhook_failed:${response.status}:${body}`)
  }
}

function validateCommonFields(fields: Record<string, string>) {
  const teamName = normalizeText(fields.teamName)
  const userName = normalizeText(fields.userName)
  const discordId = normalizeText(fields.discordId)
  const email = normalizeText(fields.email)
  const description = normalizeText(fields.description)
  const consentAccepted = fields.consentAccepted === 'true' || fields.consentAccepted === 'on'

  if (!teamName || !userName || !discordId || !email || !isValidEmail(email) || !description) {
    return {
      ok: false as const,
      response: { ok: false, error: 'validation_error', message: '必須項目を確認してください。' },
    }
  }

  if (!consentAccepted) {
    return {
      ok: false as const,
      response: { ok: false, error: 'consent_required', message: '同意チェックが必要です。' },
    }
  }

  return { ok: true as const }
}

function buildBaseRecord(fields: Record<string, string>, team: TeamRecord, submissionId: string) {
  return {
    id: submissionId,
    team_id: team.id,
    team_name: team.team_name,
    user_name: normalizeText(fields.userName),
    discord_id: normalizeText(fields.discordId),
    email: normalizeText(fields.email),
    rank_tier: normalizeText(fields.rankTier),
    map_name: normalizeText(fields.mapName),
    team_comp: normalizeText(fields.teamComp),
    scene_type: normalizeText(fields.sceneType),
    focus_points: normalizeText(fields.focusPoints),
    description: normalizeText(fields.description),
    consent_accepted: fields.consentAccepted === 'true' || fields.consentAccepted === 'on',
    ai_video_notes_status: 'not_started',
  }
}

async function finalizeFileUpload(req: NextApiRequest, fields: Record<string, string>, res: NextApiResponse<UploadResponse>) {
  const submissionId = normalizeText(fields.submissionId)

  if (!submissionId) {
    return res.status(400).json({ ok: false, error: 'submission_id_required', message: '提出IDが見つかりません。' })
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { data: submission, error: selectError } = await supabaseAdmin
    .from(AI_COACH_SUBMISSIONS_TABLE)
    .select('id,team_id,team_name,user_name,discord_id,email,rank_tier,map_name,scene_type,focus_points,submission_type,video_path,status')
    .eq('id', submissionId)
    .maybeSingle()

  if (selectError || !submission?.id || submission.submission_type !== 'file' || !submission.video_path) {
    console.error('file_upload_finalize_select_failed', selectError)
    throw new Error('file_upload_finalize_select_failed')
  }

  const { error: updateError } = await supabaseAdmin
    .from(AI_COACH_SUBMISSIONS_TABLE)
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', submissionId)

  if (updateError) {
    console.error('file_upload_finalize_update_failed', updateError)
    throw new Error('file_upload_finalize_update_failed')
  }

  const feedbackUrl = getFeedbackUrl(req, submissionId)

  try {
    await notifyDiscord(
      {
        id: submissionId,
        team_id: normalizeText(submission.team_id),
        team_name: normalizeText(submission.team_name),
        user_name: normalizeText(submission.user_name),
        discord_id: normalizeText(submission.discord_id),
        email: normalizeText(submission.email),
        rank_tier: normalizeText(submission.rank_tier),
        map_name: normalizeText(submission.map_name),
        scene_type: normalizeText(submission.scene_type),
        focus_points: normalizeText(submission.focus_points),
        submission_type: 'file',
        video_url: 'N/A',
      },
      feedbackUrl
    )
  } catch (discordError) {
    console.warn('AI Coach video Discord notification failed', discordError)
  }

  return res.status(200).json({
    ok: true,
    submissionId,
    feedbackUrl,
    message: '動画提出を受け付けました。',
  })
}

function internalErrorResponse(detail: string): UploadResponse {
  return {
    ok: false,
    error: 'internal_error',
    debugCode: SAFE_ERROR_CODES.has(detail) ? detail : 'unexpected_internal_error',
    debugDetail: getSafeDebugDetail(detail),
    message: PUBLIC_UPLOAD_FAILURE_MESSAGE,
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const { fields, file } = await parseRequest(req)
    const action = normalizeText(fields.action)

    if (action === 'finalize_file_upload') {
      return finalizeFileUpload(req, fields, res)
    }

    const validation = validateCommonFields(fields)
    if (!validation.ok) {
      return res.status(400).json(validation.response)
    }

    const videoUrl = normalizeText(fields.videoUrl)
    const submissionType = normalizeText(fields.submissionType || fields.submissionMode)
    const targetTimestamps = normalizeText(fields.targetTimestamps)
    const directUploadRequested = action === 'create_file_upload'
    const isFileSubmission = submissionType === 'url'
      ? false
      : directUploadRequested || Boolean(file && file.fieldName === 'videoFile' && file.buffer.length)
    const isUrlSubmission = submissionType === 'file' ? false : Boolean(videoUrl && /^https?:\/\//i.test(videoUrl))

    if (!isFileSubmission && !isUrlSubmission) {
      return res.status(400).json({
        ok: false,
        error: 'video_required',
        message: '動画ファイルまたはURLを指定してください。',
      })
    }

    if (isFileSubmission) {
      const filename = normalizeText(fields.originalFilename || file?.filename || 'video')
      const mimeType = normalizeText(fields.mimeType || file?.mimeType || 'application/octet-stream')
      const fileSize = Number(fields.fileSizeBytes || file?.buffer.length || 0)

      if (file?.truncated || fileSize > MAX_VIDEO_BYTES) {
        return res.status(413).json({
          ok: false,
          error: 'video_too_large',
          message: '動画ファイルのサイズが上限を超えています。',
        })
      }

      if (!mimeType.startsWith(ALLOWED_VIDEO_MIME_PREFIX)) {
        return res.status(400).json({
          ok: false,
          error: 'invalid_video_type',
          message: '動画ファイルをアップロードしてください。',
        })
      }

      const team = await findOrCreateTeam(fields.teamName, fields.discordId)
      const submissionId = crypto.randomUUID()
      const ext = getFileExtension(filename, mimeType)
      const videoPath = `teams/${team.id}/submissions/${submissionId}/original.${ext}`
      const supabaseAdmin = getSupabaseAdminClient()
      const record = {
        ...buildBaseRecord(fields, team, submissionId),
        video_path: videoPath,
        original_filename: filename,
        mime_type: mimeType,
        file_size_bytes: fileSize || null,
        video_url: null,
        submission_type: 'file',
        source_platform: null,
        target_timestamps: targetTimestamps || null,
        status: directUploadRequested ? 'uploading' : 'submitted',
      }

      if (directUploadRequested) {
        const upload = await createSignedUpload(videoPath)
        const { error: submissionInsertError } = await supabaseAdmin.from(AI_COACH_SUBMISSIONS_TABLE).insert(record)

        if (submissionInsertError) {
          console.error('video_submission_insert_failed', submissionInsertError)
          throw new Error('video_submission_insert_failed')
        }

        return res.status(201).json({
          ok: true,
          submissionId,
          feedbackUrl: getFeedbackUrl(req, submissionId),
          upload,
          message: 'アップロード先を発行しました。',
        })
      }

      await uploadPrivateVideo(videoPath, file!)

      const { data: savedSubmission, error: submissionInsertError } = await supabaseAdmin
        .from(AI_COACH_SUBMISSIONS_TABLE)
        .insert(record)
        .select('id')
        .single()

      if (submissionInsertError) {
        console.error('video_submission_insert_failed', submissionInsertError)
        throw new Error('video_submission_insert_failed')
      }

      const feedbackUrl = getFeedbackUrl(req, submissionId)

      try {
        await notifyDiscord(
          {
            id: submissionId,
            team_id: team.id,
            team_name: team.team_name,
            user_name: normalizeText(fields.userName),
            discord_id: normalizeText(fields.discordId),
            email: normalizeText(fields.email),
            rank_tier: normalizeText(fields.rankTier),
            map_name: normalizeText(fields.mapName),
            scene_type: normalizeText(fields.sceneType),
            focus_points: normalizeText(fields.focusPoints),
            submission_type: 'file',
            video_url: 'N/A',
          },
          feedbackUrl
        )
      } catch (discordError) {
        console.warn('AI Coach video Discord notification failed', discordError)
      }

      return res.status(201).json({
        ok: true,
        submissionId: normalizeText(savedSubmission?.id) || submissionId,
        feedbackUrl,
        message: '動画提出を受け付けました。',
      })
    }

    if (!targetTimestamps) {
      return res.status(400).json({
        ok: false,
        error: 'missing_target_timestamps',
        userMessage: 'URL提出の場合は、分析してほしい時間帯 / タイムスタンプを入力してください。',
        message: 'URL提出の場合は、分析してほしい時間帯 / タイムスタンプを入力してください。',
      })
    }

    try {
      new URL(videoUrl)
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid_url', message: '有効なURLを入力してください。' })
    }

    const team = await findOrCreateTeam(fields.teamName, fields.discordId)
    const submissionId = crypto.randomUUID()
    const supabaseAdmin = getSupabaseAdminClient()
    const { data: savedSubmission, error: submissionInsertError } = await supabaseAdmin
      .from(AI_COACH_SUBMISSIONS_TABLE)
      .insert({
        ...buildBaseRecord(fields, team, submissionId),
        video_path: null,
        original_filename: null,
        mime_type: null,
        file_size_bytes: null,
        video_url: videoUrl,
        submission_type: 'url',
        source_platform: getSourcePlatform(videoUrl),
        target_timestamps: targetTimestamps,
        status: 'submitted',
      })
      .select('id')
      .single()

    if (submissionInsertError) {
      console.error('video_submission_insert_failed', submissionInsertError)
      throw new Error('video_submission_insert_failed')
    }

    const feedbackUrl = getFeedbackUrl(req, submissionId)

    try {
      await notifyDiscord(
        {
          id: submissionId,
          team_id: team.id,
          team_name: team.team_name,
          user_name: normalizeText(fields.userName),
          discord_id: normalizeText(fields.discordId),
          email: normalizeText(fields.email),
          rank_tier: normalizeText(fields.rankTier),
          map_name: normalizeText(fields.mapName),
          scene_type: normalizeText(fields.sceneType),
          focus_points: normalizeText(fields.focusPoints),
          submission_type: 'url',
          video_url: videoUrl,
        },
        feedbackUrl
      )
    } catch (discordError) {
      console.warn('AI Coach video Discord notification failed', discordError)
    }

    return res.status(201).json({
      ok: true,
      submissionId: normalizeText(savedSubmission?.id) || submissionId,
      feedbackUrl,
      message: '動画提出を受け付けました。',
    })
  } catch (error) {
    const internalDetail = getInternalDetail(error)
    console.error('ai-coach video submissions api error', internalDetail, error)

    return res.status(500).json(internalErrorResponse(internalDetail))
  }
}
