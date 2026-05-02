import * as cheerio from 'cheerio'

export type ApexGuideMap = {
  slug: string
  title: string
  shortTitle: string
  image: string
  overview: string
  points: string[]
}

export type ApexLegendRateItem = {
  rank: number
  name: string
  pickRate: number
  pickRateLabel: string
}

export type RankMapResult = {
  ok: boolean
  name?: string
  slug?: string
  image?: string
  updatedAtLabel?: string
  sourceUrl: string
  errorType?: string
  message?: string
}

const RANKMAP_SOURCE_URL = 'https://gamefavo.com/news/apex/apex-rotation-schedule/'
const PICK_RATE_URL = 'https://apexlegendsstatus.com/game-stats/legends-pick-rates/Diamond'
const RANK_MAP_ROTATION = [
  { name: 'Olympus', slug: 'olympus', image: '/maps/olympus.jpg' },
  { name: "World's Edge", slug: 'worlds-edge', image: '/maps/worlds-edge.jpg' },
  { name: 'Storm Point', slug: 'storm-point', image: '/maps/storm-point.jpg' },
]

const JP = {
  rankMatch: 'ランクマッチ',
  current: '現在',
  next: 'NEXT',
  end: '終了',
  verifyGameFavo: '次回更新: GameFavo を確認',
  currentBlockMissing: 'ランクマッチ内の「現在」ブロックを見つけられませんでした',
  rankSectionMissing: 'ランクマッチセクションを見つけられませんでした',
  mapNameMissing: '現在のランクマップ名を特定できませんでした',
}

export const APEX_GUIDE_MAPS: ApexGuideMap[] = [
  {
    slug: 'worlds-edge',
    title: "ワールズエッジ / World's Edge",
    shortTitle: 'ワールズエッジ',
    image: '/maps/worlds-edge.jpg',
    overview: '建物戦と高所管理の比重が高く、終盤ポジションの優先順位が重要な定番マップです。',
    points: ['建物周辺は展開しすぎない', '終盤ポジションを先に押さえる', '漁夫警戒を切らさない'],
  },
  {
    slug: 'storm-point',
    title: 'ストームポイント / Storm Point',
    shortTitle: 'ストームポイント',
    image: '/maps/storm-point.jpg',
    overview: '移動距離が長く、先入りとルート管理の精度が順位に直結しやすいマップです。',
    points: ['移動開始を遅らせない', '戦闘を長引かせない', '高所と遮蔽の両立を意識する'],
  },
  {
    slug: 'olympus',
    title: 'オリンパス / Olympus',
    shortTitle: 'オリンパス',
    image: '/maps/olympus.jpg',
    overview: '見通しの良いエリアが多く、射線管理と高低差の使い方で差が出やすいマップです。',
    points: ['次の遮蔽を先に決める', '広場で長居しない', '高所確保を優先する'],
  },
  {
    slug: 'broken-moon',
    title: 'ブロークンムーン / Broken Moon',
    shortTitle: 'ブロークンムーン',
    image: '/maps/broken-moon.jpg',
    overview: '移動手段が多く、接敵テンポが速いので判断の切り替えが重要です。',
    points: ['ルート分岐を事前共有', '接敵後の引き際を早く決める', '長射線への無防備な移動を減らす'],
  },
  {
    slug: 'e-district',
    title: 'E-ディストリクト / E-District',
    shortTitle: 'E-ディストリクト',
    image: '/maps/e-district.jpg',
    overview: '市街地戦が多く、建物の取り方と中距離射線のコントロールが勝率を左右します。',
    points: ['射線を増やしすぎない', '建物間の移動を丁寧に', '詰める前に退路を残す'],
  },
  {
    slug: 'kings-canyon',
    title: 'キングスキャニオン / Kings Canyon',
    shortTitle: 'キングスキャニオン',
    image: '/maps/kings-canyon.jpg',
    overview: '回転の速い試合展開になりやすく、早い段階から順位意識を持つことが大切です。',
    points: ['中盤の接敵を見極める', '強ポジ先入りを優先する', '安置外戦闘を減らす'],
  },
]

const MAP_ASSET_MAP: Record<string, Pick<RankMapResult, 'name' | 'slug' | 'image'>> = {
  "World's Edge": { name: "World's Edge", slug: 'worlds-edge', image: '/maps/worlds-edge.jpg' },
  Olympus: { name: 'Olympus', slug: 'olympus', image: '/maps/olympus.jpg' },
  'Storm Point': { name: 'Storm Point', slug: 'storm-point', image: '/maps/storm-point.jpg' },
  'Broken Moon': { name: 'Broken Moon', slug: 'broken-moon', image: '/maps/broken-moon.jpg' },
  'E-District': { name: 'E-District', slug: 'e-district', image: '/maps/e-district.jpg' },
  'Kings Canyon': { name: 'Kings Canyon', slug: 'kings-canyon', image: '/maps/kings-canyon.jpg' },
}

const MAP_ALIASES = [
  { canonicalName: "World's Edge", aliases: ["World's Edge", 'Worlds Edge', 'ワールズエッジ'] },
  { canonicalName: 'Olympus', aliases: ['Olympus', 'オリンパス'] },
  { canonicalName: 'Storm Point', aliases: ['Storm Point', 'ストームポイント'] },
  { canonicalName: 'Broken Moon', aliases: ['Broken Moon', 'ブロークンムーン'] },
  { canonicalName: 'E-District', aliases: ['E-District', 'EDistrict', 'E District'] },
  { canonicalName: 'Kings Canyon', aliases: ['Kings Canyon', "King's Canyon", 'キングスキャニオン'] },
]

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

