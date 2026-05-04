import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import SeoHead from '../components/SeoHead'
import { AI_COACH_PLANS } from '../lib/ai-coach-plans'
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/site'

type ScrimItem = {
  id: string
  title: string
  dateLabel: string
  detailUrl: string
  entryStatus: 'joined' | 'notJoined' | 'unknown'
  entryStatusLabel: string
  checkinStatus: 'checkedIn' | 'notCheckedIn' | 'unknown'
  checkinStatusLabel: string
  rate?: number
  note: string
}
type ScrimMeta = {
  teamName: string
  ratePoint: number
  rateUpdatedAt: string
}

type SelectedTeam = {
  teamId: string
  teamName: string
  teamSlug: string
}

type TeamSearchItem = {
  teamId: number
  name: string
  rate: number
  slug: string
}

type RankMapItem = {
  name: string
  slug: string
  image: string
  updatedAtLabel: string
}

type LegendPickRate = {
  name: string
  pickRate: number
  pickRateLabel?: string
  image?: string
  icon?: string
  rank?: number
}

type PickRateData = {
  tier: 'diamond' | 'masterPredator'
  legends: LegendPickRate[]
  updatedAt: string
  message?: string
}

type ProLeagueComp = {
  rank: number
  legends: string[]
  pickRate: string
  region: string
  comment: string
  icons?: string[]
}

type ProLeagueStanding = {
  rank: number
  teamName: string
  score: number
  kills: number
  members: string[]
  icon?: string
}

type ProLeagueData = {
  updatedAt: string
  sourceLabel: string
  comps: ProLeagueComp[]
  standings?: ProLeagueStanding[]
  message?: string
  standingsMessage?: string
  fallback?: boolean
}

type NewsItem = {
  id: string
  title: string
  href: string
  date: string
  category: string
  summary: string
}

type ApexGuideMap = {
  name: string
  slug: string
  image: string
  description: string
}

const apexGuideMaps: ApexGuideMap[] = [
  { name: 'Olympus', slug: 'olympus', image: '/maps/olympus.jpg', description: 'ハーベスターがない時の初動判断、中央寄せ、射線管理を重点的に確認' },
  { name: "World's Edge", slug: 'worlds-edge', image: '/maps/worlds-edge.jpg', description: '高所管理、漁夫対策、安置入りのタイミングを確認' },
  { name: 'Storm Point', slug: 'storm-point', image: '/maps/storm-point.jpg', description: '長距離移動、孤立防止、ビーコン判断を確認' },
]

function fallbackScrims(): ScrimItem[] {
  return [
    {
      id: 'scrim-fallback',
      title: 'ESCLチーム情報',
      dateLabel: '',
      detailUrl: '',
      entryStatus: 'unknown',
      entryStatusLabel: 'チーム未選択',
      checkinStatus: 'unknown',
      checkinStatusLabel: 'チーム未選択',
      note: 'チーム名を入力するとESCL情報を確認できます。',
    },
  ]
}

function fallbackScrimMeta(): ScrimMeta {
  return {
    teamName: '-',
    ratePoint: 0,
    rateUpdatedAt: '最終確認: 確認中',
  }
}

function fallbackApexNews(): NewsItem[] {
  return [
    {
      id: 'apex-news-fallback',
      title: 'Apex 最新ニュースを取得できませんでした',
      href: 'https://www.ea.com/ja/games/apex-legends/apex-legends/news?page=1&type=latest',
      date: '最新',
      category: 'EA Official',
      summary: 'EA公式ニュースページへのリンクを表示しています。',
    },
  ]
}

function fallbackPickRates(): PickRateData[] {
  return [
    {
      tier: 'diamond',
      legends: [
        { name: 'Mad Maggie', pickRate: 0, pickRateLabel: '-', image: '/legends/mad-maggie.webp', icon: '/legends/mad-maggie.webp', rank: 1 },
        { name: 'Alter', pickRate: 0, pickRateLabel: '-', image: '/legends/alter.webp', icon: '/legends/alter.webp', rank: 2 },
        { name: 'Valkyrie', pickRate: 0, pickRateLabel: '-', image: '/legends/valkyrie.webp', icon: '/legends/valkyrie.webp', rank: 3 },
        { name: 'Bangalore', pickRate: 0, pickRateLabel: '-', image: '/legends/bangalore.webp', icon: '/legends/bangalore.webp', rank: 4 },
        { name: 'Wraith', pickRate: 0, pickRateLabel: '-', image: '/legends/wraith.webp', icon: '/legends/wraith.webp', rank: 5 },
      ],
      updatedAt: '現在データ確認中',
      message: '現在データ確認中',
    },
    {
      tier: 'masterPredator',
      legends: [],
      updatedAt: '現在データ確認中',
      message: 'Master / Predator は現在データ確認中',
    },
  ]
}

