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
  '動画の保存に失敗しました。ファイルサイズ、通信状況、または一時的な保存エラーの可能性があります。時間をおいて再送信してください。解消しない場合は運営へご連絡ください。'

type UploadResponse = {
  ok: boolean
  submissionId?: string
  feedbackUrl?: string
  message?: string
  error?: string
  userMessage?: string
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

function getFileExtension(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (ext) return ext
  if (mimeType === 'video/mp4') return 'mp4'
  if (mimeType === 'video/webm') return 'webm'
  if (mimeType === 'video/quicktime') return 'mov'

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

async function notifyDiscord(record: Record<string, string>, feedbackUrl: string) {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const { fields, file } = await parseMultipartForm(req)
    const teamName = normalizeText(fields.teamName)
    const userName = normalizeText(fields.userName)
    const discordId = normalizeText(fields.discordId)
    const email = normalizeText(fields.email)
    const rankTier = normalizeText(fields.rankTier)
    const mapName = normalizeText(fields.mapName)
    const teamComp = normalizeText(fields.teamComp)
    const sceneType = normalizeText(fields.sceneType)
    const focusPoints = normalizeText(fields.focusPoints)
    const description = normalizeText(fields.description)
    const videoUrl = normalizeText(fields.videoUrl)
    const submissionType = normalizeText(fields.submissionType || fields.submissionMode)
    const targetTimestamps = normalizeText(fields.targetTimestamps)
    const consentAccepted = fields.consentAccepted === 'true' || fields.consentAccepted === 'on'

    if (!teamName || !userName || !discordId || !email || !isValidEmail(email) || !description) {
      return res.status(400).json({ ok: false, error: 'validation_error', message: '必須項目を確認してください。' })
    }

    if (!consentAccepted) {
      return res.status(400).json({ ok: false, error: 'consent_required', message: '同意チェックが必要です。' })
    }

    const isFileSubmission = submissionType === 'url'
      ? false
      : Boolean(file && file.fieldName === 'videoFile' && file.buffer.length)
    const isUrlSubmission = submissionType === 'file' ? false : Boolean(videoUrl && videoUrl.startsWith('http'))

    if (!isFileSubmission && !isUrlSubmission) {
      return res.status(400).json({
        ok: false,
        error: 'video_required',
        message: '動画ファイルまたはURLを指定してください。',
      })
    }

    if (isFileSubmission) {
      if (file!.truncated || file!.buffer.length > MAX_VIDEO_BYTES) {
        return res.status(413).json({
          ok: false,
          error: 'video_too_large',
          message: '動画ファイルのサイズが上限を超えています。',
        })
      }

      if (!file!.mimeType.startsWith(ALLOWED_VIDEO_MIME_PREFIX)) {
        return res.status(400).json({
          ok: false,
          error: 'invalid_video_type',
          message: '動画ファイルをアップロードしてください。',
        })
      }
    }

    if (isUrlSubmission) {
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
    }

    const team = await findOrCreateTeam(teamName, discordId)
    const submissionId = crypto.randomUUID()
    let videoPath: string | null = null
    let mimeType: string | null = null
    let fileSize: number | null = null
    let originalFilename: string | null = null

    if (isFileSubmission) {
      const ext = getFileExtension(file!.filename, file!.mimeType)
      videoPath = `teams/${team.id}/submissions/${submissionId}/original.${ext}`
      await uploadPrivateVideo(videoPath, file!)
      mimeType = file!.mimeType
      fileSize = file!.buffer.length
      originalFilename = file!.filename
    }

    const supabaseAdmin = getSupabaseAdminClient()
    const { data: savedSubmission, error: submissionInsertError } = await supabaseAdmin
      .from(AI_COACH_SUBMISSIONS_TABLE)
      .insert({
        id: submissionId,
        team_id: team.id,
        team_name: team.team_name,
        user_name: userName,
        discord_id: discordId,
        email,
        rank_tier: rankTier,
        map_name: mapName,
        team_comp: teamComp,
        scene_type: sceneType,
        focus_points: focusPoints,
        description,
        consent_accepted: consentAccepted,
        video_path: videoPath,
        original_filename: originalFilename,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        video_url: isUrlSubmission ? videoUrl : null,
        submission_type: isFileSubmission ? 'file' : 'url',
        source_platform: isUrlSubmission ? getSourcePlatform(videoUrl) : null,
        target_timestamps: targetTimestamps || null,
        ai_video_notes_status: 'not_started',
        status: 'submitted',
      })
      .select('id')
      .single()

    if (submissionInsertError) {
      console.error('video_submission_insert_failed', submissionInsertError)
      throw new Error('video_submission_insert_failed')
    }

    const feedbackUrl = `/ai-coach/feedback/${submissionId}`

    try {
      await notifyDiscord(
        {
          id: submissionId,
          team_id: team.id,
          team_name: team.team_name,
          user_name: userName,
          discord_id: discordId,
          email,
          rank_tier: rankTier,
          map_name: mapName,
          scene_type: sceneType,
          focus_points: focusPoints,
          submission_type: isFileSubmission ? 'file' : 'url',
          video_url: isUrlSubmission ? videoUrl : 'N/A',
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

    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: PUBLIC_UPLOAD_FAILURE_MESSAGE,
    })
  }
}
