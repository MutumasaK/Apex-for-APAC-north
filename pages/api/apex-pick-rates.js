const PICK_RATE_DIAMOND_URL =
  'https://apexlegendsstatus.com/game-stats/legends-pick-rates/Diamond'

const PICK_RATE_MP_URL =
  'https://apexlegendsstatus.com/game-stats/legends-pick-rates/Master'

const LEGEND_ORDER = [
  'Octane',
  'Mad Maggie',
  'Alter',
  'Valkyrie',
  'Bangalore',
  'Wraith',
  'Gibraltar',
  'Revenant',
  'Conduit',
  'Sparrow',
  'Pathfinder',
  'Lifeline',
  'Horizon',
  'Fuse',
  'Mirage',
  'Wattson',
  'Loba',
  'Ash',
  'Caustic',
  'Crypto',
  'Seer',
  'Newcastle',
  'Ballistic',
  'Catalyst',
  'Vantage',
  'Rampart',
  'Bloodhound',
]

function getNextMidnightJstLabel(date = new Date()) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const next = new Date(jst)
  next.setUTCHours(15, 0, 0, 0)

  if (jst.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }

  const year = next.getUTCFullYear()
  const month = String(next.getUTCMonth() + 1).padStart(2, '0')
  const day = String(next.getUTCDate()).padStart(2, '0')

  return `${year}/${month}/${day} 00:00 JST`
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function htmlToSearchableText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|tr|td|th)>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLegendRates(text) {
  const results = []

  for (const legend of LEGEND_ORDER) {
    const regex = new RegExp(`${escapeRegExp(legend)}\\s+([0-9]+(?:\\.[0-9]+)?)%`, 'i')
    const match = text.match(regex)

    if (!match) continue

    const rate = Number(match[1])
    if (Number.isNaN(rate)) continue

    results.push({
      name: legend,
      pickRate: rate,
      pickRateLabel: `${rate.toFixed(1)}%`,
    })
  }

  return results.sort((a, b) => b.pickRate - a.pickRate)
}

async function fetchTierPickRates(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Referer: 'https://apexlegendsstatus.com/',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    const extracted = extractLegendRates(htmlToSearchableText(html))

    if (!extracted.length) {
      return null
    }

    return extracted.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      name: item.name,
      pickRate: item.pickRate,
    }))
  } catch (error) {
    console.error(`Fetch tier pick rates error for ${url}:`, error instanceof Error ? error.message : error)
    return null
  }
}

function formatCurrentTime() {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = jst.getUTCFullYear()
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  const hour = String(jst.getUTCHours()).padStart(2, '0')
  const minute = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute} JST`
}

export default async function handler(req, res) {
  const cacheControl = 'public, s-maxage=300, stale-while-revalidate=600'
  res.setHeader('Cache-Control', cacheControl)

  try {
    const [diamondResult, mpResult] = await Promise.all([
      fetchTierPickRates(PICK_RATE_DIAMOND_URL),
      fetchTierPickRates(PICK_RATE_MP_URL),
    ])

    const now = new Date()
    const updatedAt = formatCurrentTime()

    const result = {}

    if (diamondResult && diamondResult.length > 0) {
      result.diamond = {
        legends: diamondResult,
        updatedAt,
      }
    }

    if (mpResult && mpResult.length > 0) {
      result.masterPredator = {
        legends: mpResult,
        updatedAt,
      }
    }

    if (Object.keys(result).length === 0) {
      return res.status(200).json({
        diamond: {
          legends: [
            { rank: 1, name: 'Octane', pickRate: 18.7 },
            { rank: 2, name: 'Mad Maggie', pickRate: 15.8 },
            { rank: 3, name: 'Alter', pickRate: 9.1 },
          ],
          updatedAt: '確認中',
        },
        masterPredator: {
          legends: [
            { rank: 1, name: 'Wraith', pickRate: 16.2 },
            { rank: 2, name: 'Pathfinder', pickRate: 14.5 },
            { rank: 3, name: 'Gibraltar', pickRate: 12.3 },
          ],
          updatedAt: '確認中',
        },
      })
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('apex-pick-rates handler error:', error instanceof Error ? error.message : error)
    return res.status(200).json({
      diamond: {
        legends: [
          { rank: 1, name: 'Octane', pickRate: 18.7 },
          { rank: 2, name: 'Mad Maggie', pickRate: 15.8 },
          { rank: 3, name: 'Alter', pickRate: 9.1 },
        ],
        updatedAt: '確認中',
      },
      masterPredator: {
        legends: [
          { rank: 1, name: 'Wraith', pickRate: 16.2 },
          { rank: 2, name: 'Pathfinder', pickRate: 14.5 },
          { rank: 3, name: 'Gibraltar', pickRate: 12.3 },
        ],
        updatedAt: '確認中',
      },
    })
  }
}
