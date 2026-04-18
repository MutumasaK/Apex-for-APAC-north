import * as cheerio from 'cheerio'

const RANKMAP_SOURCE_URL = 'https://gamefavo.com/news/apex/apex-rotation-schedule/'

const JP = {
  rankMatch: '\u30e9\u30f3\u30af\u30de\u30c3\u30c1',
  current: '\u73fe\u5728',
  next: 'NEXT',
  end: '\u7d42\u4e86',
  verifyGameFavo: '\u6b21\u56de\u66f4\u65b0: GameFavo \u3092\u78ba\u8a8d',
  currentBlockMissing:
    '\u30e9\u30f3\u30af\u30de\u30c3\u30c1\u5185\u306e\u300c\u73fe\u5728\u300d\u30d6\u30ed\u30c3\u30af\u3092\u898b\u3064\u3051\u3089\u308c\u307e\u305b\u3093\u3067\u3057\u305f',
  rankSectionMissing:
    '\u30e9\u30f3\u30af\u30de\u30c3\u30c1\u30bb\u30af\u30b7\u30e7\u30f3\u3092\u898b\u3064\u3051\u3089\u308c\u307e\u305b\u3093\u3067\u3057\u305f',
  mapNameMissing:
    '\u73fe\u5728\u306e\u30e9\u30f3\u30af\u30de\u30c3\u30d7\u540d\u3092\u7279\u5b9a\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f',
  parseFailed:
    '\u30e9\u30f3\u30af\u30de\u30c3\u30d7\u306e\u62bd\u51fa\u306b\u5931\u6557\u3057\u307e\u3057\u305f',
}

const MAP_ASSET_MAP = {
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
  'Kings Canyon': {
    name: 'Kings Canyon',
    slug: 'kings-canyon',
    image: '/maps/kings-canyon.jpg',
  },
}

const MAP_ALIASES = [
  { canonicalName: "World's Edge", aliases: ["World's Edge", 'Worlds Edge', '\u30ef\u30fc\u30eb\u30ba\u30a8\u30c3\u30b8'] },
  { canonicalName: 'Olympus', aliases: ['Olympus', '\u30aa\u30ea\u30f3\u30d1\u30b9'] },
  { canonicalName: 'Storm Point', aliases: ['Storm Point', '\u30b9\u30c8\u30fc\u30e0\u30dd\u30a4\u30f3\u30c8'] },
  { canonicalName: 'Broken Moon', aliases: ['Broken Moon', '\u30d6\u30ed\u30fc\u30af\u30f3\u30e0\u30fc\u30f3'] },
  { canonicalName: 'E-District', aliases: ['E-District', 'EDistrict', 'E District'] },
  { canonicalName: 'Kings Canyon', aliases: ['Kings Canyon', "King's Canyon", '\u30ad\u30f3\u30b0\u30b9\u30ad\u30e3\u30cb\u30aa\u30f3'] },
]

function normalize(text = '') {
  return text.replace(/\s+/g, ' ').trim()
}

function normalizeForMatch(text = '') {
  return normalize(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-_]/g, '')
    .replace(/[()（）]/g, '')
    .replace(/\s+/g, '')
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function buildErrorPayload(errorType, message) {
  return {
    ok: false,
    errorType,
    message,
    sourceUrl: RANKMAP_SOURCE_URL,
  }
}

function getCanonicalMapName(text = '') {
  const normalized = normalizeForMatch(text)
  const matched = MAP_ALIASES.find((entry) =>
    entry.aliases.some((alias) => normalized.includes(normalizeForMatch(alias)))
  )

  return matched?.canonicalName ?? null
}

function extractEndTime(text = '') {
  const match = normalize(text).match(new RegExp(`${JP.end}\\s*(\\d{1,2}:\\d{2})`, 'i'))
  return match?.[1] ?? null
}

