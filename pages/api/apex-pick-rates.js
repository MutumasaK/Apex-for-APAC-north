import * as cheerio from 'cheerio'
import { resolveLegendIcon } from '../../lib/legend-icons'

const PICK_RATE_DIAMOND_URL =
  'https://apexlegendsstatus.com/game-stats/legends-pick-rates/Diamond'

const PICK_RATE_MP_URL =
  'https://apexlegendsstatus.com/game-stats/legends-pick-rates/Masterpred'

const LEGEND_ORDER = [
  'Axle',
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

function getLegendImage(legend) {
  return resolveLegendIcon(legend)
}

function extractLegendRates(html) {
  const $ = cheerio.load(html)
  const text = htmlToSearchableText(html)
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
      image: getLegendImage(legend),
      icon: getLegendImage(legend),
    })
  }

  return results.sort((a, b) => b.pickRate - a.pickRate)
}

async function fetchTierPickRates(url) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
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
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const extracted = extractLegendRates(await response.text())

    if (!extracted.length) {
      return null
    }

    return extracted.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      name: item.name,
      pickRate: item.pickRateLabel,
      pickRateValue: item.pickRate,
      pickRateLabel: item.pickRateLabel,
      image: item.image,
      icon: item.icon,
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

function buildFallbackPayload() {
  const updatedAt = '現在データ確認中'
  const diamondLegends = [
    ['Axle', '27.4%', 27.4],
    ['Conduit', '17.8%', 17.8],
    ['Valkyrie', '10.1%', 10.1],
    ['Mad Maggie', '9.7%', 9.7],
    ['Octane', '5.9%', 5.9],
  ].map(([name, pickRateLabel, pickRateValue], index) => ({
    rank: index + 1,
    name,
    pickRate: pickRateLabel,
    pickRateValue,
    pickRateLabel,
    image: getLegendImage(name),
    icon: getLegendImage(name),
  }))
  const masterPredatorLegends = [
    ['Axle', '33.0%', 33.0],
    ['Conduit', '16.6%', 16.6],
    ['Valkyrie', '14.5%', 14.5],
    ['Mad Maggie', '6.2%', 6.2],
    ['Octane', '4.6%', 4.6],
  ].map(([name, pickRateLabel, pickRateValue], index) => ({
    rank: index + 1,
    name,
    pickRate: pickRateLabel,
    pickRateValue,
    pickRateLabel,
    image: getLegendImage(name),
    icon: getLegendImage(name),
  }))

  return {
    updatedAt,
    sourceLabel: 'Diamond',
    legends: diamondLegends,
    diamond: {
      legends: diamondLegends,
      updatedAt,
      sourceLabel: 'Diamond',
      message: '現在データ確認中',
    },
    masterPredator: {
      legends: masterPredatorLegends,
      updatedAt,
      sourceLabel: 'Master / Predator',
      message: 'Master / Predator は現在データ確認中',
    },
    message: '現在データ確認中',
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  try {
    const [diamondResult, mpResult] = await Promise.all([
      fetchTierPickRates(PICK_RATE_DIAMOND_URL),
      fetchTierPickRates(PICK_RATE_MP_URL),
    ])

    const updatedAt = formatCurrentTime()
    const result = {}

    if (diamondResult && diamondResult.length > 0) {
      result.diamond = {
        legends: diamondResult,
        updatedAt,
        sourceLabel: 'Diamond',
        sourceUrl: PICK_RATE_DIAMOND_URL,
      }
      result.legends = diamondResult
      result.updatedAt = updatedAt
      result.sourceLabel = 'Diamond'
    } else {
      result.diamond = buildFallbackPayload().diamond
      result.legends = result.diamond.legends
      result.updatedAt = updatedAt
      result.sourceLabel = 'Diamond'
    }

    if (mpResult && mpResult.length > 0) {
      result.masterPredator = {
        legends: mpResult,
        updatedAt,
        sourceLabel: 'Master / Predator',
        sourceUrl: PICK_RATE_MP_URL,
      }
    } else {
      result.masterPredator = {
        legends: [],
        updatedAt,
        sourceLabel: 'Master / Predator',
        message: 'Master / Predator は現在データ確認中',
      }
    }

    if (Object.keys(result).length === 0) {
      return res.status(200).json(buildFallbackPayload())
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('apex-pick-rates handler error:', error instanceof Error ? error.message : error)
    return res.status(200).json(buildFallbackPayload())
  }
}