function fallbackProLeague(): ProLeagueData {
  return {
    updatedAt: '現在データ確認中',
    sourceLabel: 'ALGS / Pro League',
    message: '現在最新データを確認中',
    standingsMessage: '現在順位データを確認中',
    fallback: true,
    comps: [
      {
        rank: 1,
        legends: ['Bangalore', 'Catalyst', 'Bloodhound'],
        pickRate: '18.2%',
        region: 'APAC North',
        icons: ['/legends/bangalore.webp', '/legends/catalyst.webp', '/legends/bloodhound.webp'],
        comment: '射線切りと索敵を両立しやすい安定構成',
      },
      {
        rank: 2,
        legends: ['Mad Maggie', 'Alter', 'Seer'],
        pickRate: '-',
        region: 'APAC North',
        icons: ['/legends/mad-maggie.webp', '/legends/alter.webp', '/legends/seer.webp'],
        comment: '現在最新データを確認中です',
      },
      {
        rank: 3,
        legends: ['Valkyrie', 'Wattson', 'Crypto'],
        pickRate: '-',
        region: 'APAC North',
        icons: ['/legends/valkyrie.webp', '/legends/wattson.webp', '/legends/crypto.webp'],
        comment: '現在最新データを確認中です',
      },
    ],
    standings: [],
  }
}
async function fetchJson(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}

function getStoredSelectedTeam(): SelectedTeam | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem('selectedEsclTeam')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const teamId = String(parsed?.teamId ?? '')
    const teamName = String(parsed?.teamName ?? '')
    const teamSlug = String(parsed?.teamSlug ?? '')
    return teamId || teamSlug || teamName ? { teamId, teamName, teamSlug } : null
  } catch {
    return null
  }
}

function saveSelectedTeam(team: SelectedTeam | null) {
  if (typeof window === 'undefined' || !team) return
  window.localStorage.setItem(
    'selectedEsclTeam',
    JSON.stringify({
      teamId: team.teamId,
      teamName: team.teamName,
      teamSlug: team.teamSlug,
    })
  )
}

function normalizeSelectedTeam(payload: any): SelectedTeam | null {
  const team = payload?.selectedTeam ?? payload
  const teamId = String(team?.teamId ?? team?.id ?? '')
  const teamName = String(team?.teamName ?? team?.name ?? '')
  const teamSlug = String(team?.teamSlug ?? team?.slug ?? '')

  return teamId || teamSlug || teamName ? { teamId, teamName, teamSlug } : null
}

function normalizeScrimResponse(payload: any): ScrimItem[] {
  const selected = payload?.selectedScrim
  const source = Array.isArray(payload)
    ? payload
    : selected
      ? [selected]
      : payload?.items ?? payload?.scrims ?? payload?.data ?? []

  if (!Array.isArray(source) || source.length === 0) {
    return fallbackScrims()
  }

  return source.slice(0, 3).map((item: any, index: number) => {
    const rawEntryStatus = String(item?.entryStatus ?? 'unknown')
    const entryStatus =
      rawEntryStatus === 'joined' || rawEntryStatus === 'notJoined'
        ? rawEntryStatus
        : 'unknown'
    const rawCheckinStatus = String(item?.checkinStatus ?? 'unknown')
    const checkinStatus =
      rawCheckinStatus === 'checkedIn' || rawCheckinStatus === 'notCheckedIn'
        ? rawCheckinStatus
        : 'unknown'

    return {
      id: String(item?.id ?? `scrim-${index}`),
      title: String(item?.title ?? 'ESCLチーム情報'),
      dateLabel: String(item?.dateLabel ?? ''),
      detailUrl: String(item?.detailUrl ?? 'https://fightnt.escl.co.jp/scrims/a2fed046-6427-432b-8852-dcc7b0981817'),
      entryStatus: entryStatus as ScrimItem['entryStatus'],
      entryStatusLabel: String(item?.entryStatusLabel ?? 'データ確認中'),
      checkinStatus: checkinStatus as ScrimItem['checkinStatus'],
      checkinStatusLabel: String(item?.checkinStatusLabel ?? 'データ確認中'),
      rate: Number(item?.rate ?? 0),
      note: String(item?.note ?? '本日のスクリム情報を確認しています。'),
    }
  })
}

function normalizeScrimMeta(payload: any): ScrimMeta {
  const meta = payload?.meta ?? payload
  const selectedTeam = payload?.selectedTeam ?? {}
  const selectedScrim = payload?.selectedScrim ?? {}

  return {
    teamName: String(meta?.teamName ?? selectedTeam?.teamName ?? selectedTeam?.name ?? '-'),
    ratePoint: Number(meta?.ratePoint ?? selectedTeam?.rate ?? selectedScrim?.rate ?? meta?.rate ?? 0),
    rateUpdatedAt: String(meta?.rateUpdatedAt ?? payload?.updatedAtLabel ?? '最終確認: 確認中'),
  }
}

function normalizeRankMapResponse(payload: any): RankMapItem | null {
  if (!payload || typeof payload !== 'object' || payload?.ok === false) {
    return null
  }

  const name = String(payload?.name ?? payload?.mapName ?? '')
  const slug = String(payload?.slug ?? '')
  const image = String(payload?.image ?? '')

  if (!name || !slug || !image) {
    return null
  }

  return {
    name,
    slug,
    image,
    updatedAtLabel: String(payload?.updatedAtLabel ?? '最新取得: 確認中'),
  }
}

