import Link from 'next/link'
import { useEffect, useState } from 'react'
import SeoHead from '../components/SeoHead'
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/site'

type ScrimItem = {
  id: string
  title: string
  dateLabel: string
  statusLabel: string
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

type ProLeagueItem = {
  rank: number
  teamName: string
  score: number
  kills: number
  players: string[]
  iconUrl: string
}

type NewsItem = {
  id: string
  title: string
  href: string
  date: string
  category: string
  summary: string
}

type ApexLegendMetaItem = {
  name: string
  pickRate: number
}

type ValorantMapCardItem = {
  name: string
  slug: string
  image: string
  status: 'current' | 'archive'
  archiveLabel?: string
}

const currentValorantMaps: ValorantMapCardItem[] = [
  { name: 'Haven', slug: 'haven', image: '/valorant/haven.jpg', status: 'current' },
  { name: 'Split', slug: 'split', image: '/valorant/split.jpg', status: 'current' },
  { name: 'Bind', slug: 'bind', image: '/valorant/bind.jpg', status: 'current' },
  { name: 'Breeze', slug: 'breeze', image: '/valorant/breeze.jpg', status: 'current' },
  { name: 'Fracture', slug: 'fracture', image: '/valorant/fracture.jpg', status: 'current' },
  { name: 'Lotus', slug: 'lotus', image: '/valorant/lotus.jpg', status: 'current' },
  { name: 'Pearl', slug: 'pearl', image: '/valorant/pearl.jpg', status: 'current' },
]

const archiveValorantMaps: ValorantMapCardItem[] = [
  { name: 'Abyss', slug: 'abyss', image: '/valorant/abyss.jpg', status: 'archive', archiveLabel: 'アーカイブ' },
  { name: 'Corrode', slug: 'corrode', image: '/valorant/corrode.jpg', status: 'archive', archiveLabel: 'アーカイブ' },
]

function fallbackScrims(): ScrimItem[] {
  return [
    {
      id: 'scrim-fallback',
      title: 'ESCLチーム情報',
      dateLabel: '',
      statusLabel: '確認中',
      note: 'ESCL参加状況を確認しています。',
    },
  ]
}

function fallbackScrimMeta(): ScrimMeta {
  return {
    teamName: '京都ブライアンホテル',
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

function fallbackValorantNews(): NewsItem[] {
  return [
    {
      id: 'valorant-news-fallback',
      title: 'VALORANT 最新ニュースを取得できませんでした',
      href: 'https://playvalorant.com/ja-jp/news/',
      date: '最新',
      category: 'VALORANT Official',
      summary: 'VALORANT公式ニュースページへのリンクを表示しています。',
    },
  ]
}

function fallbackLegendMeta(): ApexLegendMetaItem[] {
  return [
    { name: 'Octane', pickRate: 18.7 },
    { name: 'Mad Maggie', pickRate: 15.8 },
    { name: 'Alter', pickRate: 9.1 },
    { name: 'Valkyrie', pickRate: 8.1 },
    { name: 'Bangalore', pickRate: 7.5 },
  ]
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

  return source.slice(0, 3).map((item: any, index: number) => ({
    id: String(item?.id ?? `scrim-${index}`),
    title: String(item?.title ?? 'ESCLチーム情報'),
    dateLabel: String(item?.dateLabel ?? ''),
    statusLabel: String(item?.statusLabel ?? item?.status ?? '確認中'),
    note: String(item?.note ?? '詳細を確認しています。'),
  }))
}

function normalizeScrimMeta(payload: any): ScrimMeta {
  const meta = payload?.meta ?? payload

  return {
    teamName: String(meta?.teamName ?? '京都ブライアンホテル'),
    ratePoint: Number(meta?.ratePoint ?? 0),
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
    updatedAtLabel: String(payload?.updatedAtLabel ?? '次回更新: 確認中'),
  }
}

function normalizeProLeagueResponse(payload: any): ProLeagueItem[] {
  const source = Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? []

  if (!Array.isArray(source) || source.length === 0) {
    return []
  }

  return source
    .slice(0, 5)
    .map((item: any, index: number) => ({
      rank: Number(item?.rank ?? index + 1),
      teamName: String(item?.teamName ?? item?.name ?? ''),
      score: Number(item?.score ?? 0),
      kills: Number(item?.kills ?? 0),
      players: Array.isArray(item?.players)
        ? item.players.map((player: unknown) => String(player)).filter(Boolean)
        : [],
      iconUrl: String(item?.logoUrl ?? item?.iconUrl ?? ''),
    }))
    .filter((item: ProLeagueItem) => item.rank > 0 && item.teamName)
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

function normalizeLegendMetaResponse(payload: any): ApexLegendMetaItem[] {
  const source = Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? payload?.result ?? []

  if (!Array.isArray(source) || source.length === 0) {
    return fallbackLegendMeta()
  }

  const items = source
    .slice(0, 5)
    .map((item: any) => ({
      name: String(item?.name ?? ''),
      pickRate: Number(item?.pickRate ?? 0),
    }))
    .filter((item: ApexLegendMetaItem) => item.name)

  return items.length > 0 ? items : fallbackLegendMeta()
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

function ValorantMapCard({ map, archive = false }: { map: ValorantMapCardItem; archive?: boolean }) {
  return (
    <article className={`valorantMapCard${archive ? ' valorantMapCard--archive' : ''}`}>
      <div className="valorantMapImageWrap">
        <img src={map.image} alt={map.name} className="valorantMapImage" />
        <div className="valorantMapOverlay">
          <span>{archive ? 'ARCHIVE MAP' : 'VALORANT MAP'}</span>
          <strong>{map.name}</strong>
        </div>
        {archive && map.archiveLabel ? <span className="archiveBadge">{map.archiveLabel}</span> : null}
      </div>

      <div className="valorantMapMeta">
        <div className="mapFooterRow">
          <p className="mapName">{map.name}</p>
          <Link href={`/valorant/${map.slug}`} className="mapGuideLink">
            マップ攻略
          </Link>
        </div>
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
  const [proLeagueItems, setProLeagueItems] = useState<ProLeagueItem[]>([])
  const [apexNews, setApexNews] = useState<NewsItem[]>(fallbackApexNews())
  const [valorantNews, setValorantNews] = useState<NewsItem[]>(fallbackValorantNews())
  const [legendMeta, setLegendMeta] = useState<ApexLegendMetaItem[]>(fallbackLegendMeta())
  const [showAllLegends, setShowAllLegends] = useState(false)
  const [loadingState, setLoadingState] = useState({
    proLeague: true,
    scrim: true,
    rankMap: true,
  })

  useEffect(() => {
    let mounted = true

    async function load() {
      const [proLeagueResult, scrimResult, rankMapResult, apexNewsResult, valorantNewsResult, legendMetaResult] =
        await Promise.allSettled([
          fetchJson('/api/apex-proleague'),
          fetchJson('/api/escl-status'),
          fetchJson('/api/rankmap'),
          fetchJson('/api/apex-news'),
          fetchJson('/api/valorant-news'),
          fetchJson('/api/apex-pick-rates'),
        ])

      if (!mounted) return

      if (proLeagueResult.status === 'fulfilled') {
        setProLeagueItems(normalizeProLeagueResponse(proLeagueResult.value))
      }
      setLoadingState((prev) => ({ ...prev, proLeague: false }))

      if (scrimResult.status === 'fulfilled') {
        setScrims(normalizeScrimResponse(scrimResult.value))
        setScrimMeta(normalizeScrimMeta(scrimResult.value))
      }
      setLoadingState((prev) => ({ ...prev, scrim: false }))

      if (rankMapResult.status === 'fulfilled') {
        setRankMap(normalizeRankMapResponse(rankMapResult.value))
      }
      setLoadingState((prev) => ({ ...prev, rankMap: false }))

      if (apexNewsResult.status === 'fulfilled') {
        setApexNews(normalizeNewsResponse(apexNewsResult.value, fallbackApexNews()))
      }

      if (valorantNewsResult.status === 'fulfilled') {
        setValorantNews(normalizeNewsResponse(valorantNewsResult.value, fallbackValorantNews()))
      }

      if (legendMetaResult.status === 'fulfilled') {
        setLegendMeta(normalizeLegendMetaResponse(legendMetaResult.value))
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  const heroScrimStatus = loadingState.scrim ? '確認中' : scrims[0]?.statusLabel ?? '未確認'
  const heroApexStatus = loadingState.rankMap ? '確認中' : rankMap ? rankMap.name : '取得中'
  const visibleLegendMeta = showAllLegends ? legendMeta.slice(0, 5) : legendMeta.slice(0, 3)

  return (
    <div className="site-shell">
      <SeoHead title={`${SITE_NAME} | Home`} description={SITE_DESCRIPTION} path="/" />

      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">APEX DASHBOARD</p>
          <h1>必要な情報を、ひと目で。</h1>
          <p className="hero__lead">
            Apex と VALORANT の最新情報、ESCL参加状況、ランクマップ、AI Coachをまとめて確認できます。
          </p>

          <div className="hero__statusRow hero__statusRow--two">
            <Link href="/escl" className="statusCard statusCard--link">
              <span className="statusCard__label">ESCL SCRIM</span>
              <strong className={!loadingState.scrim ? 'ok' : ''}>{heroScrimStatus}</strong>
            </Link>

            <Link href="/apex/rank-map" className="statusCard statusCard--link">
              <span className="statusCard__label">APEX RANK MAP</span>
              <strong>{heroApexStatus}</strong>
            </Link>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="section">
          <SectionTitle eyebrow="APEX" title="Apex の情報" href="/apex" />

          <div className="gridTwo">
            <article className="card">
              <CardTitle eyebrow="APEX COMPETITIVE" title="競技シーン" href="/escl" />

              <div className="competitiveCard">
                <section className="competitiveBlock">
                  <div className="competitiveBlockHeader">
                    <p className="competitiveBlockLabel">PRO LEAGUE</p>
                    <h4 className="competitiveBlockTitle">Pro League</h4>
                  </div>

                  {loadingState.proLeague ? (
                    <div className="loadingPanel">Pro League 総合順位を確認しています。</div>
                  ) : proLeagueItems.length > 0 ? (
                    <div className="proLeagueList">
                      {proLeagueItems.map((item) => (
                        <article key={`${item.rank}-${item.teamName}`} className="proLeagueRow">
                          <div className="proLeagueMain">
                            <span className="proLeagueRank">#{item.rank}</span>
                            <TeamLogo name={item.teamName} logoUrl={item.iconUrl} />
                            <div className="proLeagueTeamBlock">
                              <strong className="proLeagueTeamName">{item.teamName}</strong>
                              {item.players.length > 0 ? (
                                <p className="proLeaguePlayers">{item.players.join(' / ')}</p>
                              ) : null}
                            </div>
                          </div>

                          <div className="proLeagueStats">
                            <div className="proLeagueStat">
                              <span>Score</span>
                              <strong>{item.score}</strong>
                            </div>
                            <div className="proLeagueStat">
                              <span>Kills</span>
                              <strong>{item.kills}</strong>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="loadingPanel">現在のPro League総合順位は取得できませんでした。</div>
                  )}
                </section>

                <div className="competitiveDivider" />

                <section className="competitiveBlock">
                  <div className="competitiveBlockHeader">
                    <p className="competitiveBlockLabel">SCRIM</p>
                    <Link href="/escl" className="sectionTitleLink sectionTitleLink--small">
                      <h4 className="competitiveBlockTitle">ESCLチーム情報</h4>
                      <span>詳細を見る</span>
                    </Link>
                  </div>

                  <div className="resultList">
                    {scrims.map((item) => (
                      <div key={item.id} className="resultCardRow">
                        <div className="resultCardRow__top">
                          <strong>{item.title}</strong>
                          <span className="resultBadge">{item.statusLabel}</span>
                        </div>
                        {item.dateLabel ? <div className="resultCardRow__meta">{item.dateLabel}</div> : null}
                        {item.note ? <div className="resultCardRow__note">{item.note}</div> : null}
                      </div>
                    ))}
                  </div>

                  <div className="ratePointCard">
                    <div className="ratePointCard__top">
                      <span className="ratePointCard__label">選択中チーム</span>
                      <strong className="ratePointCard__value">{scrimMeta.ratePoint}</strong>
                    </div>
                    <p className="ratePointCard__sub">
                      {scrimMeta.teamName} / {scrimMeta.rateUpdatedAt}
                    </p>
                  </div>
                </section>
              </div>
            </article>

            <article className="card">
              <CardTitle eyebrow="APEX RANKED" title="ランクシーン" href="/apex/rank-map" />

              <div className="rankSceneCard">
                <section className="competitiveBlock">
                  <div className="competitiveBlockHeader">
                    <p className="competitiveBlockLabel">RANK MAP</p>
                    <Link href="/apex/rank-map" className="sectionTitleLink sectionTitleLink--small">
                      <h4 className="competitiveBlockTitle">本日のランクマップ</h4>
                      <span>詳細を見る</span>
                    </Link>
                  </div>

                  {loadingState.rankMap ? (
                    <div className="loadingPanel">現在のランクマップを確認しています。</div>
                  ) : rankMap ? (
                    <article className="apexMapCard">
                      <img src={rankMap.image} alt={rankMap.name} className="apexMapImage" />
                      <div className="apexMapMeta">
                        <div className="mapFooterRow">
                          <p className="mapName">{rankMap.name}</p>
                        </div>
                        <p className="mapUpdatedAt">{rankMap.updatedAtLabel}</p>
                      </div>
                    </article>
                  ) : (
                    <div className="loadingPanel">現在のランクマップを取得できませんでした。</div>
                  )}
                </section>

                <div className="competitiveDivider" />

                <section className="competitiveBlock">
                  <div className="competitiveBlockHeader">
                    <p className="competitiveBlockLabel">LEGEND PICK RATE</p>
                    <Link href="/apex/legends-pick-rate" className="sectionTitleLink sectionTitleLink--small">
                      <h4 className="competitiveBlockTitle">高Pick率レジェンド</h4>
                      <span>詳細を見る</span>
                    </Link>
                  </div>

                  <div className="rankLegendGrid">
                    {visibleLegendMeta.map((legend, index) => (
                      <article key={legend.name} className="legendMetaCard">
                        <div className="legendMetaCard__top">
                          <span className="legendMetaRank">TOP {index + 1}</span>
                          <strong>{legend.name}</strong>
                        </div>

                        <div className="legendMetaRateRow">
                          <span className="legendMetaRateLabel">Pick Rate</span>
                          <strong className="legendMetaRateValue">{legend.pickRate.toFixed(1)}%</strong>
                        </div>

                        <div className="legendMetaBar">
                          <div
                            className="legendMetaBar__fill"
                            style={{ width: `${Math.min(legend.pickRate, 100)}%` }}
                          />
                        </div>
                      </article>
                    ))}
                  </div>

                  {legendMeta.length > 3 ? (
                    <div className="legendMetaToggleWrap">
                      <button
                        type="button"
                        className="legendMetaToggleButton"
                        onClick={() => setShowAllLegends((prev) => !prev)}
                      >
                        {showAllLegends ? '閉じる' : 'もっと見る'}
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <article className="newsCard">
            <CardTitle eyebrow="NEWS" title="Apex の最新情報" href="/apex/news" />

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
          </article>
        </section>

        <section className="section">
          <SectionTitle eyebrow="VALORANT" title="VALORANT の情報" href="/valorant" />

          <article className="card">
            <CardTitle eyebrow="MAP ROTATION" title="現シーズンのマップローテーション" href="/valorant/maps" />

            <div className="valorantMapGrid">
              {currentValorantMaps.map((map) => (
                <ValorantMapCard key={map.slug} map={map} />
              ))}
            </div>
          </article>
        </section>

        <section className="section">
          <article className="card card--archive">
            <div className="sectionHeader sectionHeader--compact">
              <p className="sectionHeader__sub">ARCHIVE</p>
              <h3>アーカイブマップ</h3>
            </div>
            <p className="archiveLead">
              現在のローテーション外にあるマップです。必要なときにすぐ確認できるように残しています。
            </p>

            <div className="valorantArchiveGrid">
              {archiveValorantMaps.map((map) => (
                <ValorantMapCard key={map.slug} map={map} archive />
              ))}
            </div>
          </article>
        </section>

        <section className="section">
          <article className="newsCard">
            <CardTitle eyebrow="NEWS" title="VALORANT の最新情報" href="/valorant/news" />

            <ul className="newsList">
              {valorantNews.map((item) => (
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
          </article>
        </section>

        <section className="section">
          <article className="card aiCoachHomeCard">
            <CardTitle eyebrow="AI COACH" title="ファイトシーンを、AIが競技目線で分析。" href="/ai-coach" />
            <div className="aiCoachHomeGrid">
              {[
                'ファイト開始前の判断',
                'ポジション取り',
                '射線管理',
                'カバータイミング',
                'ダウン原因',
                'その瞬間に言うべきIGLコール',
                '次の試合で使える改善チェックリスト',
              ].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="heroActionRow">
              <Link href="/ai-coach" className="button button--primary">
                AI Coachを見る
              </Link>
              <Link href="/pricing" className="button button--ghost">
                料金プラン
              </Link>
              <Link href="/contact" className="button button--ghost">
                問い合わせ
              </Link>
            </div>
          </article>
        </section>
      </main>

      <footer className="footer">
        <Link href="/contact">問い合わせ</Link>
        <span> / </span>
        <Link href="/pricing">料金プラン</Link>
        <span> / Apex Dashboard</span>
      </footer>
    </div>
  )
}
