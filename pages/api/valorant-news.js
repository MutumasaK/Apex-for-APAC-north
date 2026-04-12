import * as cheerio from 'cheerio'

const VALORANT_NEWS_URL = 'https://playvalorant.com/ja-jp/news/'
const VALORANT_NEWS_BASE_URL = 'https://playvalorant.com'

function normalize(text = '') {
  return text.replace(/\s+/g, ' ').trim()
}

function summarize(text, max = 100) {
  const normalized = normalize(text)
  if (!normalized) return ''
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized
}

function toAbsoluteUrl(href = '') {
  return href.startsWith('http') ? href : `${VALORANT_NEWS_BASE_URL}${href}`
}

function isOfficialNewsLink(href = '') {
  if (!href) return false
  if (href.startsWith('https://playvalorant.com/ja-jp/news/')) return true
  if (href.startsWith('/ja-jp/news/')) return true
  if (href.startsWith('https://valorantesports.com/')) return true
  if (href.startsWith('https://www.youtube.com/')) return true
  return false
}

function categoryLabelFromText(text = '') {
  if (text.startsWith('eスポーツ')) return 'Esports'
  if (text.startsWith('ゲームアップデート')) return 'Update'
  if (text.startsWith('コミュニティー')) return 'Community'
  if (text.startsWith('Dev')) return 'Dev'
  if (text.startsWith('ライフスタイル')) return 'Lifestyle'
  return 'VALORANT Official'
}

function formatIsoDate(isoText = '') {
  const date = new Date(isoText)
  if (Number.isNaN(date.getTime())) return '最新'

  return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(
    date.getUTCDate()
  ).padStart(2, '0')}`
}

function parseAnchorText(text) {
  const normalized = normalize(text)
  const match = normalized.match(
    /^(eスポーツ|ゲームアップデート|コミュニティー|Dev|ライフスタイル)\s+(\d{4}-\d{2}-\d{2}T[^ ]+)\s+(.+)$/
  )

  if (!match) {
    return null
  }

  return {
    rawCategory: match[1],
    dateIso: match[2],
    remainder: normalize(match[3]),
  }
}

function extractTitle(anchor, $) {
  const headingText = normalize(anchor.find('h1, h2, h3, h4').first().text())
  if (headingText) return headingText

  const parsed = parseAnchorText(anchor.text())
  if (!parsed) {
    return normalize(anchor.attr('aria-label') || anchor.text())
  }

  return parsed.remainder
}

function extractSummary(anchor, title, dateIso) {
  const parsed = parseAnchorText(anchor.text())
  if (!parsed) {
    return summarize(title)
  }

  const remainder = parsed.remainder
  const summary = normalize(remainder.replace(title, ' ').replace(dateIso, ' '))
  return summarize(summary || title)
}

function toNewsItems(html) {
  const $ = cheerio.load(html)
  const items = []
  const seen = new Set()

  $('a[href]').each((_, element) => {
    const anchor = $(element)
    const href = anchor.attr('href') || ''
    if (!isOfficialNewsLink(href)) return

    const fullUrl = toAbsoluteUrl(href)
    if (seen.has(fullUrl)) return

    const parsed = parseAnchorText(anchor.text())
    const title = extractTitle(anchor, $)
    if (!title || title.length < 6) return

    const date = parsed ? formatIsoDate(parsed.dateIso) : '最新'
    const category = parsed ? categoryLabelFromText(parsed.rawCategory) : 'VALORANT Official'
    const summary = extractSummary(anchor, title, parsed?.dateIso || '')

    items.push({
      id: fullUrl,
      title,
      href: fullUrl,
      url: fullUrl,
      date,
      category,
      summary,
      source: 'VALORANT Official',
    })

    seen.add(fullUrl)
  })

  return items.slice(0, 5)
}

function fallbackItems() {
  return [
    {
      id: 'valorant-news-fallback',
      title: 'VALORANT 最新ニュースを取得できませんでした',
      href: VALORANT_NEWS_URL,
      url: VALORANT_NEWS_URL,
      date: '最新',
      category: 'VALORANT Official',
      summary: 'VALORANT公式ニュースページへのリンクを表示しています。',
      source: 'VALORANT Official',
    },
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const response = await fetch(VALORANT_NEWS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    const html = await response.text()
    const items = toNewsItems(html)

    return res.status(200).json(items.length > 0 ? items : fallbackItems())
  } catch (error) {
    console.error('valorant-news error', error instanceof Error ? error.message : error)
    return res.status(200).json(fallbackItems())
  }
}
