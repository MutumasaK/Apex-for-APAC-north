import * as cheerio from 'cheerio'
import { resolveLegendIcon } from './legend-icons'

export const SITE_ORIGIN = 'https://apexlegendsstatus.com'
export const ALGS_INDEX_URL = `${SITE_ORIGIN}/algs/`
export const FALLBACK_PRO_LEAGUE_OVERVIEW_URL =
  `${SITE_ORIGIN}/algs/Y6-Split1/Pro-League/APAC_N/Overview`

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  Referer: 'https://apexlegendsstatus.com/',
}

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

export function formatJstDateTime(date = new Date()) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)

  return `${jst.getUTCFullYear()}/${pad2(jst.getUTCMonth() + 1)}/${pad2(jst.getUTCDate())} ${pad2(
    jst.getUTCHours()
  )}:${pad2(jst.getUTCMinutes())} JST`
}

function normalizeText(text = '') {
  return String(text).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function toAbsoluteUrl(path = '') {
  if (!path) return ''
  return path.startsWith('http') ? path : `${SITE_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractReadableText(html) {
  return normalizeText(
    String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
  )
}

async function fetchHtml(url) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Upstream status ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

function normalizeOverviewUrl(url) {
  const absolute = toAbsoluteUrl(url).split('#')[0].split('?')[0]
  const overview = absolute.replace(/\/Day\d+\/[^/]+$/i, '/Overview')
  return overview.endsWith('/Overview') ? overview : overview.replace(/\/$/, '') + '/Overview'
}

function sourceLabelFromUrl(url) {
  const match = url.match(/\/algs\/(Y\d+)-Split(\d+)\/Pro-League\/APAC_N/i)
  if (!match) return 'ALGS APAC North Pro League'
  return `ALGS Year ${match[1].slice(1)} Split ${match[2]} Pro League APAC North`
}

export async function resolveLatestApacNorthProLeagueUrl() {
  try {
    const html = await fetchHtml(ALGS_INDEX_URL)
    const $ = cheerio.load(html)
    const links = $('a')
      .toArray()
      .map((element) => ({
        label: normalizeText($(element).text()),
        href: toAbsoluteUrl($(element).attr('href') || ''),
      }))
      .filter((link) => /\/algs\/Y\d+-Split\d+\/Pro-League\/APAC_N\//i.test(link.href))

    const latest = links.find((link) => /latest/i.test(link.label))
    if (latest) {
      return {
        url: normalizeOverviewUrl(latest.href),
        sourceLabel: sourceLabelFromUrl(latest.href),
        resolvedFrom: latest.href,
        usedFallback: false,
      }
    }

    const splitLinks = links
      .filter((link) => /Pro League - Split \d/i.test(link.label))
      .map((link) => {
        const match = link.href.match(/\/algs\/Y(\d+)-Split(\d+)\//i)
        return {
          ...link,
          year: Number(match?.[1] || 0),
          split: Number(match?.[2] || 0),
        }
      })
      .sort((a, b) => b.year - a.year || b.split - a.split)

    if (splitLinks[0]) {
      return {
        url: normalizeOverviewUrl(splitLinks[0].href),
        sourceLabel: sourceLabelFromUrl(splitLinks[0].href),
        resolvedFrom: splitLinks[0].href,
        usedFallback: false,
      }
    }
  } catch (error) {
    console.error('resolveLatestApacNorthProLeagueUrl error', error instanceof Error ? error.message : error)
  }

  return {
    url: FALLBACK_PRO_LEAGUE_OVERVIEW_URL,
    sourceLabel: sourceLabelFromUrl(FALLBACK_PRO_LEAGUE_OVERVIEW_URL),
    resolvedFrom: ALGS_INDEX_URL,
    usedFallback: true,
  }
}

function getLegendIcon($, legend) {
  const escaped = legend.replace(/"/g, '\\"')
  const image = $(`img[alt*="${escaped}" i]`).first()
  const iconFromPage = toAbsoluteUrl(image.attr('src') || '')
  if (iconFromPage) return iconFromPage

  return resolveLegendIcon(legend)
}

function buildCompComment(legends) {
  const has = (name) => legends.includes(name)

  if (has('Bangalore') && has('Catalyst') && has('Bloodhound')) {
    return '射線切りと索敵を両立しやすい安定構成'
  }

  if (has('Wraith') && (has('Wattson') || has('Caustic'))) {
    return '移動とエリア維持を組み合わせた終盤寄りの構成'
  }

  if (has('Valkyrie')) {
    return 'リポジションを重視し、苦しい安置でも立て直しやすい構成'
  }

  if (has('Crypto') || has('Bloodhound') || has('Seer')) {
    return '情報取得を軸に、先入りと接敵判断を安定させやすい構成'
  }

  return '大会環境で採用が目立つバランス型の構成'
}

export async function fetchProLeagueComps(overviewUrl, meta = {}) {
  const html = await fetchHtml(overviewUrl)
  const $ = cheerio.load(html)
  const text = extractReadableText(html)
  const compositionStart = text.search(/Teams Compositions? Data/i)
  const scopedText = compositionStart >= 0 ? text.slice(compositionStart) : text
  const legendPattern = LEGENDS.map(escapeRegExp).join('|')
  const compositionRegex = new RegExp(
    `\\b(${legendPattern}),\\s*(${legendPattern}),\\s*(${legendPattern})\\s+([0-9]+(?:\\.[0-9]+)?%)`,
    'g'
  )

  const byComposition = new Map()
  let match = compositionRegex.exec(scopedText)

  while (match) {
    const legends = [match[1], match[2], match[3]]
    const key = legends.join('|')
    const numericPickRate = Number(match[4].replace('%', ''))

    if (!byComposition.has(key) && Number.isFinite(numericPickRate)) {
      byComposition.set(key, {
        legends,
        pickRate: match[4],
        numericPickRate,
      })
    }

    match = compositionRegex.exec(scopedText)
  }

  const comps = [...byComposition.values()]
    .sort((a, b) => b.numericPickRate - a.numericPickRate)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      legends: item.legends,
      composition: item.legends,
      icons: item.legends.map((legend) => getLegendIcon($, legend)).filter(Boolean),
      pickRate: item.pickRate,
      adoptionRate: item.pickRate,
      region: 'APAC North / Pro League',
      tournament: meta.sourceLabel || sourceLabelFromUrl(overviewUrl),
      comment: buildCompComment(item.legends),
    }))

  return {
    comps,
    html,
    sourceUrl: `${overviewUrl}#tab_pickrates`,
  }
}