function formatNextUpdateLabel(endTime) {
  if (!endTime) {
    return JP.verifyGameFavo
  }

  const match = endTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    return JP.verifyGameFavo
  }

  const now = new Date()
  const nowJst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const hour = Number(match[1])
  const minute = Number(match[2])

  let nextUpdate = new Date(
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate(), hour, minute, 0)
  )

  if (
    nextUpdate.getUTCHours() < nowJst.getUTCHours() ||
    (nextUpdate.getUTCHours() === nowJst.getUTCHours() &&
      nextUpdate.getUTCMinutes() <= nowJst.getUTCMinutes())
  ) {
    nextUpdate = new Date(
      Date.UTC(
        nowJst.getUTCFullYear(),
        nowJst.getUTCMonth(),
        nowJst.getUTCDate() + 1,
        hour,
        minute,
        0
      )
    )
  }

  return `\u6b21\u56de\u66f4\u65b0: ${nextUpdate.getUTCFullYear()}/${pad2(
    nextUpdate.getUTCMonth() + 1
  )}/${pad2(nextUpdate.getUTCDate())} ${pad2(nextUpdate.getUTCHours())}:${pad2(
    nextUpdate.getUTCMinutes()
  )} JST`
}

function extractFromRankSection($, section) {
  const currentCard = $(section)
    .find('.item')
    .toArray()
    .find((element) => normalize($(element).children().first().text()) === JP.current)

  if (!currentCard) {
    throw new Error(JP.currentBlockMissing)
  }

  const cardText = normalize($(currentCard).text())
  const mapName = getCanonicalMapName(cardText)

  if (!mapName) {
    throw new Error(JP.mapNameMissing)
  }

  const asset = MAP_ASSET_MAP[mapName]
  if (!asset) {
    throw new Error(`Unsupported map: ${mapName}`)
  }

  return {
    ok: true,
    name: asset.name,
    slug: asset.slug,
    image: asset.image,
    updatedAtLabel: formatNextUpdateLabel(extractEndTime(cardText)),
    sourceUrl: RANKMAP_SOURCE_URL,
  }
}

function extractFromStructuredDom($) {
  const heading = $('h3')
    .toArray()
    .find((element) => normalize($(element).text()) === JP.rankMatch)

  if (!heading) {
    throw new Error(JP.rankSectionMissing)
  }

  const section = $(heading).next('.marbox2')
  if (!section.length) {
    throw new Error(JP.rankSectionMissing)
  }

  return extractFromRankSection($, section)
}

function extractFromLooseDom($) {
  const candidateSections = $('div.marbox2')
    .toArray()
    .filter((section) => {
      const text = normalize($(section).text())
      return text.includes(JP.current) && text.includes(JP.next)
    })

  for (const section of candidateSections) {
    const text = normalize($(section).text())
    if (!MAP_ALIASES.some((entry) => entry.aliases.some((alias) => text.includes(alias)))) {
      continue
    }

    try {
      return extractFromRankSection($, section)
    } catch (error) {
      continue
    }
  }

  throw new Error(JP.rankSectionMissing)
}

function extractCurrentRankMap(html) {
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()

  const extractors = [extractFromStructuredDom, extractFromLooseDom]
  const reasons = []

  for (const extractor of extractors) {
    try {
      return extractor($)
    } catch (error) {
      reasons.push(error instanceof Error ? error.message : String(error))
    }
  }

  throw new Error(reasons.join(' / ') || JP.parseFailed)
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
      return res
        .status(200)
        .json(buildErrorPayload('upstream_http_error', `GameFavo request failed: ${response.status}`))
    }

    const html = await response.text()
    return res.status(200).json(extractCurrentRankMap(html))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorType =
      /fetch failed|network|request failed|econn|enotfound|timedout/i.test(message)
        ? 'network_error'
        : 'parse_failed'

    console.error('rankmap error', message)
    return res.status(200).json(buildErrorPayload(errorType, message))
  }
}
