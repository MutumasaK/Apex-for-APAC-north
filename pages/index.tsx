import Link from 'next/link'
import { useEffect, useState } from 'react'
import SeoHead from '../components/SeoHead'
import { SITE_DESCRIPTION, SITE_NAME, DEFAULT_TEAM_NAME } from '../lib/site'

type ScrimItem = {
  id: string
  title: string
  dateLabel: string
  participationStatus: 'participating' | 'not_participating' | 'pending'
  note: string
}

type ScrimMeta = {
  teamName: string
  ratePoint: number
  rateUpdatedAt: string
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
  icon?: string
  rank?: number
}

type PickRateData = {
  tier: 'diamond' | 'masterPredator'
  legends: LegendPickRate[]
  updatedAt: string
}

type ProLeagueComp = {
  rank: number
  legends: string[]
  pickRate: string
  region: string
  comment: string
  icons?: string[]
}

type ProLeagueData = {
  updatedAt: string
  sourceLabel: string
  comps: ProLeagueComp[]
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
      participationStatus: 'pending' as const,
      note: '',
    },
  ]
}

function fallbackScrimMeta(): ScrimMeta {
  return {
    teamName: DEFAULT_TEAM_NAME,
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
        { name: 'Octane', pickRate: 18.7, rank: 1 },
        { name: 'Mad Maggie', pickRate: 15.8, rank: 2 },
        { name: 'Alter', pickRate: 9.1, rank: 3 },
      ],
      updatedAt: '確認中',
    },
    {
      tier: 'masterPredator',
      legends: [
        { name: 'Wraith', pickRate: 16.2, rank: 1 },
        { name: 'Pathfinder', pickRate: 14.5, rank: 2 },
        { name: 'Gibraltar', pickRate: 12.3, rank: 3 },
      ],
      updatedAt: '確認中',
    },
  ]
}

