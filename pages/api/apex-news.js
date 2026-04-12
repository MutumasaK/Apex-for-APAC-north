import * as cheerio from 'cheerio'

const APEX_NEWS_URL = 'https://www.ea.com/ja/games/apex-legends/apex-legends/news?page=1&type=latest'
const APEX_NEWS_BASE_URL = 'https://www.ea.com'

function normalize(text = '') {
  return text.replace(/\s+/g, ' ').trim()
}

function summarize(text, max = 100) {
  const normalized = normalize(text)
  if (!normalized) return ''
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized
}

function toAbsoluteUrl(href = '') {
  return href.startsWith('http') ? href : `${APEX_NEWS_BASE_URL}${href}`
}

function isNewsPath(href = '') {
  return /\/ja\/games\/apex-legends\/apex-legends\/news\/[^/?#]+/.test(href)
}

function extractTitle(anchor, $) {
  const headingText = normalize(anchor.find('h1, h2, h3, h4').first().text())
  if (headingText) return headingText

  const ariaLabel = normalize(anchor.attr('aria-label') || '')
  if (ariaLabel) return ariaLabel

  const text = normalize(anchor.text())
  const match = text.match(
    /^(?:News Article|ニュース記事|Game Update|ゲームアップデート|Patch Notes|パッチノート)?\s*(?:[A-Za-z]+\s+\d{1,2},\s+\d{4}|\d{4}年\d{1,2}月\d{1,2}日)?\s*(.+)$/
  )

  return normalize(match?.[1] || text)
}

function extractDate(container, $) {
  const timeText = normalize(container.find('time').first().text())
  if (timeText) return timeText

  const text = normalize(container.text())
  const match =
    text.match(/[A-Za-z]+\s+\d{1,2},\s+\d{4}/) ||
    text.match(/\d{4}年\d{1,2}月\d{1,2}日/) ||
    text.match(/\d{4}[./-]\d{1,2}[./-]\d{1,2}/)

  return normalize(match?.[0] || '最新')
}

function extractCategory(container, $) {
  const text = normalize(container.text())

  if (/Patch Notes|パッチノート/i.test(text)) return 'Patch Notes'
  if (/Game Update|ゲームアップデート/i.test(text)) return 'Game Update'
  if (/News Article|ニュース記事/i.test(text)) return 'News'

  const tagText = normalize(
    container.find('[class*="tag"], [class*="category"], [class*="eyebrow"]').first().text()
  )

  return tagText || 'EA Official'
}

function extractSummary(container, title, date, category) {
  const text = normalize(container.text())

  const cleaned = normalize(
    text
      .replace(title, ' ')
      .replace(date, ' ')
      .replace(category, ' ')
      .replace(/News Article|ニュース記事|Game Update|ゲームアップデート|Patch Notes|パッチノート/g, ' ')
  )

  return summarize(cleaned || title)
}

function toNewsItems(html) {
  const $ = cheerio.load(html)
  const items = []
  const seen = new Set()

  $('a[href]').each((_, element) => {
    const anchor = $(element)
    const href = anchor.attr('href') || ''
    if (!isNewsPath(href)) return

    const fullUrl = toAbsoluteUrl(href)
    if (seen.has(fullUrl)) return

    const container = anchor.closest('article, li, section, div')
    const title = extractTitle(anchor, $)
    if (!title || title.length < 6) return

    const date = extractDate(container, $)
    const category = extractCategory(container, $)
    const summary = extractSummary(container, title, date, category)

    items.push({
      id: fullUrl,
      title,
      href: fullUrl,
      url: fullUrl,
      date,
      category,
      summary,
      source: 'EA Official',
    })

    seen.add(fullUrl)
  })

  return items.slice(0, 5)
}

function fallbackItems() {
  return [
    {
      id: 'apex-news-fallback',
      title: 'Apex 最新ニュースを取得できませんでした',
      href: APEX_NEWS_URL,
      url: APEX_NEWS_URL,
      date: '最新',
      category: 'EA Official',
      summary: 'EA公式ニュースページへのリンクを表示しています。',
      source: 'EA Official',
    },
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const response = await fetch(APEX_NEWS_URL, {
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
    console.error('apex-news error', error instanceof Error ? error.message : error)
    return res.status(200).json(fallbackItems())
  }
}
