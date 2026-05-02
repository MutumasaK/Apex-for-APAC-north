import * as cheerio from 'cheerio'

const SOURCE_URL = 'https://apexlegendsstatus.com/algs/Y6-Split1/Pro-League/APAC_N/Overview'
const FAILURE_MESSAGE = 'ALGS Pro Leagueの最新Pick率を取得できませんでした'
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

const LEGENDS = [
  'Alter',
  'Ash',
  'Ballistic',
  'Bangalore',
  'Bloodhound',
  'Catalyst',
  'Caustic',
  'Conduit',
  'Crypto',
  'Fuse',
  'Gibraltar',
  'Horizon',
  'Lifeline',
  'Loba',
  'Mad Maggie',
  'Mirage',
  'Newcastle',
  'Octane',
  'Pathfinder',
  'Rampart',
  'Revenant',
  'Seer',
  'Sparrow',
  'Valkyrie',
  'Vantage',
  'Wattson',
  'Wraith',
]

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatUpdatedAtLabel(date = new Date()) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)

  return `取得日時: ${jst.getUTCFullYear()}/${pad2(jst.getUTCMonth() + 1)}/${pad2(
    jst.getUTCDate()
  )} ${pad2(jst.getUTCHours())}:${pad2(jst.getUTCMinutes())}`
}

function buildPayload(items, message = null) {
  return {
    source: 'Apex Legends Status',
    region: 'APAC North',
    league: 'ALGS Year 6 Split 1 Pro League',
    items,
    updatedAtLabel: formatUpdatedAtLabel(),
    sourceUrl: SOURCE_URL,
    message,
  }
}

function buildFailurePayload() {
  return buildPayload([], FAILURE_MESSAGE)
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(text = '') {
  return String(text).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractReadableText(html) {
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()
  return normalizeText($.root().text())
}

function extractCompositionItems(html) {
  const text = extractReadableText(html)
  const compositionStart = text.indexOf('Teams Compositions data')
  const scopedText = compositionStart >= 0 ? text.slice(compositionStart) : text
  const legendPattern = LEGENDS.map(escapeRegExp).join('|')
  const compositionRegex = new RegExp(
    `\\b(${legendPattern}),\\s*(${legendPattern}),\\s*(${legendPattern})\\s+([0-9]+(?:\\.[0-9]+)?%)`,
    'g'
  )

  const byComposition = new Map()
  let match = compositionRegex.exec(scopedText)

  while (match) {
    const composition = [match[1], match[2], match[3]]
    const key = composition.join('|')
    const numericPickRate = Number(match[4].replace('%', ''))

    if (!byComposition.has(key) && Number.isFinite(numericPickRate)) {
      byComposition.set(key, {
        composition,
        pickRate: match[4],
        numericPickRate,
      })
    }

    match = compositionRegex.exec(scopedText)
  }

  return [...byComposition.values()]
    .sort((a, b) => b.numericPickRate - a.numericPickRate)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      composition: item.composition,
      pickRate: item.pickRate,
    }))
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  res.setHeader('Cache-Control', CACHE_CONTROL)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Referer: 'https://apexlegendsstatus.com/',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return res.status(200).json(buildFailurePayload())
    }

    const items = extractCompositionItems(await response.text())

    if (items.length === 0) {
      return res.status(200).json(buildFailurePayload())
    }

    return res.status(200).json(buildPayload(items))
  } catch (error) {
    console.error('algs-pick-rates error', error instanceof Error ? error.message : error)
    return res.status(200).json(buildFailurePayload())
  }
}