function normalizePickRatesResponse(payload: any): PickRateData[] {
  const result: PickRateData[] = []
  const normalizeRate = (value: any) => {
    const numeric = Number.parseFloat(String(value ?? '').replace('%', ''))
    return Number.isFinite(numeric) ? numeric : 0
  }
  const normalizeLegend = (item: any, idx: number) => {
    const pickRate = normalizeRate(item?.pickRateValue ?? item?.pickRate ?? item?.pickRateLabel)
    const pickRateLabel = String(item?.pickRateLabel ?? item?.pickRate ?? (pickRate > 0 ? `${pickRate.toFixed(1)}%` : '-'))
    const image = String(item?.image ?? item?.icon ?? '')

    return {
      name: String(item?.name ?? ''),
      pickRate,
      pickRateLabel,
      image,
      icon: image,
      rank: Number(item?.rank ?? idx + 1),
    }
  }

  // Diamond tier
  if (payload?.diamond?.legends || Array.isArray(payload?.diamond) || Array.isArray(payload?.legends)) {
    const diamondLegends = Array.isArray(payload.diamond)
      ? payload.diamond
      : payload.diamond?.legends || payload.legends || []
    if (diamondLegends.length > 0) {
      result.push({
        tier: 'diamond',
        legends: diamondLegends.slice(0, 5).map(normalizeLegend).filter((l: any) => l.name),
        updatedAt: String(payload?.diamond?.updatedAt ?? payload?.updatedAt ?? '確認中'),
        message: payload?.diamond?.message ? String(payload.diamond.message) : '',
      })
    }
  }

  // Master/Predator tier
  if (payload?.masterPredator?.legends || (Array.isArray(payload?.masterPredator) && payload.masterPredator.length > 0)) {
    const mpLegends = Array.isArray(payload.masterPredator) ? payload.masterPredator : payload.masterPredator.legends || []
    if (mpLegends.length > 0) {
      result.push({
        tier: 'masterPredator',
        legends: mpLegends.slice(0, 5).map(normalizeLegend).filter((l: any) => l.name),
        updatedAt: String(payload?.masterPredator?.updatedAt ?? payload?.updatedAt ?? '確認中'),
        message: payload?.masterPredator?.message ? String(payload.masterPredator.message) : '',
      })
    } else {
      result.push({
        tier: 'masterPredator',
        legends: [],
        updatedAt: String(payload?.masterPredator?.updatedAt ?? payload?.updatedAt ?? '確認中'),
        message: String(payload?.masterPredator?.message ?? 'Master / Predator は現在データ確認中'),
      })
    }
  }

  const fallback = fallbackPickRates()
  const hasDiamond = result.some((item) => item.tier === 'diamond')
  const hasMasterPredator = result.some((item) => item.tier === 'masterPredator')

  return [
    ...(hasDiamond ? result.filter((item) => item.tier === 'diamond') : [fallback[0]]),
    ...(hasMasterPredator ? result.filter((item) => item.tier === 'masterPredator') : [fallback[1]]),
  ]
}

function normalizeProLeagueResponse(payload: any): ProLeagueData {
  const comps = Array.isArray(payload?.comps) ? payload.comps : Array.isArray(payload?.compositions) ? payload.compositions : []
  const standings = Array.isArray(payload?.standings) ? payload.standings : []
  const normalizedStandings = standings.slice(0, 5).map((item: any, idx: number) => ({
    rank: Number(item?.rank ?? idx + 1),
    teamName: String(item?.teamName ?? ''),
    score: Number(item?.score ?? 0),
    kills: Number(item?.kills ?? 0),
    members: Array.isArray(item?.members) ? item.members.map(String) : [],
    icon: String(item?.icon ?? item?.iconUrl ?? ''),
  })).filter((item: ProLeagueStanding) => item.teamName)

  if (!Array.isArray(comps) || comps.length === 0) {
    const fallback = fallbackProLeague()
    return {
      ...fallback,
      updatedAt: String(payload?.updatedAt ?? fallback.updatedAt),
      sourceLabel: String(payload?.sourceLabel ?? fallback.sourceLabel),
      message: String(payload?.message ?? fallback.message ?? '現在最新データを確認中'),
      standingsMessage: String(payload?.standingsMessage ?? (normalizedStandings.length > 0 ? '' : '現在順位データを確認中')),
      fallback: Boolean(payload?.fallback ?? true),
      standings: normalizedStandings,
    }
  }

  return {
    updatedAt: String(payload?.updatedAt ?? '現在データ確認中'),
    sourceLabel: String(payload?.sourceLabel ?? 'ALGS / Pro League'),
    message: payload?.message ? String(payload.message) : payload?.fallback ? '現在最新データを確認中' : '',
    standingsMessage: payload?.standingsMessage ? String(payload.standingsMessage) : normalizedStandings.length > 0 ? '' : '現在順位データを確認中',
    fallback: Boolean(payload?.fallback ?? false),
    comps: comps.slice(0, 5).map((item: any, idx: number) => {
      const rawLegends = Array.isArray(item?.legends)
        ? item.legends.slice(0, 3)
        : Array.isArray(item?.composition)
          ? item.composition.slice(0, 3)
          : []
      const legends = rawLegends.map((legend: any) => typeof legend === 'string' ? legend : String(legend?.name ?? '')).filter(Boolean)
      const icons = rawLegends.map((legend: any, legendIndex: number) => {
        if (typeof legend === 'object' && legend?.image) return String(legend.image)
        if (Array.isArray(item?.icons) && item.icons[legendIndex]) return String(item.icons[legendIndex])
        return ''
      })

      return {
        rank: Number(item?.rank ?? idx + 1),
        legends,
        pickRate: String(item?.pickRate ?? item?.adoptionRate ?? '-'),
        region: String(item?.region ?? item?.tournament ?? payload?.sourceLabel ?? 'APAC North / Pro League'),
        comment: String(item?.comment ?? '現在最新データを確認中です'),
        icons,
      }
    }),
    standings: normalizedStandings,
  }
}
function normalizeNewsResponse(payload: any, fallback: NewsItem[]): NewsItem[] {
  const source = Array.isArray(payload) ? payload : payload?.items ?? payload?.news ?? payload?.articles ?? payload?.data ?? []

  if (!Array.isArray(source) || source.length === 0) {
    return fallback
  }

  return source.slice(0, 3).map((item: any, index: number) => ({
    id: String(item?.id ?? `${item?.href ?? item?.url ?? 'news'}-${index}`),
    title: String(item?.title ?? 'タイトル未設定'),
    href: String(item?.href ?? item?.url ?? '#'),
    date: String(item?.date ?? '最新'),
    category: String(item?.category ?? item?.source ?? 'News'),
    summary: String(item?.summary ?? '詳細を確認しています。'),
  }))
}

