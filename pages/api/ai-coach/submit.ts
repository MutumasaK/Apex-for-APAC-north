import type { NextApiRequest, NextApiResponse } from 'next'
import Busboy from 'busboy'
import { AI_COACH_VIDEO_BUCKET, getSupabaseAdminClient, normalizeText } from '../../../lib/ai-coach-supabase'
import { analyzeSubmission, createSubmission, getFeedbackUrl, validateSubmissionPayload } from '../../../lib/ai-coach-v2'

export const config = {
  api: {
    bodyParser: false,
  },
}

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

type ParsedRequest = {
  fields: Record<string, string>
  file?: {
    filename: string
    mimeType: string
    buffer: Buffer
    truncated: boolean
  }
}

const MAX_VIDEO_BYTES = 300 * 1024 * 1024

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

function parseRequest(req: NextApiRequest): Promise<ParsedRequest> {
  return new Promise((resolve, reject) => {
    const contentType = getHeaderValue(req.headers['content-type']).toLowerCase()

    if (contentType.includes('application/json')) {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('error', reject)
      req.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          const fields = Object.fromEntries(Object.entries(json).map(([key, value]) => [key, String(value ?? '')]))
          resolve({ fields })
        } catch (error) {
          reject(error)
        }
      })
      return
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_VIDEO_BYTES, fields: 60 },
    })
    const fields: Record<string, string> = {}
    let file: ParsedRequest['file']
    let truncated = false

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (_name, stream, info) => {
      const chunks: Buffer[] = []
      stream.on('limit', () => {
        truncated = true
      })
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (buffer.length) {
          file = {
            filename: info.filename || 'video',
            mimeType: info.mimeType || 'application/octet-stream',
            buffer,
            truncated,
          }
        }
      })
    })

    busboy.on('error', reject)
    busboy.on('finish', () => resolve({ fields, file }))
    req.pipe(busboy as any)
  })
}

function getFileExtension(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (ext) return ext
  if (mimeType === 'video/mp4') return 'mp4'
  if (mimeType === 'video/webm') return 'webm'
  if (mimeType === 'video/quicktime') return 'mov'
  return 'bin'
}

async function uploadVideoFile(file: NonNullable<ParsedRequest['file']>) {
  if (file.truncated || file.buffer.length > MAX_VIDEO_BYTES) {
    throw new Error('video_too_large')
  }

  if (!file.mimeType.startsWith('video/')) {
    throw new Error('invalid_video_type')
  }

  const supabase = getSupabaseAdminClient()
  const id = crypto.randomUUID()
  const ext = getFileExtension(file.filename, file.mimeType)
  const path = `submissions/${id}/original.${ext}`
  const { error } = await supabase.storage.from(AI_COACH_VIDEO_BUCKET).upload(path, file.buffer, {
    contentType: file.mimeType,
    upsert: false,
  })

  if (error) throw error
  return `supabase://${AI_COACH_VIDEO_BUCKET}/${path}`
}

function publicMessageForError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message === 'video_too_large') return '動画ファイルのサイズが大きすぎます。短いクリップに分けて提出してください。'
  if (message === 'invalid_video_type') return '動画ファイルを選択してください。'
  if (message.includes('relation') || message.includes('schema')) return '保存先の準備がまだ完了していません。管理者に連絡してください。'
  return '提出の保存に失敗しました。時間をおいてもう一度お試しください。'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const { fields, file } = await parseRequest(req)
    const payload: Record<string, unknown> = { ...fields }

    if (file) {
      payload.videoFileUrl = await uploadVideoFile(file)
    }

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
