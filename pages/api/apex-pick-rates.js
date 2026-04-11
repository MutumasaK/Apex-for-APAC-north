const PICK_RATE_URL =
  'https://apexlegendsstatus.com/game-stats/legends-pick-rates/Diamond'

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
  const jstMs = date.getTime() + 9 * 60 * 60 * 1000
  const jst = new Date(jstMs)

  const next = new Date(jst)
  next.setUTCHours(15, 0, 0, 0) // JST 00:00

  if (jst.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }

  const year = next.getUTCFullYear()
  const month = String(next.getUTCMonth() + 1).padStart(2, '0')
  const day = String(next.getUTCDate()).padStart(2, '0')

  return `${year}/${month}/${day} 00:00`
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
    const legendPattern = escapeRegExp(legend)

    // レジェンド名の直後に最初に出る%を拾う
    // 変動率(▲▼)より前に出るpick率を優先して取る想定
    const regex = new RegExp(
      `${legendPattern}\\s+([0-9]+(?:\\.[0-9]+)?)%`,
      'i'
    )

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

  results.sort((a, b) => b.pickRate - a.pickRate)
  return results
}

function fallbackItems() {
  return [
    { rank: 1, name: 'Octane', pickRate: 0, pickRateLabel: '0.0%' },
    { rank: 2, name: 'Mad Maggie', pickRate: 0, pickRateLabel: '0.0%' },
    { rank: 3, name: 'Alter', pickRate: 0, pickRateLabel: '0.0%' },
    { rank: 4, name: 'Valkyrie', pickRate: 0, pickRateLabel: '0.0%' },
    { rank: 5, name: 'Bangalore', pickRate: 0, pickRateLabel: '0.0%' },
  ]
}

export default async function handler(req, res) {
  try {
    const response = await fetch(PICK_RATE_URL, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Referer: 'https://apexlegendsstatus.com/',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      return res.status(200).json({
        items: fallbackItems(),
        updatedAtLabel: `次回更新: ${getNextMidnightJstLabel()}`,
        note: 'pick率ページの取得に失敗したため、フォールバック表示です。',
      })
    }

    const html = await response.text()
    const searchableText = htmlToSearchableText(html)
    const extracted = extractLegendRates(searchableText)

    if (!extracted.length) {
      return res.status(200).json({
        items: fallbackItems(),
        updatedAtLabel: `次回更新: ${getNextMidnightJstLabel()}`,
        note: 'pick率を本文から抽出できなかったため、フォールバック表示です。',
      })
    }

    const topFive = extracted.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      name: item.name,
      pickRate: item.pickRate,
      pickRateLabel: item.pickRateLabel,
    }))

    return res.status(200).json({
      items: topFive,
      updatedAtLabel: `次回更新: ${getNextMidnightJstLabel()}`,
      note: null,
    })
  } catch (error) {
    return res.status(200).json({
      items: fallbackItems(),
      updatedAtLabel: `次回更新: ${getNextMidnightJstLabel()}`,
      note: '例外発生のため、フォールバック表示です。',
    })
  }
}