function SectionTitle({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string
  title: string
  href: string
}) {
  return (
    <div className="sectionHeader">
      <p className="sectionHeader__sub">{eyebrow}</p>
      <Link href={href} className="sectionTitleLink">
        <h2>{title}</h2>
        <span>詳細を見る</span>
      </Link>
    </div>
  )
}

function CardTitle({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string
  title: string
  href: string
}) {
  return (
    <div className="sectionHeader sectionHeader--compact">
      <p className="sectionHeader__sub">{eyebrow}</p>
      <Link href={href} className="sectionTitleLink sectionTitleLink--small">
        <h3>{title}</h3>
        <span>詳細を見る</span>
      </Link>
    </div>
  )
}

function ApexGuideCard({ map }: { map: ApexGuideMap }) {
  return (
    <article className="apexGuideCard">
      <div className="apexGuideImageWrap">
        <img src={map.image} alt={map.name} className="apexGuideImage" />
        <div className="apexGuideOverlay">
          <strong>{map.name}</strong>
        </div>
      </div>

      <div className="apexGuideMeta">
        <p className="mapName">{map.name}</p>
        <p className="guideDescription">{map.description}</p>
        <Link href={`/apex/${map.slug}`} className="mapGuideLink">
          マップ攻略
        </Link>
      </div>
    </article>
  )
}

function getTeamInitials(teamName: string) {
  const normalized = teamName.trim()
  const upperName = normalized.toUpperCase()

  if (upperName.includes('ZETA')) return 'ZETA'
  if (upperName.includes('UNLIMIT')) return 'UNL'
  if (upperName.includes('ENTER FORCE')) return 'E36'
  if (upperName.includes('KINOTROPE')) return 'KNT'
  if (upperName.includes('WGR')) return 'WGR'

  return normalized
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase()
}

function shouldUseTeamLogoFallback(teamName: string) {
  const upperName = teamName.trim().toUpperCase()
  return upperName.includes('ZETA') || upperName.includes('WGR')
}

function TeamLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [failed, setFailed] = useState(false)
  const fallback = getTeamInitials(name)

  if (!logoUrl || failed || shouldUseTeamLogoFallback(name)) {
    return (
      <div className="teamLogo teamLogo--fallback" aria-label={name}>
        {fallback || '?'}
      </div>
    )
  }

  return (
    <div className="teamLogo" aria-label={name}>
      <img src={logoUrl} alt={`${name} logo`} onError={() => setFailed(true)} />
    </div>
  )
}

