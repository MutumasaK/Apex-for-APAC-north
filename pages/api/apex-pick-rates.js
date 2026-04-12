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
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const next = new Date(jst)
  next.setUTCHours(15, 0, 0, 0)

  if (jst.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }

  const year = next.getUTCFullYear()
  const month = String(next.getUTCMonth() + 1).padStart(2, '0')
  const day = String(next.getUTCDate()).padStart(2, '0')

  return `${year}/${month}/${day} 00:00 JST`
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

  return results.sort((a, b) => b.pickRate - a.pickRate)
}

function fallbackItems() {
  return [
    { rank: 1, name: 'Octane', pickRate: 18.7, pickRateLabel: '18.7%' },
    { rank: 2, name: 'Mad Maggie', pickRate: 15.8, pickRateLabel: '15.8%' },
    { rank: 3, name: 'Alter', pickRate: 9.1, pickRateLabel: '9.1%' },
    { rank: 4, name: 'Valkyrie', pickRate: 8.1, pickRateLabel: '8.1%' },
    { rank: 5, name: 'Bangalore', pickRate: 7.5, pickRateLabel: '7.5%' },
  ]
}

export default async function handler(req, res) {
  try {
    const response = await fetch(PICK_RATE_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
        note: 'Pick Rate の取得に失敗したため、安定表示用のフォールバックを返しています。',
      })
    }

    const html = await response.text()
    const extracted = extractLegendRates(htmlToSearchableText(html))

    if (!extracted.length) {
      return res.status(200).json({
        items: fallbackItems(),
        updatedAtLabel: `次回更新: ${getNextMidnightJstLabel()}`,
        note: 'Pick Rate の抽出に失敗したため、安定表示用のフォールバックを返しています。',
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
    console.error('apex-pick-rates error', error instanceof Error ? error.message : error)
    return res.status(200).json({
      items: fallbackItems(),
      updatedAtLabel: `次回更新: ${getNextMidnightJstLabel()}`,
      note: 'Pick Rate の取得に失敗したため、安定表示用のフォールバックを返しています。',
    })
  }
}
