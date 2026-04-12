import Link from 'next/link'
import { useEffect, useState } from 'react'

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
  {
    name: 'Abyss',
    slug: 'abyss',
    image: '/valorant/abyss.jpg',
    status: 'archive',
    archiveLabel: 'アーカイブ',
  },
  {
    name: 'Corrode',
    slug: 'corrode',
    image: '/valorant/corrode.jpg',
    status: 'archive',
    archiveLabel: 'アーカイブ',
  },
]

function fallbackScrims(): ScrimItem[] {
  return [
    {
      id: 'scrim-fallback',
      title: '自チームのESCLスクリム情報',
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

function fallbackRankMap(): RankMapItem | null {
  return null
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
  const source = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.scrims ?? payload?.data ?? []

  if (!Array.isArray(source) || source.length === 0) {
    return fallbackScrims()
  }

  return source.slice(0, 3).map((item: any, index: number) => ({
    id: String(item?.id ?? `scrim-${index}`),
    title: String(item?.title ?? '自チームのESCLスクリム情報'),
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
  if (!payload || typeof payload !== 'object') {
    return fallbackRankMap()
  }

  const name = String(payload?.name ?? payload?.mapName ?? '')
  const slug = String(payload?.slug ?? '')
  const image = String(payload?.image ?? '')

  if (!name || !slug || !image) {
    return fallbackRankMap()
  }

  return {
    name,
    slug,
    image,
    updatedAtLabel: String(payload?.updatedAtLabel ?? '次回更新: 確認中'),
  }
}

function normalizeNewsResponse(payload: any, fallback: NewsItem[]): NewsItem[] {
  const source = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.news ?? payload?.articles ?? payload?.data ?? []

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
  const source = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.data ?? payload?.result ?? []

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

  if (items.length === 0) {
    return fallbackLegendMeta()
  }

  return items.some((item) => item.pickRate > 0) ? items : fallbackLegendMeta()
}

function ValorantMapCard({
  map,
  archive = false,
}: {
  map: ValorantMapCardItem
  archive?: boolean
}) {
  return (
    <article className={`valorantMapCard${archive ? ' valorantMapCard--archive' : ''}`}>
      <div className="valorantMapImageWrap">
        <img src={map.image} alt={map.name} className="valorantMapImage" />
        {archive && map.archiveLabel ? <span className="archiveBadge">{map.archiveLabel}</span> : null}
      </div>

      <div className="valorantMapMeta">
        <div className="mapFooterRow">
          <p className="mapName">{map.name}</p>
          <Link href={`/valorant/${map.slug}`} className="mapGuideLink">
            マップ解説
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function HomePage() {
  const [scrims, setScrims] = useState<ScrimItem[]>(fallbackScrims())
  const [scrimMeta, setScrimMeta] = useState<ScrimMeta>(fallbackScrimMeta())
  const [rankMap, setRankMap] = useState<RankMapItem | null>(fallbackRankMap())
  const [apexNews, setApexNews] = useState<NewsItem[]>(fallbackApexNews())
  const [valorantNews, setValorantNews] = useState<NewsItem[]>(fallbackValorantNews())
  const [legendMeta, setLegendMeta] = useState<ApexLegendMetaItem[]>(fallbackLegendMeta())
  const [loadingState, setLoadingState] = useState({
    scrim: true,
    rankMap: true,
  })

  useEffect(() => {
    let mounted = true

    async function load() {
      const [scrimResult, rankMapResult, apexNewsResult, valorantNewsResult, legendMetaResult] =
        await Promise.allSettled([
          fetchJson('/api/escl-status'),
          fetchJson('/api/rankmap'),
          fetchJson('/api/apex-news'),
          fetchJson('/api/valorant-news'),
          fetchJson('/api/apex-pick-rates'),
        ])

      if (!mounted) return

      if (scrimResult.status === 'fulfilled') {
        setScrims(normalizeScrimResponse(scrimResult.value))
        setScrimMeta(normalizeScrimMeta(scrimResult.value))
        setLoadingState((prev) => ({ ...prev, scrim: false }))
      }

      if (rankMapResult.status === 'fulfilled') {
        setRankMap(normalizeRankMapResponse(rankMapResult.value))
        setLoadingState((prev) => ({ ...prev, rankMap: false }))
      }

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
  const heroApexStatus = loadingState.rankMap ? '確認中' : rankMap?.name ?? '未確認'

  return (
    <div className="site-shell">
      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">APEX DASHBOARD</p>
          <h1>必要な情報を、ひと目で。</h1>
          <p className="hero__lead">
            Apex と VALORANT の最新情報、ESCL参加状況、ランクマップをまとめて確認できます。
          </p>

          <div className="hero__statusRow hero__statusRow--two">
            <div className="statusCard">
              <span className="statusCard__label">ESCL SCRIM</span>
              <strong className={!loadingState.scrim ? 'ok' : ''}>{heroScrimStatus}</strong>
            </div>

            <div className="statusCard">
              <span className="statusCard__label">APEX RANK MAP</span>
              <strong>{heroApexStatus}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="section">
          <div className="sectionHeader">
            <p className="sectionHeader__sub">APEX</p>
            <h2>Apex の情報</h2>
          </div>

          <div className="gridTwo">
            <article className="card">
              <div className="sectionHeader sectionHeader--compact">
                <p className="sectionHeader__sub">ESCL RESULT</p>
                <h3>スクリム</h3>
              </div>

              <div className="resultList">
                {scrims.map((item) => (
                  <div key={item.id} className="resultCardRow">
                    <div className="resultCardRow__top">
                      <strong>{item.title}</strong>
                      <span className="resultBadge">{item.statusLabel}</span>
                    </div>
                    {item.dateLabel ? <div className="resultCardRow__meta">{item.dateLabel}</div> : null}
                    <div className="resultCardRow__note">{item.note}</div>
                  </div>
                ))}
              </div>

              <div className="ratePointCard">
                <div className="ratePointCard__top">
                  <span className="ratePointCard__label">レートポイント</span>
                  <strong className="ratePointCard__value">{scrimMeta.ratePoint}</strong>
                </div>
                <p className="ratePointCard__sub">{scrimMeta.rateUpdatedAt}</p>
              </div>
            </article>

            <article className="card">
              <div className="sectionHeader sectionHeader--compact">
                <p className="sectionHeader__sub">RANK MAP</p>
                <h3>ランクマップローテーション</h3>
              </div>

              <p className="mapUpdateNote">
                GameFavo の「ランクマッチ &gt; 現在」を取得して表示しています。
              </p>

              {rankMap ? (
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
                <div className="loadingPanel">現在のランクマップを確認しています。</div>
              )}
            </article>
          </div>
        </section>

        <section className="section">
          <article className="card">
            <div className="sectionHeader sectionHeader--compact">
              <p className="sectionHeader__sub">LEGEND PICK RATE</p>
              <h3>高Pick率レジェンド</h3>
            </div>

            <div className="legendMetaGrid">
              {legendMeta.slice(0, 5).map((legend, index) => (
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
          </article>
        </section>

        <section className="section">
          <article className="newsCard">
            <div className="sectionHeader sectionHeader--compact">
              <p className="sectionHeader__sub">NEWS</p>
              <h3>Apex の最新情報</h3>
            </div>

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
          <div className="sectionHeader">
            <p className="sectionHeader__sub">VALORANT</p>
            <h2>VALORANT の情報</h2>
          </div>

          <article className="card">
            <div className="sectionHeader sectionHeader--compact">
              <p className="sectionHeader__sub">MAP ROTATION</p>
              <h3>現行シーズンのマップ</h3>
            </div>

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
            <div className="sectionHeader sectionHeader--compact">
              <p className="sectionHeader__sub">NEWS</p>
              <h3>VALORANT の最新情報</h3>
            </div>

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
      </main>

      <footer className="footer">Apex Dashboard</footer>
    </div>
  )
}