function LegendIcon({ name, icon, className }: { name: string; icon?: string | null; className: string }) {
  const [failed, setFailed] = useState(false)

  if (!icon || failed) {
    return (
      <div className={`${className} legendIconFallback`} aria-label={name}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return <img src={icon} alt={name} className={className} onError={() => setFailed(true)} />
}

export default function HomePage() {
  const router = useRouter()
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam | null>(null)
  const [teamQuery, setTeamQuery] = useState('')
  const [teamResults, setTeamResults] = useState<TeamSearchItem[]>([])
  const [teamSearchLoading, setTeamSearchLoading] = useState(false)
  const [scrims, setScrims] = useState<ScrimItem[]>(fallbackScrims())
  const [scrimMeta, setScrimMeta] = useState<ScrimMeta>(fallbackScrimMeta())
  const [rankMap, setRankMap] = useState<RankMapItem | null>(null)
  const [pickRates, setPickRates] = useState<PickRateData[]>(fallbackPickRates())
  const [proLeague, setProLeague] = useState<ProLeagueData>(fallbackProLeague())
  const [apexNews, setApexNews] = useState<NewsItem[]>(fallbackApexNews())
  const [activeLegendTab, setActiveLegendTab] = useState<'diamond' | 'masterPredator'>('diamond')
  const [loading, setLoading] = useState(true)
  const [esclLoading, setEsclLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [rankMapResult, pickRatesResult, proLeagueResult, newsResult] = await Promise.allSettled([
          fetchJson('/api/rankmap'),
          fetchJson('/api/apex-pick-rates'),
          fetchJson('/api/pro-league-meta'),
          fetchJson('/api/apex-news'),
        ])

        if (!mounted) return

        if (rankMapResult.status === 'fulfilled') {
          setRankMap(normalizeRankMapResponse(rankMapResult.value))
        }

        if (pickRatesResult.status === 'fulfilled') {
          setPickRates(normalizePickRatesResponse(pickRatesResult.value))
        }

        if (proLeagueResult.status === 'fulfilled') {
          setProLeague(normalizeProLeagueResponse(proLeagueResult.value))
        }

        if (newsResult.status === 'fulfilled') {
          setApexNews(normalizeNewsResponse(newsResult.value, fallbackApexNews()))
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading homepage data:', error)
        setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!router.isReady) return

    const queryTeamId = typeof router.query.teamId === 'string' ? router.query.teamId : ''
    const queryTeamSlug = typeof router.query.teamSlug === 'string' ? router.query.teamSlug : ''

    if (queryTeamId || queryTeamSlug) {
      setSelectedTeam({
        teamId: queryTeamId,
        teamName: '',
        teamSlug: queryTeamSlug,
      })
      return
    }

    setSelectedTeam(getStoredSelectedTeam())
  }, [router.isReady, router.query.teamId, router.query.teamSlug])

  useEffect(() => {
    let mounted = true

    async function loadSelectedTeam() {
      if (!selectedTeam?.teamId && !selectedTeam?.teamSlug && !selectedTeam?.teamName) {
        setScrims(fallbackScrims())
        setScrimMeta(fallbackScrimMeta())
        return
      }

      setEsclLoading(true)

      try {
        const query = selectedTeam.teamId
          ? `teamId=${encodeURIComponent(selectedTeam.teamId)}`
          : selectedTeam.teamSlug
            ? `teamSlug=${encodeURIComponent(selectedTeam.teamSlug)}`
            : `teamName=${encodeURIComponent(selectedTeam.teamName)}`
        const payload = await fetchJson(`/api/escl?${query}`)

        if (!mounted) return

        const normalizedTeam = normalizeSelectedTeam(payload)
        if (normalizedTeam) {
          setSelectedTeam(normalizedTeam)
          saveSelectedTeam(normalizedTeam)
        }

        setScrims(normalizeScrimResponse(payload))
        setScrimMeta(normalizeScrimMeta(payload))
      } catch (error) {
        console.error('Error loading ESCL team data:', error)
        if (mounted) {
          setScrims(fallbackScrims())
          setScrimMeta(fallbackScrimMeta())
        }
      } finally {
        if (mounted) setEsclLoading(false)
      }
    }

    loadSelectedTeam()

    return () => {
      mounted = false
    }
  }, [selectedTeam?.teamId, selectedTeam?.teamSlug, selectedTeam?.teamName])

  useEffect(() => {
    const trimmed = teamQuery.trim()
    if (!trimmed) {
      setTeamResults([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setTeamSearchLoading(true)
      try {
        const payload = await fetchJson(`/api/escl/teams?query=${encodeURIComponent(trimmed)}`)
        setTeamResults(Array.isArray(payload?.items) ? payload.items : [])
      } catch {
        setTeamResults([])
      } finally {
        setTeamSearchLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [teamQuery])

  function handleSelectTeam(team: TeamSearchItem) {
    const nextTeam = {
      teamId: String(team.teamId),
      teamName: team.name,
      teamSlug: team.slug,
    }
    setSelectedTeam(nextTeam)
    setTeamQuery(team.name)
    setTeamResults([])
  }

  function handleTeamNameSearch() {
    const trimmed = teamQuery.trim()
    if (!trimmed) {
      setSelectedTeam(null)
      setScrims(fallbackScrims())
      setScrimMeta(fallbackScrimMeta())
      setTeamResults([])
      return
    }

    setSelectedTeam({
      teamId: '',
      teamName: trimmed,
      teamSlug: '',
    })
    setTeamResults([])
  }

  function handleDetailClick() {
    saveSelectedTeam(selectedTeam)
  }

  const selectedScrim = scrims[0] ?? fallbackScrims()[0]
  const heroScrimStatus = selectedTeam ? selectedScrim.entryStatusLabel || 'データ確認中' : 'チーム未選択'
  const heroApexStatus = rankMap?.name ?? '確認中'
  const activeLegends = pickRates.find(p => p.tier === activeLegendTab)?.legends ?? []
  const activeProLeague = proLeague.comps?.[0]

  return (
    <div className="site-shell">
      <SeoHead title={`${SITE_NAME} | Home`} description={SITE_DESCRIPTION} path="/" />

      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">APEX TEAM DASHBOARD</p>
          <h1>今日のApex情報を、チームでひと目で確認。</h1>
          <p className="hero__lead">
            ESCLスクリム、本日のランクマップ、レジェンドPick率、Pro Leagueメタ、最新ニュースをまとめてチェック。
            チームの試合準備に必要な情報をすぐに確認できます。
          </p>

          <div className="hero__statusRow hero__statusRow--three">
            <a
              href={selectedTeam && selectedScrim.detailUrl ? selectedScrim.detailUrl : '#team-search'}
              target={selectedTeam && selectedScrim.detailUrl ? '_blank' : undefined}
              rel={selectedTeam && selectedScrim.detailUrl ? 'noreferrer' : undefined}
              className="statusCard statusCard--link"
              onClick={selectedTeam && selectedScrim.detailUrl ? handleDetailClick : undefined}
            >
              <span className="statusCard__label">ESCL SCRIM</span>
              <strong className={heroScrimStatus === '参加' ? 'ok' : ''}>{heroScrimStatus}</strong>
            </a>

            <Link href="/apex/rank-map" className="statusCard statusCard--link">
              <span className="statusCard__label">RANK MAP</span>
              <strong>{heroApexStatus}</strong>
            </Link>

            <div className="statusCard">
              <span className="statusCard__label">TEAM RATE</span>
              <strong>{selectedTeam && selectedScrim.entryStatusLabel !== '該当チームなし' ? scrimMeta.ratePoint : '-'}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {/* ESCL自チーム情報セクション */}
        <section className="section">
          <SectionTitle eyebrow="ESCL" title="自チームのESCLスクリム情報" href="/escl" />

          <article className="card">
            <div className="esclTeamSection">
              <div className="esclTeamPicker" id="team-search">
                <div>
                  <p className="sectionHeader__sub">TEAM SELECT</p>
                  <h3>{selectedTeam ? selectedTeam.teamName || '選択中チーム' : 'チームを選択してください'}</h3>
                  <p>
                    ESCLチーム検索からチームを選択すると、参加状況・RATE・チェックイン状況を確認できます。
                  </p>
                </div>
                <form
                  className="teamSearchForm"
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleTeamNameSearch()
                  }}
                >
                  <label className="fieldLabel">
                    チーム名
                    <input
                      className="textInput"
                      value={teamQuery}
                      onChange={(event) => setTeamQuery(event.target.value)}
                      placeholder="チーム名を入力"
                    />
                  </label>
                  <button type="submit" className="button button--primary">
                    検索
                  </button>
                </form>
                <p className="esclCardNote">入力例: 京都ブライアンホテル</p>
                <div className="searchResults searchResults--compact">
                  {teamSearchLoading ? <div className="softPanel">検索しています。</div> : null}
                  {!teamSearchLoading && teamQuery.trim() && teamResults.length === 0 ? (
                    <div className="softPanel">候補が見つかりません。</div>
                  ) : null}
                  {teamResults.map((team) => (
                    <button
                      key={team.teamId}
                      type="button"
                      className="searchResultItem"
                      onClick={() => handleSelectTeam(team)}
                    >
                      <strong>{team.name}</strong>
                      <span>RATE {team.rate} / teamId {team.teamId}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTeam ? (
                scrims.map((scrim) => (
                  <div key={scrim.id} className="esclTeamCard">
                    <div className="esclCardHeader">
                      <strong>{selectedTeam.teamName || scrimMeta.teamName}</strong>
                      <span className={`esclStatus esclStatus--${scrim.entryStatus}`}>
                        {esclLoading ? 'データ確認中' : scrim.entryStatusLabel}
                      </span>
                    </div>
                    <div className="esclRateInline">RATE {scrim.entryStatusLabel === '該当チームなし' ? '-' : scrimMeta.ratePoint}</div>
                    <strong className="esclScrimTitle">{scrim.title}</strong>
                    {scrim.dateLabel && <div className="esclCardMeta">{scrim.dateLabel}</div>}
                    <div className="esclStatusGrid">
                      <span>参加状況: {esclLoading ? 'データ確認中' : scrim.entryStatusLabel}</span>
                      <span>チェックイン: {esclLoading ? 'データ確認中' : scrim.checkinStatusLabel}</span>
                      <span>最終確認: {scrimMeta.rateUpdatedAt.replace(/^最終確認:\\s*/, '')}</span>
                    </div>
                    {scrim.note && <div className="esclCardNote">{scrim.note}</div>}
                    {scrim.detailUrl ? (
                      <a
                        href={scrim.detailUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inlineLink"
                        onClick={handleDetailClick}
                      >
                        詳細を見る
                      </a>
                    ) : (
                      <span className="esclCardMeta">詳細データ確認中</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="esclTeamCard">
                  <div className="esclCardHeader">
                    <strong>-</strong>
                    <span className="esclStatus esclStatus--unknown">チーム未選択</span>
                  </div>
                  <div className="esclRateInline">RATE -</div>
                  <div className="esclStatusGrid">
                    <span>参加状況: チーム未選択</span>
                    <span>チェックイン: チーム未選択</span>
                  </div>
                  <p className="esclCardNote">
                    チーム名を入力するとESCL情報を確認できます。
                  </p>
                  <a href="#team-search" className="inlineLink">
                    チームを検索する
                  </a>
                </div>
              )}

              <div className="teamRateCard">
                <span className="teamRateLabel">TEAM RATE</span>
                <strong className="teamRateValue">
                  {selectedTeam && selectedScrim.entryStatusLabel !== '該当チームなし' ? scrimMeta.ratePoint : '-'}
                </strong>
                <p className="teamRateMeta">
                  {selectedTeam ? `${selectedTeam.teamName || scrimMeta.teamName} / ${scrimMeta.rateUpdatedAt}` : 'チーム未選択'}
                </p>
                {selectedTeam?.teamSlug ? (
                  <Link href={`/escl/${selectedTeam.teamSlug}`} className="inlineLink">
                    このチームの詳細を見る
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        </section>

        {/* ランクシーン */}
        <section className="section">
          <SectionTitle eyebrow="RANKED" title="ランクシーン" href="/apex/rank-map" />

          <div className="gridTwo">
            <article className="card">
              <CardTitle eyebrow="RANK MAP" title="本日のランクマップ" href="/apex/rank-map" />

              {loading ? (
                <div className="loadingPanel">現在のランクマップを確認中です。</div>
              ) : rankMap ? (
                <div className="apexMapCard">
                  <img src={rankMap.image} alt={rankMap.name} className="apexMapImage" />
                  <div className="apexMapMeta">
                    <p className="mapName">{rankMap.name}</p>
                    <p className="mapUpdatedAt">{rankMap.updatedAtLabel}</p>
                  </div>
                </div>
              ) : (
                <div className="loadingPanel">現在、本日のランクマップを確認中です。</div>
              )}
            </article>

            <article className="card">
              <div className="legendPickRateHeader">
                <CardTitle eyebrow="LEGEND PICK RATE" title="高Pick率レジェンド" href="/apex/legends-pick-rate" />
                <div className="legendTierTabs">
                  <button
                    className={`legendTabBtn ${activeLegendTab === 'diamond' ? 'active' : ''}`}
                    onClick={() => setActiveLegendTab('diamond')}
                  >
                    Diamond
                  </button>
                  <button
                    className={`legendTabBtn ${activeLegendTab === 'masterPredator' ? 'active' : ''}`}
                    onClick={() => setActiveLegendTab('masterPredator')}
                  >
                    Master/Pred
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loadingPanel">データ確認中です。</div>
              ) : activeLegends.length > 0 ? (
                <div className="legendGridCompact legendPickGrid">
                  {activeLegends.map((legend) => (
                    <div key={legend.name} className="legendCompactCard legendPickCard">
                      <span className="legendCompactRank">#{legend.rank}</span>
                      <div className="legendIconWrap">
                        <LegendIcon name={legend.name} icon={legend.image || legend.icon} className="legendIcon" />
                      </div>
                      <p className="legendName">{legend.name}</p>
                      <p className="legendPickLabel">{legend.pickRateLabel || `${legend.pickRate.toFixed(1)}%`}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="loadingPanel">
                  {pickRates.find(p => p.tier === activeLegendTab)?.message || 'データ確認中です。'}
                </div>
              )}
            </article>
          </div>
        </section>

        {/* Pro League メタ */}
        <section className="section">
          <SectionTitle eyebrow="PRO LEAGUE" title="Pro League メタ構成" href="/apex" />

          <div className="gridTwo">
            <article className="card">
              <CardTitle eyebrow="TEAM COMPOSITIONS" title="Pro League メタ構成" href="/apex" />
              {loading ? (
                <div className="loadingPanel">Pro League構成データを確認中です。</div>
              ) : proLeague.comps && proLeague.comps.length > 0 ? (
                <div className="proLeagueMetaSection proLeagueGrid">
                  {proLeague.message ? <div className="dataStatus">{proLeague.message}</div> : null}
                  <p className="proLeagueSource">{proLeague.sourceLabel}</p>
                  {proLeague.comps.map((comp) => (
                    <div key={`comp-${comp.rank}`} className="proLeagueMetaCard proLeagueCompCard">
                      <div className="metaCardHeader">
                        <span className="metaRank">#{comp.rank}</span>
                        <span className="metaPickRate">採用率 {comp.pickRate}</span>
                      </div>

                      <div className="metaLegendsRow proLeagueLegendRow">
                        {comp.legends.slice(0, 3).map((legend, idx) => {
                          const icon = comp.icons?.[idx] || ''
                          return (
                            <LegendIcon
                              key={`${comp.rank}-${legend}`}
                              name={legend}
                              icon={icon}
                              className="metaLegendIcon proLeagueLegendIcon"
                            />
                          )
                        })}
                      </div>

                      <div className="metaCardFooter">
                        <p className="metaRegion proLeagueMetaText">{comp.legends.join(' / ')}</p>
                        <p className="metaRegion proLeagueMetaText">{comp.region}</p>
                        {comp.comment && <p className="metaComment">コメント: {comp.comment}</p>}
                      </div>
                    </div>
                  ))}
                  <p className="dataUpdatedAt">最新取得: {proLeague.updatedAt}</p>
                </div>
              ) : (
                <div className="loadingPanel">現在最新データを確認中</div>
              )}
            </article>

            <article className="card">
              <CardTitle eyebrow="OVERALL RANKINGS" title="Pro League 総合順位 Top 5" href="/apex" />
              {loading ? (
                <div className="loadingPanel">Pro League順位データを確認中です。</div>
              ) : proLeague.standings && proLeague.standings.length > 0 ? (
                <div className="proLeagueList">
                  {proLeague.standings.map((team) => (
                    <div key={`${team.rank}-${team.teamName}`} className="proLeagueRow">
                      <div className="proLeagueMain">
                        <span className="proLeagueRank">#{team.rank}</span>
                        <TeamLogo name={team.teamName} logoUrl={team.icon} />
                        <div className="proLeagueTeamBlock">
                          <strong className="proLeagueTeamName">{team.teamName}</strong>
                          {team.members.length > 0 ? (
                            <p className="proLeaguePlayers">{team.members.join(' / ')}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="proLeagueStats">
                        <div className="proLeagueStat">
                          <span>SCORE</span>
                          <strong>{team.score}</strong>
                        </div>
                        <div className="proLeagueStat">
                          <span>KILLS</span>
                          <strong>{team.kills}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="dataUpdatedAt">最新取得: {proLeague.updatedAt}</p>
                </div>
              ) : (
                <div className="loadingPanel">{proLeague.standingsMessage || '現在順位データを確認中'}</div>
              )}
            </article>
          </div>
        </section>

        {/* Apexマップ攻略 */}
        <section className="section">
          <SectionTitle eyebrow="MAPS" title="Apexマップ攻略" href="/apex" />

          <div className="apexGuideGrid">
            {apexGuideMaps.map((map) => (
              <ApexGuideCard key={map.slug} map={map} />
            ))}
          </div>
        </section>

        {/* Apexニュース */}
        <section className="section">
          <article className="newsCard">
            <CardTitle eyebrow="NEWS" title="Apex最新情報" href="/apex/news" />

            {loading ? (
              <div className="loadingPanel">ニュースを確認中です。</div>
            ) : apexNews.length > 0 ? (
              <ul className="newsList">
                {apexNews.map((item) => (
                  <li key={item.id} className="newsList__item">
                    <div>
                      <div className="newsTopRow">
                        <span className="newsCategory">{item.category}</span>
                      </div>
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                      <p className="newsSummary">{item.summary}</p>
                    </div>
                    <small>{item.date}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="loadingPanel">現在ニュースを確認中です。</div>
            )}
          </article>
        </section>

        {/* AI Coach */}
        <section className="section">
          <article className="card aiCoachCard">
            <div className="aiCoachContent">
              <div>
                <p className="eyebrow">AI COACH</p>
                <h2>Apex AI Coach β版</h2>
                <p className="aiCoachDescription">
                  ファイトシーン・マクロ判断・IGLコールをAIが整理。
                  反省を感覚で終わらせず、次の試合でやることまで落とし込みます。
                </p>
                <div className="aiPlanMiniGrid">
                  {AI_COACH_PLANS.map((plan) => (
                    <span key={plan.name}>
                      <strong>{plan.name}</strong>
                      {plan.name === 'Free' ? 'サンプル分析' : plan.name === 'Lite' ? '月3回分析 / ¥980' : '月10回分析 / ¥1,980'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="aiCoachActions">
                <Link href="/ai-coach/sample-analysis" className="button button--primary">
                  サンプル分析を見る
                </Link>
                <Link href="/ai-coach" className="button button--secondary">
                  AI Coachを見る
                </Link>
                <Link href="/contact" className="button button--secondary">
                  β版に申し込む
                </Link>
              </div>
            </div>
          </article>
        </section>

        {/* 問い合わせ導線 */}
        <section className="section">
          <article className="card ctaCard">
            <h2>チーム利用・AI Coach・スポンサー掲載の相談はこちら</h2>
            <p>選択チームの分析導入、AI Coachの利用相談、スポンサー掲載までまとめて相談できます。</p>
            <Link href="/contact" className="button button--primary">
              問い合わせる
            </Link>
          </article>
        </section>
      </main>

      <footer className="footer">
        <Link href="/contact">チーム利用・AI Coach相談</Link>
        <span> / </span>
        <Link href="/pricing">料金プラン</Link>
        <span> / Apex Legends Team Dashboard</span>
      </footer>
    </div>
  )
}