function fallbackProLeague(): ProLeagueData {
  return {
    updatedAt: '確認中',
    sourceLabel: 'ALGS / Pro League',
    comps: [
      {
        rank: 1,
        legends: ['Bangalore', 'Catalyst', 'Bloodhound'],
        pickRate: '18.2%',
        region: 'APAC North',
        comment: '射線切りと索敵を両立しやすい安定構成',
      },
    ],
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json()
}

function normalizeScrimResponse(payload: any): ScrimItem[] {
  const source = Array.isArray(payload) ? payload : payload?.items ?? payload?.scrims ?? payload?.data ?? []

  if (!Array.isArray(source) || source.length === 0) {
    return fallbackScrims()
  }

  return source.slice(0, 3).map((item: any, index: number) => {
    const teamName = String(item?.teamName ?? DEFAULT_TEAM_NAME)
    const hasTeamInData = teamName.includes(DEFAULT_TEAM_NAME) || item?.isTeamParticipating === true
    
    return {
      id: String(item?.id ?? `scrim-${index}`),
      title: String(item?.title ?? 'ESCLチーム情報'),
      dateLabel: String(item?.dateLabel ?? ''),
      participationStatus: hasTeamInData ? 'participating' : 'not_participating' as const,
      note: String(item?.note ?? ''),
    }
  })
}

function normalizeScrimMeta(payload: any): ScrimMeta {
  const meta = payload?.meta ?? payload

  return {
    teamName: String(meta?.teamName ?? DEFAULT_TEAM_NAME),
    ratePoint: Number(meta?.ratePoint ?? meta?.rate ?? 0),
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

  // Diamond tier
  if (payload?.diamond?.legends || Array.isArray(payload?.diamond)) {
    const diamondLegends = Array.isArray(payload.diamond) ? payload.diamond : payload.diamond.legends || []
    if (diamondLegends.length > 0) {
      result.push({
        tier: 'diamond',
        legends: diamondLegends.slice(0, 5).map((item: any, idx: number) => ({
          name: String(item?.name ?? ''),
          pickRate: Number(item?.pickRate ?? 0),
          icon: String(item?.icon ?? `/legends/${item?.name?.toLowerCase()}.png`),
          rank: idx + 1,
        })).filter((l: any) => l.name),
        updatedAt: String(payload?.diamond?.updatedAt ?? payload?.updatedAt ?? '確認中'),
      })
    }
  }

  // Master/Predator tier
  if (payload?.masterPredator?.legends || (Array.isArray(payload?.masterPredator) && payload.masterPredator.length > 0)) {
    const mpLegends = Array.isArray(payload.masterPredator) ? payload.masterPredator : payload.masterPredator.legends || []
    if (mpLegends.length > 0) {
      result.push({
        tier: 'masterPredator',
        legends: mpLegends.slice(0, 5).map((item: any, idx: number) => ({
          name: String(item?.name ?? ''),
          pickRate: Number(item?.pickRate ?? 0),
          icon: String(item?.icon ?? `/legends/${item?.name?.toLowerCase()}.png`),
          rank: idx + 1,
        })).filter((l: any) => l.name),
        updatedAt: String(payload?.masterPredator?.updatedAt ?? payload?.updatedAt ?? '確認中'),
      })
    }
  }

  return result.length > 0 ? result : fallbackPickRates()
}

function normalizeProLeagueResponse(payload: any): ProLeagueData {
  const comps = Array.isArray(payload?.comps) ? payload.comps : Array.isArray(payload?.compositions) ? payload.compositions : []

  if (!Array.isArray(comps) || comps.length === 0) {
    return fallbackProLeague()
  }

  return {
    updatedAt: String(payload?.updatedAt ?? '確認中'),
    sourceLabel: String(payload?.sourceLabel ?? 'ALGS / Pro League'),
    comps: comps.slice(0, 5).map((item: any, idx: number) => ({
      rank: Number(item?.rank ?? idx + 1),
      legends: Array.isArray(item?.legends) ? item.legends.slice(0, 3) : [],
      pickRate: String(item?.pickRate ?? item?.adoptionRate ?? '0%'),
      region: String(item?.region ?? item?.tournament ?? 'N/A'),
      comment: String(item?.comment ?? ''),
      icons: Array.isArray(item?.icons) ? item.icons : item?.legends?.map((l: string) => `/legends/${l.toLowerCase()}.png`) || [],
    }))
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

export default function HomePage() {
  const [scrims, setScrims] = useState<ScrimItem[]>(fallbackScrims())
  const [scrimMeta, setScrimMeta] = useState<ScrimMeta>(fallbackScrimMeta())
  const [rankMap, setRankMap] = useState<RankMapItem | null>(null)
  const [pickRates, setPickRates] = useState<PickRateData[]>(fallbackPickRates())
  const [proLeague, setProLeague] = useState<ProLeagueData>(fallbackProLeague())
  const [apexNews, setApexNews] = useState<NewsItem[]>(fallbackApexNews())
  const [activeLegendTab, setActiveLegendTab] = useState<'diamond' | 'masterPredator'>('diamond')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [scrimResult, rankMapResult, pickRatesResult, proLeagueResult, newsResult] = await Promise.allSettled([
          fetchJson('/api/escl-status'),
          fetchJson('/api/rankmap'),
          fetchJson('/api/apex-pick-rates'),
          fetchJson('/api/apex-proleague'),
          fetchJson('/api/apex-news'),
        ])

        if (!mounted) return

        if (scrimResult.status === 'fulfilled') {
          setScrims(normalizeScrimResponse(scrimResult.value))
          setScrimMeta(normalizeScrimMeta(scrimResult.value))
        }

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

  const heroScrimStatus = scrims[0]?.participationStatus === 'participating' ? '参加' : scrims[0]?.participationStatus === 'not_participating' ? '未参加' : '確認中'
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
            <Link href="/escl" className="statusCard statusCard--link">
              <span className="statusCard__label">ESCL SCRIM</span>
              <strong className={heroScrimStatus === '参加' ? 'ok' : ''}>{heroScrimStatus}</strong>
            </Link>

            <Link href="/apex/rank-map" className="statusCard statusCard--link">
              <span className="statusCard__label">RANK MAP</span>
              <strong>{heroApexStatus}</strong>
            </Link>

            <div className="statusCard">
              <span className="statusCard__label">TEAM RATE</span>
              <strong>{scrimMeta.ratePoint}</strong>
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
              {scrims.map((scrim) => (
                <div key={scrim.id} className="esclTeamCard">
                  <div className="esclCardHeader">
                    <strong>{scrim.title}</strong>
                    <span className={`esclStatus esclStatus--${scrim.participationStatus}`}>
                      {scrim.participationStatus === 'participating' ? '参加' : scrim.participationStatus === 'not_participating' ? '未参加' : '確認中'}
                    </span>
                  </div>
                  {scrim.dateLabel && <div className="esclCardMeta">{scrim.dateLabel}</div>}
                  {scrim.note && <div className="esclCardNote">{scrim.note}</div>}
                </div>
              ))}

              <div className="teamRateCard">
                <span className="teamRateLabel">本日のRATE</span>
                <strong className="teamRateValue">{scrimMeta.ratePoint}</strong>
                <p className="teamRateMeta">{scrimMeta.teamName} / {scrimMeta.rateUpdatedAt}</p>
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
                <div className="legendGridCompact">
                  {activeLegends.map((legend) => (
                    <div key={legend.name} className="legendCompactCard">
                      <div className="legendIconWrap">
                        <img src={legend.icon} alt={legend.name} className="legendIcon" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      </div>
                      <p className="legendName">{legend.name}</p>
                      <p className="legendPickLabel">{legend.pickRate.toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="loadingPanel">データ確認中です。</div>
              )}
            </article>
          </div>
        </section>

        {/* Pro League メタ */}
        <section className="section">
          <SectionTitle eyebrow="PRO LEAGUE" title="Pro Leagueメタ" href="/apex" />

          <article className="card">
            {loading ? (
              <div className="loadingPanel">Pro League構成データを確認中です。</div>
            ) : proLeague.comps && proLeague.comps.length > 0 ? (
              <div className="proLeagueMetaSection">
                {proLeague.comps.map((comp) => (
                  <div key={`comp-${comp.rank}`} className="proLeagueMetaCard">
                    <div className="metaCardHeader">
                      <span className="metaRank">#{comp.rank}</span>
                      <span className="metaPickRate">{comp.pickRate}</span>
                    </div>

                    <div className="metaLegendsRow">
                      {comp.icons && comp.icons.length > 0
                        ? comp.icons.map((icon, idx) => (
                            <img
                              key={`${comp.rank}-${idx}`}
                              src={icon}
                              alt={comp.legends[idx] || `Legend ${idx + 1}`}
                              className="metaLegendIcon"
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          ))
                        : comp.legends.slice(0, 3).map((legend, idx) => (
                            <div key={`${comp.rank}-text-${idx}`} className="metaLegendText">
                              {legend}
                            </div>
                          ))}
                    </div>

                    <div className="metaCardFooter">
                      <p className="metaRegion">{comp.region}</p>
                      {comp.comment && <p className="metaComment">{comp.comment}</p>}
                    </div>
                  </div>
                ))}
                <p className="dataUpdatedAt">最新取得: {proLeague.updatedAt}</p>
              </div>
            ) : (
              <div className="loadingPanel">Pro League構成データを確認中です。</div>
            )}
          </article>
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

        {/* AI Coach Coming Soon */}
        <section className="section">
          <article className="card aiCoachCard">
            <div className="aiCoachContent">
              <div>
                <p className="eyebrow">AI COACH</p>
                <h2>ファイトシーン分析</h2>
                <p className="aiCoachDescription">
                  ファイトシーンをアップロードすると、立ち位置・射線管理・IGLコール・マクロ判断をAIが分析。
                  チームの反省会を短時間で整理できます。
                </p>
              </div>

              <div className="aiCoachActions">
                <Link href="/ai-coach" className="button button--primary">
                  サンプル分析を見る
                </Link>
                <Link href="/contact" className="button button--secondary">
                  チーム利用を相談
                </Link>
              </div>
            </div>
          </article>
        </section>

        {/* 問い合わせ導線 */}
        <section className="section">
          <article className="card ctaCard">
            <h2>チーム向け機能について</h2>
            <p>AI Coach、試合履歴保存、チーム分析、Discord通知など、チーム向けの有料プランをご用意しています。</p>
            <Link href="/contact" className="button button--primary">
              チーム利用・スポンサー掲載の相談はこちら
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
