import { createClient } from '@supabase/supabase-js'

export const AI_COACH_VIDEO_BUCKET = 'ai-coach-videos'
export const AI_COACH_SUBMISSIONS_TABLE = 'ai_coach_video_submissions'
export const AI_COACH_REPORTS_TABLE = 'ai_coach_feedback_reports'
export const AI_COACH_TEAMS_TABLE = 'ai_coach_teams'

export type SupabaseConfig = {
  supabaseUrl: string
  serviceRoleKey: string
}

export function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

export function getSupabaseUrl() {
  return normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL).replace(/\/$/, '')
}

export function getSupabaseServerConfig(): SupabaseConfig {
  const supabaseUrl = getSupabaseUrl()
  const serviceRoleKey = normalizeText(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!supabaseUrl) {
    console.error('AI Coach Supabase config error: NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!serviceRoleKey) {
    console.error('AI Coach Supabase config error: SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('supabase_not_configured')
  }

  assertServiceRoleKey(serviceRoleKey)

  return { supabaseUrl, serviceRoleKey }
}

function assertServiceRoleKey(serviceRoleKey: string) {
  const [, payload] = serviceRoleKey.split('.')

  if (!payload) return

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string }

    if (decoded.role && decoded.role !== 'service_role') {
      console.error('AI Coach Supabase config error: SUPABASE_SERVICE_ROLE_KEY is not a service_role key')
      throw new Error('supabase_service_role_key_invalid')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'supabase_service_role_key_invalid') {
      throw error
    }
  }
}

export function getSupabaseAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseServerConfig()

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function supabaseHeaders(config: SupabaseConfig, extra?: HeadersInit): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra,
  }
}

export async function insertSupabaseRecord<T extends Record<string, unknown>>(table: string, record: T) {
  const config = getSupabaseServerConfig()
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: supabaseHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(record),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`supabase_insert_failed:${table}:${response.status}:${body}`)
  }

  const json = await response.json().catch(() => [])
  return Array.isArray(json) ? json[0] : json
}

export async function patchSupabaseRecord<T extends Record<string, unknown>>(table: string, id: string, record: T) {
  const config = getSupabaseServerConfig()
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: supabaseHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(record),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`supabase_patch_failed:${table}:${response.status}:${body}`)
  }

  const json = await response.json().catch(() => [])
  return Array.isArray(json) ? json[0] : json
}

export async function selectSupabaseRecords<T = Record<string, unknown>>(table: string, query: string) {
  const config = getSupabaseServerConfig()
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: supabaseHeaders(config),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`supabase_select_failed:${table}:${response.status}:${body}`)
  }

  return (await response.json()) as T[]
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function slugifyTeamId(teamName: string) {
  const normalized = teamName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `team-${crypto.randomUUID().slice(0, 8)}`
}

export function getAdminToken() {
  return normalizeText(process.env.AI_COACH_ADMIN_TOKEN)
}

export function assertAdminToken(value: unknown) {
  const adminToken = getAdminToken()

  if (!adminToken) {
    throw new Error('admin_token_not_configured')
  }

  if (normalizeText(value) !== adminToken) {
    throw new Error('unauthorized')
  }
}
