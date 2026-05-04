import {
  FALLBACK_PRO_LEAGUE_OVERVIEW_URL,
  fetchProLeagueComps,
  fetchProLeagueStandingsTop5,
  formatJstDateTime,
  resolveLatestApacNorthProLeagueUrl,
} from '../../lib/apex-proleague-live.js'
import { resolveLegendIcon } from '../../lib/legend-icons.js'

const CACHE_CONTROL = 'no-store, max-age=0'
const CHECKING_META_MESSAGE = '現在最新データを確認中'
const CHECKING_STANDINGS_MESSAGE = '現在順位データを確認中'

const FALLBACK_COMPS = [
  {
    rank: 1,
    legends: ['Bangalore', 'Catalyst', 'Bloodhound'],
    composition: ['Bangalore', 'Catalyst', 'Bloodhound'],
    icons: ['Bangalore', 'Catalyst', 'Bloodhound'].map(resolveLegendIcon),
    pickRate: '-',
    adoptionRate: '-',
    region: 'APAC North / Pro League',
    tournament: 'ALGS APAC North Pro League',
    comment: '現在最新データを確認中です',
  },
  {
    rank: 2,
    legends: ['Mad Maggie', 'Alter', 'Seer'],
    composition: ['Mad Maggie', 'Alter', 'Seer'],
    icons: ['Mad Maggie', 'Alter', 'Seer'].map(resolveLegendIcon),
    pickRate: '-',
    adoptionRate: '-',
    region: 'APAC North / Pro League',
    tournament: 'ALGS APAC North Pro League',
    comment: '現在最新データを確認中です',
  },
  {
    rank: 3,
    legends: ['Valkyrie', 'Wattson', 'Crypto'],
    composition: ['Valkyrie', 'Wattson', 'Crypto'],
    icons: ['Valkyrie', 'Wattson', 'Crypto'].map(resolveLegendIcon),
    pickRate: '-',
    adoptionRate: '-',
    region: 'APAC North / Pro League',
    tournament: 'ALGS APAC North Pro League',
    comment: '現在最新データを確認中です',
  },
]

const FALLBACK_STANDINGS = []

function buildFailurePayload(resolved) {
  const updatedAt = formatJstDateTime()

  return {
    ok: false,
    fallback: true,
    message: CHECKING_META_MESSAGE,
    standingsMessage: CHECKING_STANDINGS_MESSAGE,
    updatedAt,
    updatedAtLabel: updatedAt,
    sourceLabel: resolved?.sourceLabel || 'ALGS APAC North Pro League',
    region: 'APAC North',
    league: 'Pro League',
    sourceUrl: resolved?.url || FALLBACK_PRO_LEAGUE_OVERVIEW_URL,
    resolvedFrom: resolved?.resolvedFrom || '',
    comps: FALLBACK_COMPS,
    compositions: normalizeCompositions(FALLBACK_COMPS),
    standings: FALLBACK_STANDINGS,
  }
}

function normalizeCompositions(comps) {
  return comps.slice(0, 5).map((comp, index) => {
    const names = Array.isArray(comp.legends)
      ? comp.legends
      : Array.isArray(comp.composition)
        ? comp.composition
        : []

    return {
      rank: Number(comp.rank ?? index + 1),
      legends: names.slice(0, 3).map((name, legendIndex) => ({
        name,
        image: comp.icons?.[legendIndex] || resolveLegendIcon(name),
      })),
      pickRate: String(comp.pickRate ?? comp.adoptionRate ?? '-'),
      comment: String(comp.comment ?? '現在最新データを確認中です'),
    }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  res.setHeader('Cache-Control', CACHE_CONTROL)

  const updatedAt = formatJstDateTime()
  const resolved = await resolveLatestApacNorthProLeagueUrl()

  try {
    const compResult = await fetchProLeagueComps(resolved.url, resolved)
    const standingsResult = await fetchProLeagueStandingsTop5(resolved.url, compResult.html)
    const hasComps = compResult.comps.length > 0
    const hasStandings = standingsResult.standings.length > 0

    if (!hasComps && !hasStandings) {
      return res.status(200).json(buildFailurePayload(resolved))
    }

    return res.status(200).json({
      ok: hasComps && hasStandings,
      fallback: !hasComps || !hasStandings || resolved.usedFallback,
      message: hasComps ? null : CHECKING_META_MESSAGE,
      standingsMessage: hasStandings ? null : CHECKING_STANDINGS_MESSAGE,
      updatedAt,
      updatedAtLabel: updatedAt,
      sourceLabel: resolved.sourceLabel,
      region: 'APAC North',
      league: 'Pro League',
      sourceUrl: resolved.url,
      pickRatesUrl: compResult.sourceUrl,
      standingsUrl: standingsResult.sourceUrl,
      resolvedFrom: resolved.resolvedFrom,
      comps: hasComps ? compResult.comps : FALLBACK_COMPS,
      compositions: normalizeCompositions(hasComps ? compResult.comps : FALLBACK_COMPS),
      standings: hasStandings ? standingsResult.standings : FALLBACK_STANDINGS,
    })
  } catch (error) {
    console.error('pro-league-meta error', error instanceof Error ? error.message : error)
    return res.status(200).json(buildFailurePayload(resolved))
  }
}
