import * as cheerio from 'cheerio'

const RANKMAP_SOURCE_URL = 'https://gamefavo.com/news/apex/apex-rotation-schedule/'

const MAP_ASSET_MAP = {
  "World's Edge": {
    name: "World's Edge",
    slug: 'worlds-edge',
    image: '/maps/worlds-edge.jpg',
  },
  'Worlds Edge': {
    name: "World's Edge",
    slug: 'worlds-edge',
    image: '/maps/worlds-edge.jpg',
  },
  Olympus: {
    name: 'Olympus',
    slug: 'olympus',
    image: '/maps/olympus.jpg',
  },
  'Storm Point': {
    name: 'Storm Point',
    slug: 'storm-point',
    image: '/maps/storm-point.jpg',
  },
  'Broken Moon': {
    name: 'Broken Moon',
    slug: 'broken-moon',
    image: '/maps/broken-moon.jpg',
  },
  'E-District': {
    name: 'E-District',
    slug: 'e-district',
    image: '/maps/e-district.jpg',
  },
  'Kings Canyon': {
    name: 'Kings Canyon',
    slug: 'kings-canyon',
    image: '/maps/kings-canyon.jpg',
  },
}

function normalize(text = '') {
  return text.replace(/\s+/g, ' ').trim()
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function extractLines(html) {
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()

  return $('body')
    .text()
    .split(/[\r\n]+/)
    .map((line) => normalize(line))
    .filter(Boolean)
}

function extractSection(lines, sectionTitle) {
  const sectionStart = lines.findIndex((line) => line === sectionTitle)
  if (sectionStart === -1) {
    throw new Error(`${sectionTitle} セクションを検出できませんでした。`)
  }

  const nextHeadings = ['###', '## ', 'Apex Legends グッズ', 'まとめ記事', 'おすすめページ']
  let sectionEnd = lines.length

  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (
      line.startsWith('### ') ||
      line.startsWith('## ') ||
      nextHeadings.includes(line)
    ) {
      sectionEnd = index
      break
    }
  }

  return lines.slice(sectionStart, sectionEnd)
}

function findCurrentBlock(lines) {
  const currentIndex = lines.findIndex((line) => line === '現在')
  if (currentIndex === -1) {
    throw new Error('現在ブロックを検出できませんでした。')
  }

  const nextIndex = lines.findIndex((line, index) => index > currentIndex && line === 'NEXT')
  return nextIndex === -1 ? lines.slice(currentIndex + 1) : lines.slice(currentIndex + 1, nextIndex)
}

function extractMapName(blockLines) {
  const mapName = blockLines.find((line) => MAP_ASSET_MAP[line])
  if (!mapName) {
    throw new Error('現在のランクマップ名を検出できませんでした。')
  }

  return mapName
}

function extractEndTime(blockLines) {
  const endLine = blockLines.find((line) => /^終了\s*\d{1,2}:\d{2}$/.test(line))
  if (!endLine) {
    return null
  }

  return endLine.replace(/^終了\s*/, '')
}

function formatNextUpdateLabel(endTime) {
  if (!endTime) {
    return '次回更新: GameFavo を参照'
  }

  const match = endTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return '次回更新: GameFavo を参照'
  }

  const now = new Date()
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const hour = Number(match[1])
  const minute = Number(match[2])

  let nextUpdate = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate(), hour, minute, 0)
  )

  if (
    nextUpdate.getUTCHours() < jstNow.getUTCHours() ||
    (nextUpdate.getUTCHours() === jstNow.getUTCHours() &&
      nextUpdate.getUTCMinutes() <= jstNow.getUTCMinutes())
  ) {
    nextUpdate = new Date(
      Date.UTC(
        jstNow.getUTCFullYear(),
        jstNow.getUTCMonth(),
        jstNow.getUTCDate() + 1,
        hour,
        minute,
        0
      )
    )
  }

  return `次回更新: ${nextUpdate.getUTCFullYear()}/${pad2(nextUpdate.getUTCMonth() + 1)}/${pad2(
    nextUpdate.getUTCDate()
  )} ${pad2(nextUpdate.getUTCHours())}:${pad2(nextUpdate.getUTCMinutes())} JST`
}

function fallbackPayload() {
  return {
    name: 'Olympus',
    mapName: 'Olympus',
    slug: 'olympus',
    image: '/maps/olympus.jpg',
    updatedAtLabel: '次回更新: GameFavo 取得失敗',
    sourceUrl: RANKMAP_SOURCE_URL,
  }
}

function extractCurrentRankMap(lines) {
  const rankSection = extractSection(lines, 'ランクマッチ')
  const currentBlock = findCurrentBlock(rankSection)
  const mapName = extractMapName(currentBlock)
  const endTime = extractEndTime(currentBlock)
  const asset = MAP_ASSET_MAP[mapName]

  return {
    ...asset,
    updatedAtLabel: formatNextUpdateLabel(endTime),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const response = await fetch(RANKMAP_SOURCE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    const html = await response.text()
    const lines = extractLines(html)
    const current = extractCurrentRankMap(lines)

    return res.status(200).json({
      name: current.name,
      mapName: current.name,
      slug: current.slug,
      image: current.image,
      updatedAtLabel: current.updatedAtLabel,
      sourceUrl: RANKMAP_SOURCE_URL,
    })
  } catch (error) {
    console.error('rankmap error', error instanceof Error ? error.message : error)
    return res.status(200).json(fallbackPayload())
  }
}