function pad2(value: number) {
  return String(value).padStart(2, '0')
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

function formatNextUpdateLabel(endTime?: string | null) {
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

  return `次回更新: ${nextUpdate.getUTCFullYear()}/${pad2(nextUpdate.getUTCMonth() + 1)}/${pad2(
    nextUpdate.getUTCDate()
  )} ${pad2(nextUpdate.getUTCHours())}:${pad2(nextUpdate.getUTCMinutes())} JST`
}

function formatJstDateTime(date: Date) {
  return `${date.getUTCFullYear()}/${pad2(date.getUTCMonth() + 1)}/${pad2(date.getUTCDate())} ${pad2(
    date.getUTCHours()
  )}:${pad2(date.getUTCMinutes())}`
}

function getRankMapFromDailyRotation(): RankMapResult {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const rotationAnchor = Date.UTC(2026, 0, 1, 2, 0, 0)
  let currentWindow = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate(), 2, 0, 0)

  if (jst.getTime() < currentWindow) {
    currentWindow = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - 1, 2, 0, 0)
  }

  const daysSinceAnchor = Math.floor((currentWindow - rotationAnchor) / (24 * 60 * 60 * 1000))
  const rotationIndex = ((daysSinceAnchor % RANK_MAP_ROTATION.length) + RANK_MAP_ROTATION.length) % RANK_MAP_ROTATION.length
  const map = RANK_MAP_ROTATION[rotationIndex]
  const nextUpdate = new Date(currentWindow + 24 * 60 * 60 * 1000)

  return {
    ok: true,
    name: map.name,
    slug: map.slug,
    image: map.image,
    updatedAtLabel: `次回更新: ${formatJstDateTime(nextUpdate)} JST`,
    sourceUrl: RANKMAP_SOURCE_URL,
  }
}

function buildRankMapError(errorType: string, message: string): RankMapResult {
  return {
    ok: false,
    errorType,
    message,
    sourceUrl: RANKMAP_SOURCE_URL,
  }
}

function extractFromRankSection($: cheerio.CheerioAPI, section: any): RankMapResult {
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

  return {
    ok: true,
    name: asset.name,
    slug: asset.slug,
    image: asset.image,
    updatedAtLabel: formatNextUpdateLabel(extractEndTime(cardText)),
    sourceUrl: RANKMAP_SOURCE_URL,
  }
}

function extractCurrentRankMap(html: string): RankMapResult {
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()

  const heading = $('h3')
    .toArray()
    .find((element) => normalize($(element).text()) === JP.rankMatch)

  if (heading) {
    const section = $(heading).next('.marbox2')
    if (section.length) {
      return extractFromRankSection($, section[0])
    }
  }

  const fallbackSection = $('div.marbox2')
    .toArray()
    .find((section) => {
      const text = normalize($(section).text())
      return text.includes(JP.current) && text.includes(JP.next)
    })

  if (!fallbackSection) {
    throw new Error(JP.rankSectionMissing)
  }

  return extractFromRankSection($, fallbackSection)
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function htmlToSearchableText(html: string) {
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

function extractLegendRates(text: string) {
  const results: Omit<ApexLegendRateItem, 'rank'>[] = []

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

  return results
    .sort((a, b) => b.pickRate - a.pickRate)
    .slice(0, 10)
    .map((item, index) => ({ ...item, rank: index + 1 }))
}

export async function fetchCurrentRankMap(): Promise<RankMapResult> {
  try {
    const response = await fetch(RANKMAP_SOURCE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return buildRankMapError('upstream_http_error', `GameFavo request failed: ${response.status}`)
    }

    return extractCurrentRankMap(await response.text())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const errorType =
      /fetch failed|network|request failed|econn|enotfound|timedout/i.test(message)
        ? 'network_error'
        : 'parse_failed'

    return buildRankMapError(errorType, message)
  }
}

export async function fetchApexLegendPickRates() {
  const fallbackItems: ApexLegendRateItem[] = [
    { rank: 1, name: 'Octane', pickRate: 18.7, pickRateLabel: '18.7%' },
    { rank: 2, name: 'Mad Maggie', pickRate: 15.8, pickRateLabel: '15.8%' },
    { rank: 3, name: 'Alter', pickRate: 9.1, pickRateLabel: '9.1%' },
    { rank: 4, name: 'Valkyrie', pickRate: 8.1, pickRateLabel: '8.1%' },
    { rank: 5, name: 'Bangalore', pickRate: 7.5, pickRateLabel: '7.5%' },
  ]

  const updatedAtLabel = '次回更新: 毎日 00:00 JST 目安'

  try {
    const response = await fetch(PICK_RATE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Referer: 'https://apexlegendsstatus.com/',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        items: fallbackItems,
        updatedAtLabel,
        note: 'Pick Rate の取得に失敗したため、安定表示用のフォールバックを返しています。',
        sourceUrl: PICK_RATE_URL,
      }
    }

    const extracted = extractLegendRates(htmlToSearchableText(await response.text()))

    return {
      items: extracted.length > 0 ? extracted : fallbackItems,
      updatedAtLabel,
      note:
        extracted.length > 0
          ? null
          : 'Pick Rate の抽出に失敗したため、安定表示用のフォールバックを返しています。',
      sourceUrl: PICK_RATE_URL,
    }
  } catch {
    return {
      items: fallbackItems,
      updatedAtLabel,
      note: 'Pick Rate の取得に失敗したため、安定表示用のフォールバックを返しています。',
      sourceUrl: PICK_RATE_URL,
    }
  }
}

export function getApexGuideMap(slug?: string) {
  return APEX_GUIDE_MAPS.find((item) => item.slug === slug) ?? null
}
