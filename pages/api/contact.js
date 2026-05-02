const SUPABASE_CONTACT_TABLE = process.env.SUPABASE_CONTACT_TABLE || 'contact_messages'

function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
  return false
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

async function saveToSupabase(record) {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    return {
      stored: false,
      mode: 'log-only',
    }
  }

  const response = await fetch(`${url}/rest/v1/${SUPABASE_CONTACT_TABLE}`, {
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
    throw new Error(`Supabase request failed: ${response.status}`)
  }

  return {
    stored: true,
    mode: 'supabase',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const payload = req.body ?? {}
    const honeypot = normalizeText(payload.website)

    if (honeypot) {
      return res.status(200).json({ ok: true, ignored: true })
    }

    const record = {
      name: normalizeText(payload.name),
      contact: normalizeText(payload.contact),
      inquiry_type: normalizeText(payload.inquiryType),
      target_team_name: normalizeText(payload.targetTeamName),
      message: normalizeText(payload.content),
      reply_wanted: toBoolean(payload.replyWanted),
      created_at: new Date().toISOString(),
      source: 'apex-dashboard',
    }

    if (!record.name || !record.contact || !record.inquiry_type || !record.message) {
      return res.status(400).json({
        ok: false,
        error: 'validation_error',
        message: '必須項目を入力してください。',
      })
    }

    const result = await saveToSupabase(record)

    if (!result.stored) {
      console.log('contact form received without persistence backend', record)
    }

    return res.status(200).json({
      ok: true,
      stored: result.stored,
      mode: result.mode,
    })
  } catch (error) {
    console.error('contact api error', error instanceof Error ? error.message : error)
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      message: '問い合わせの送信に失敗しました。時間をおいて再度お試しください。',
    })
  }
}
