import type { NextApiRequest, NextApiResponse } from 'next'

const APPLICATION_TABLE = 'ai_coach_applications'

type ApiResponse = {
  ok: boolean
  message?: string
  error?: string
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getSupabaseUrl() {
  return normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL).replace(/\/$/, '')
}

function getServerConfig() {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!supabaseUrl) {
    console.error('AI Coach application config error: NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!serviceRoleKey) {
    console.error('AI Coach application config error: SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return { supabaseUrl, serviceRoleKey }
}

async function saveApplication(record: Record<string, unknown>) {
  const { supabaseUrl, serviceRoleKey } = getServerConfig()

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('supabase_not_configured')
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${APPLICATION_TABLE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(record),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('AI Coach application Supabase insert error', {
      status: response.status,
      statusText: response.statusText,
      body,
    })
    throw new Error(`supabase_insert_failed:${response.status}:${body}`)
  }

  const json = await response.json().catch(() => [])
  return Array.isArray(json) ? json[0] : json
}

async function notifyDiscord(record: Record<string, string>, createdAt: string) {
  const webhookUrl = normalizeText(process.env.DISCORD_WEBHOOK_URL)

  if (!webhookUrl) {
    console.warn('AI Coach application Discord notification skipped: DISCORD_WEBHOOK_URL is not configured')
    return
  }

  const content = [
    '**新規AI Coach β版申し込み**',
    `名前: ${record.name || '-'}`,
    `メールアドレス: ${record.email || '-'}`,
    `Discord ID: ${record.discord_id || '-'}`,
    `希望プラン: ${record.plan || '-'}`,
    `ランク帯: ${record.rank || '-'}`,
    `チーム名: ${record.team_name || '-'}`,
    `相談内容: ${record.message || '-'}`,
    `申込日時: ${createdAt}`,
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' })
  }

  try {
    const payload = req.body ?? {}
    const honeypot = normalizeText(payload.website)

    if (honeypot) {
      return res.status(200).json({ ok: true })
    }

    const name = normalizeText(payload.name)
    const email = normalizeText(payload.email || payload.contact)
    const discordId = normalizeText(payload.discordId || payload.discord_id)
    const plan = normalizeText(payload.plan || 'Lite')
    const rank = normalizeText(payload.rank)
    const message = normalizeText(payload.message || payload.content)
    const inquiryType = normalizeText(payload.inquiryType)
    const teamName = normalizeText(payload.teamName || payload.targetTeamName)

    if (!email || !isEmail(email) || !message) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: '入力内容を確認してください。',
      })
    }

    const record = {
      name,
      email,
      inquiry_type: inquiryType,
      discord_id: discordId,
      plan,
      rank,
      team_name: teamName,
      message,
      status: 'new',
      payment_status: 'unpaid',
      memo: [inquiryType ? `希望内容: ${inquiryType}` : '', teamName ? `チーム名: ${teamName}` : '']
        .filter(Boolean)
        .join('\n'),
    }

    const saved = await saveApplication(record)
    const createdAt = normalizeText(saved?.created_at) || new Date().toISOString()

    try {
      await notifyDiscord(
        {
          name,
          email,
          discord_id: discordId,
          plan,
          rank,
          team_name: teamName,
          message,
        },
        createdAt
      )
    } catch (discordError) {
      console.warn(
        'AI Coach application Discord notification failed',
        discordError instanceof Error ? discordError.message : discordError
      )
    }

    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('ai-coach-application api error', error instanceof Error ? error.message : error)
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: '申請の送信に失敗しました。時間をおいて再度お試しください。',
    })
  }
}
