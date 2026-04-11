import axios from 'axios'
import * as cheerio from 'cheerio'

const RANKMAP_SOURCE_URL =
  'https://gamefavo.com/news/apex/apex-rotation-schedule/'

const MAP_ASSET_MAP = {
  'World’s Edge': {
    name: "World's Edge",
    slug: 'worlds-edge',
    image: '/maps/worlds-edge.jpg',
  },
  "World's Edge": {
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
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatNextUpdateLabel(endTime) {
  const match = endTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return '情報源: GameFavo'
  }

  const now = new Date()
  const jstMs = now.getTime() + 9 * 60 * 60 * 1000
  const jst = new Date(jstMs)

  const hour = Number(match[1])
  const minute = Number(match[2])

  let nextJst = new Date(
    Date.UTC(
      jst.getUTCFullYear(),
      jst.getUTCMonth(),
      jst.getUTCDate(),
      hour,
      minute,
      0
    )
  )

  if (
    nextJst.getUTCHours() < jst.getUTCHours() ||
    (nextJst.getUTCHours() === jst.getUTCHours() &&
      nextJst.getUTCMinutes() <= jst.getUTCMinutes())
  ) {
    nextJst = new Date(
      Date.UTC(
        jst.getUTCFullYear(),
        jst.getUTCMonth(),
        jst.getUTCDate() + 1,
        hour,
        minute,
        0
      )
    )
  }

  return `次回更新: ${nextJst.getUTCFullYear()}/${pad2(nextJst.getUTCMonth() + 1)}/${pad2(
    nextJst.getUTCDate()
  )} ${pad2(nextJst.getUTCHours())}:${pad2(nextJst.getUTCMinutes())}`
}

function extractRankSectionLines(html) {
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()

  return $('body')
    .text()
    .split(/[\r\n]+/)
    .map((line) => normalize(line))
    .filter(Boolean)
}

function isUsefulMapLine(line) {
  return (
    Boolean(MAP_ASSET_MAP[line]) &&
    !line.startsWith('開始') &&
    !line.startsWith('終了') &&
    !line.startsWith('残り')
  )
}

function extractRankMatchCurrent(lines) {
  const rankIndex = lines.findIndex((line) => line === 'ランクマッチ')
  if (rankIndex === -1) {
    throw new Error('rankmatch section not found')
  }

  const currentIndex = lines.findIndex(
    (line, index) => index > rankIndex && line === '現在'
  )
  if (currentIndex === -1) {
    throw new Error('current rankmatch block not found')
  }

  const nextIndex = lines.findIndex((line, index) => index > currentIndex && line === 'NEXT')
  const currentBlock =
    nextIndex === -1 ? lines.slice(currentIndex + 1) : lines.slice(currentIndex + 1, nextIndex)

  const currentMapName = currentBlock.find(isUsefulMapLine)
  const endLine = currentBlock.find((line) => line.startsWith('終了 '))

  if (!currentMapName) {
    throw new Error('current map name not found')
  }

  const asset = MAP_ASSET_MAP[currentMapName]
  if (!asset) {
    throw new Error(`unknown map: ${currentMapName}`)
  }

  return {
    ...asset,
    updatedAtLabel: formatNextUpdateLabel(endLine?.replace(/^終了\s*/, '') ?? ''),
  }
}

export default async function handler(req, res) {
  try {
    const response = await axios.get(RANKMAP_SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    const lines = extractRankSectionLines(response.data)
    const current = extractRankMatchCurrent(lines)

    return res.status(200).json({
      name: current.name,
      mapName: current.name,
      slug: current.slug,
      image: current.image,
      updatedAtLabel: current.updatedAtLabel,
      sourceUrl: RANKMAP_SOURCE_URL,
    })
  } catch (error) {
    return res.status(200).json({
      name: 'E-District',
      mapName: 'E-District',
      slug: 'e-district',
      image: '/maps/e-district.jpg',
      updatedAtLabel: '情報源: GameFavo 取得失敗時の表示',
      sourceUrl: RANKMAP_SOURCE_URL,
    })
  }
}
