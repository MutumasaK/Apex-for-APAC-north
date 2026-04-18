import * as cheerio from 'cheerio'

const SITE_ORIGIN = 'https://apexlegendsstatus.com'
const PRO_LEAGUE_SOURCE_URL =
  `${SITE_ORIGIN}/algs/Y6-Split1/Pro-League/APAC_N/Overview#tab_scores`

const DEFAULT_ERROR_MESSAGE = '現在のPro League総合順位は取得できませんでした。'
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

function normalize(text = '') {
  return String(text)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toAbsoluteUrl(path = '') {
  if (!path) return ''
  return path.startsWith('http') ? path : `${SITE_ORIGIN}${path}`
}

function buildErrorPayload(message = DEFAULT_ERROR_MESSAGE) {
  return {
    ok: false,
    items: [],
    message,
    sourceUrl: PRO_LEAGUE_SOURCE_URL,
  }
}

function sanitizeTeamName(text = '') {
  return normalize(text).replace(/\s+\d+$/, '')
}

function extractPlayers(row, $) {
  const anchorPlayers = row
    .find('.team-players a')
    .toArray()
    .map((element) => normalize($(element).text()))
    .filter(Boolean)

  if (anchorPlayers.length > 0) {
    return anchorPlayers
  }

  const text = normalize(row.find('.team-players').first().text())
  if (!text) {
    return []
  }

  return text
    .split('/')
    .map((player) => normalize(player))
    .filter(Boolean)
}

function extractStandingsFromDom(html) {
  const $ = cheerio.load(html)
  const rows = $('.score-table_row')
    .toArray()
    .map((element) => $(element))
    .filter((row) => row.find('.rank-number').length > 0 && row.find('.team-name').length > 0)

  return rows.slice(0, 5).map((row) => {
    const rank = Number(normalize(row.find('.rank-number').first().text()))
    const teamName = sanitizeTeamName(row.find('.team-name').first().text())
    const score = Number(normalize(row.find('.team-score').first().text()))
    const kills = Number(normalize(row.find('.team-kills').first().text()))
    const players = extractPlayers(row, $)
    const iconUrl = toAbsoluteUrl(row.find('img.team-logo-bg').first().attr('src') || '')

    return {
      rank,
      teamName,
      score,
      kills,
      players,
      iconUrl,
    }
  })
    .filter((item) => item.rank > 0 && item.teamName && Number.isFinite(item.score) && Number.isFinite(item.kills))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  res.setHeader('Cache-Control', CACHE_CONTROL)

  try {
    const response = await fetch(PRO_LEAGUE_SOURCE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return res.status(200).json(buildErrorPayload())
    }

    const html = await response.text()
    const items = extractStandingsFromDom(html)

    if (items.length === 0) {
      return res.status(200).json(buildErrorPayload())
    }

    return res.status(200).json({
      ok: true,
      items,
      sourceUrl: PRO_LEAGUE_SOURCE_URL,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('apex-proleague error', error instanceof Error ? error.message : error)
    return res.status(200).json(buildErrorPayload())
  }
}