function sanitizeTeamName(text = '') {
  return normalizeText(text).replace(/\s+\d+$/, '')
}

function extractMembers(row, $) {
  const members = row
    .find('.team-players a')
    .toArray()
    .map((element) => normalizeText($(element).text()))
    .filter(Boolean)

  if (members.length > 0) return members

  return normalizeText(row.find('.team-players').text())
    .split('/')
    .map((member) => normalizeText(member))
    .filter(Boolean)
}

export async function fetchProLeagueStandingsTop5(overviewUrl, existingHtml = null) {
  const html = existingHtml || (await fetchHtml(overviewUrl))
  const $ = cheerio.load(html)
  const rows = $('.score-table_row')
    .toArray()
    .map((element) => $(element))
    .filter((row) => row.find('.rank-number').length > 0 && row.find('.team-name').length > 0)

  const standings = rows
    .map((row) => ({
      rank: Number(normalizeText(row.find('.rank-number').first().text())),
      teamName: sanitizeTeamName(row.find('.team-name').first().text()),
      score: Number(normalizeText(row.find('.team-score').first().text())),
      kills: Number(normalizeText(row.find('.team-kills').first().text())),
      members: extractMembers(row, $),
      icon: toAbsoluteUrl(
        row.find('img.team-logo-bg, img[alt*="logo" i], img').first().attr('src') || ''
      ),
    }))
    .filter((item) => item.rank > 0 && item.teamName && Number.isFinite(item.score) && Number.isFinite(item.kills))
    .slice(0, 5)

  return {
    standings,
    sourceUrl: `${overviewUrl}#tab_scores`,
  }
}
