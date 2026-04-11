import * as cheerio from 'cheerio'

const MAP_LABELS = {
  ascent: 'Ascent',
  abyss: 'Abyss',
  bind: 'Bind',
  breeze: 'Breeze',
  corrode: 'Corrode',
  fracture: 'Fracture',
  haven: 'Haven',
  icebox: 'Icebox',
  lotus: 'Lotus',
  pearl: 'Pearl',
  split: 'Split',
  sunset: 'Sunset',
}

const FALLBACK_AGENTS = {
  haven: [
    { name: 'Omen', role: 'Controller', pickRate: 27.4 },
    { name: 'Jett', role: 'Duelist', pickRate: 24.8 },
    { name: 'Sova', role: 'Initiator', pickRate: 22.1 },
  ],
  split: [
    { name: 'Raze', role: 'Duelist', pickRate: 29.1 },
    { name: 'Omen', role: 'Controller', pickRate: 26.8 },
    { name: 'Cypher', role: 'Sentinel', pickRate: 20.4 },
  ],
  bind: [
    { name: 'Raze', role: 'Duelist', pickRate: 31.5 },
    { name: 'Brimstone', role: 'Controller', pickRate: 25.9 },
    { name: 'Gekko', role: 'Initiator', pickRate: 19.6 },
  ],
  breeze: [
    { name: 'Jett', role: 'Duelist', pickRate: 28.7 },
    { name: 'Viper', role: 'Controller', pickRate: 27.9 },
    { name: 'Sova', role: 'Initiator', pickRate: 21.8 },
  ],
  fracture: [
    { name: 'Breach', role: 'Initiator', pickRate: 30.1 },
    { name: 'Raze', role: 'Duelist', pickRate: 27.8 },
    { name: 'Brimstone', role: 'Controller', pickRate: 23.6 },
  ],
  lotus: [
    { name: 'Omen', role: 'Controller', pickRate: 26.7 },
    { name: 'Raze', role: 'Duelist', pickRate: 24.2 },
    { name: 'Fade', role: 'Initiator', pickRate: 21.5 },
  ],
  pearl: [
    { name: 'Astra', role: 'Controller', pickRate: 23.9 },
    { name: 'Jett', role: 'Duelist', pickRate: 22.4 },
    { name: 'Cypher', role: 'Sentinel', pickRate: 20.6 },
  ],
  abyss: [
    { name: 'Jett', role: 'Duelist', pickRate: 24.4 },
    { name: 'Omen', role: 'Controller', pickRate: 22.7 },
    { name: 'Sova', role: 'Initiator', pickRate: 19.9 },
  ],
  corrode: [
    { name: 'Raze', role: 'Duelist', pickRate: 23.8 },
    { name: 'Omen', role: 'Controller', pickRate: 21.6 },
    { name: 'Cypher', role: 'Sentinel', pickRate: 18.7 },
  ],
}

function normalizePercent(value) {
  const num = Number(String(value).replace('%', '').trim())
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 10) / 10
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function extractAgentsFromText(text) {
  const normalized = cleanText(text)

  const markers = [
    'Agent Played % Win % Kills K/D DDΔ/Round',
    'Agent Played % Win % Kills K/D',
    'Agent Played % Win %',
  ]

  let startIndex = -1
  for (const marker of markers) {
    startIndex = normalized.indexOf(marker)
    if (startIndex !== -1) break
  }

  if (startIndex === -1) return []

  const sliced = normalized.slice(startIndex)
  const regex =
    /([A-Z][A-Za-z'\/.-]+(?:\s[A-Z][A-Za-z'\/.-]+)?)\s+(Controller|Duelist|Initiator|Sentinel)\s+(\d+(?:\.\d+)?)%\s+\d+(?:\.\d+)?%/g

  const items = []
  const seen = new Set()

  let match
  while ((match = regex.exec(sliced)) !== null) {
    const name = match[1]
    const role = match[2]
    const pickRate = normalizePercent(match[3])

    if (seen.has(name)) continue
    seen.add(name)

    items.push({ name, role, pickRate })
    if (items.length >= 3) break
  }

  return items
}

export default async function handler(req, res) {
  const slug =
    typeof req.query.slug === 'string' ? req.query.slug.toLowerCase() : ''

  if (!slug || !MAP_LABELS[slug]) {
    return res.status(400).json({
      ok: false,
      items: [],
      message: 'invalid map slug',
    })
  }

  const targetUrl = `https://tracker.gg/valorant/insights/agents?map=${encodeURIComponent(
    slug
  )}`

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error(`tracker request failed: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    $('script,noscript,style').remove()

    const bodyText = cleanText($('body').text())
    const items = extractAgentsFromText(bodyText)

    if (items.length > 0) {
      return res.status(200).json({
        ok: true,
        source: 'tracker',
        map: MAP_LABELS[slug],
        items,
        updatedAt: new Date().toISOString(),
      })
    }

    return res.status(200).json({
      ok: true,
      source: 'fallback',
      map: MAP_LABELS[slug],
      items: FALLBACK_AGENTS[slug] || [],
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(200).json({
      ok: true,
      source: 'fallback',
      map: MAP_LABELS[slug],
      items: FALLBACK_AGENTS[slug] || [],
      updatedAt: new Date().toISOString(),
    })
  }
}