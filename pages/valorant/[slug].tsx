import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

type MapAgent = {
  name: string
  role?: string
  pickRate: number
}

type ValorantMapData = {
  slug: string
  titleJa: string
  titleEn: string
  subtitle: string
  overview: string
  attackLabel: string
  defendLabel: string
  focusLabel: string
  attackPoints: string[]
  defendPoints: string[]
  focusPoints: string[]
  mapPickRate: number
  memo: string
  trackerSlug: string
  currentRotation: boolean
  appMediaUrl: string
  detailImage: string
}

const valorantMapData: Record<string, ValorantMapData> = {
  haven: {
    slug: 'haven',
    titleJa: 'ヘイヴン',
    titleEn: 'Haven',
    subtitle: 'VALORANT MAP DETAIL',
    overview: '3サイト構成で守りの配置が難しいマップです。攻めは人数差を作って一気に崩す動きが重要です。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['3サイトのどこを攻めるかを早めに決める', 'ミッド圧で守りの人数配分を崩す'],
    defendPoints: ['AとCの寄り速度を意識する', '情報スキルで空いているサイトを減らす'],
    focusPoints: ['ミッド周りの主導権', '寄りとローテーション速度'],
    mapPickRate: 49,
    memo: 'サイト数が多く、情報取得と寄り判断の質がそのまま勝率に繋がります。',
    trackerSlug: 'haven',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/75609382',
    detailImage: '/valorant/haven.webp',
  },
  split: {
    slug: 'split',
    titleJa: 'スプリット',
    titleEn: 'Split',
    subtitle: 'VALORANT MAP DETAIL',
    overview: '縦方向の攻防が多く、ミッド管理の価値が高いマップです。設置後の連携で差がつきやすいです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['ミッドを絡めて2方向から圧をかける', 'スモークとフラッシュを重ねて侵入する'],
    defendPoints: ['ミッドの視界を簡単に渡さない', 'ヘブンからのクロスを維持する'],
    focusPoints: ['ミッド支配', 'ヘブンとサイト内の連携'],
    mapPickRate: 52,
    memo: 'ミッドを使えるチームほど攻めの選択肢が増えます。',
    trackerSlug: 'split',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/75611542',
    detailImage: '/valorant/split.webp',
  },
  bind: {
    slug: 'bind',
    titleJa: 'バインド',
    titleEn: 'Bind',
    subtitle: 'VALORANT MAP DETAIL',
    overview: 'テレポーターを軸にフェイクと人数寄せが発生しやすいマップです。サイト進入時のスキル連携が重要です。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['テレポーターで守りの視線を揺さぶる', '設置前に前線のクリアを丁寧に行う'],
    defendPoints: ['テレポーター音に過剰反応しすぎない', 'ロングの情報を早めに取る'],
    focusPoints: ['フェイクの質', 'ロングとショートの管理'],
    mapPickRate: 47,
    memo: '音情報の扱いが勝敗に直結しやすいマップです。',
    trackerSlug: 'bind',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/75609295',
    detailImage: '/valorant/bind.webp',
  },
  breeze: {
    slug: 'breeze',
    titleJa: 'ブリーズ',
    titleEn: 'Breeze',
    subtitle: 'VALORANT MAP DETAIL',
    overview: '広い射線とロング主体の撃ち合いが特徴です。無理な詰めよりも角度管理が大切です。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['広いサイトを一気に取り切る', 'ロングの圧を継続して守りを下げる'],
    defendPoints: ['不用意にピークしすぎない', '広いサイトをスキルで分断して守る'],
    focusPoints: ['ロングの射線管理', '人数差を作らない守り'],
    mapPickRate: 45,
    memo: 'サイトに入る前の削り合いで優位を取れるかが大切です。',
    trackerSlug: 'breeze',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/75609289',
    detailImage: '/valorant/breeze.webp',
  },
  fracture: {
    slug: 'fracture',
    titleJa: 'フラクチャー',
    titleEn: 'Fracture',
    subtitle: 'VALORANT MAP DETAIL',
    overview: '両側から攻めやすい特殊構造で、守りは連携のズレが出やすいマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['2方向同時に圧をかける', 'エリア取得後にテンポ良く寄る'],
    defendPoints: ['初動で情報を取り切る', 'どこを捨てるかを早めに決める'],
    focusPoints: ['タイミング合わせ', '守りの分担整理'],
    mapPickRate: 43,
    memo: '連携が崩れると一気にサイトが割られやすいです。',
    trackerSlug: 'fracture',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/75609286',
    detailImage: '/valorant/fracture.webp',
  },
  lotus: {
    slug: 'lotus',
    titleJa: 'ロータス',
    titleEn: 'Lotus',
    subtitle: 'VALORANT MAP DETAIL',
    overview: '3サイトと回転ドアが特徴で、攻守ともに判断量が多いマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['ドアや破壊可能壁を活用して揺さぶる', 'サイトを見せてからの寄り直しを使う'],
    defendPoints: ['AとCの情報を切らさない', '人数差で無理に取り返さない'],
    focusPoints: ['ドア周りの使い方', '3サイトの人数配分'],
    mapPickRate: 44,
    memo: '情報量が多いので、迷わないコールが大切です。',
    trackerSlug: 'lotus',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/76382044',
    detailImage: '/valorant/lotus.webp',
  },
  pearl: {
    slug: 'pearl',
    titleJa: 'パール',
    titleEn: 'Pearl',
    subtitle: 'VALORANT MAP DETAIL',
    overview: 'ロングとミッドの圧が重要で、攻めの形を丁寧に作る必要があるマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['ミッドからの圧をかけて守りを分断する', 'ロングの主導権を握って設置を安定させる'],
    defendPoints: ['無理な撃ち合いを減らす', 'サイト内で時間を使って寄りを待つ'],
    focusPoints: ['ロングの人数管理', 'A/B の情報共有'],
    mapPickRate: 41,
    memo: 'ロング主導の撃ち合いが多く、前に出る判断が難しいマップです。',
    trackerSlug: 'pearl',
    currentRotation: true,
    appMediaUrl: 'https://appmedia.jp/valorant/75654946',
    detailImage: '/valorant/pearl.webp',
  },
  abyss: {
    slug: 'abyss',
    titleJa: 'アビス',
    titleEn: 'Abyss',
    subtitle: 'VALORANT MAP DETAIL',
    overview: '落下エリアと広いレーンが特徴で、位置取りの精度が問われるマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['落下リスクを理解してピークする', '広いレーンを使って挟みを作る'],
    defendPoints: ['不用意な前詰めを減らす', '人数不利ではリテイク重視に切り替える'],
    focusPoints: ['落下ラインの把握', '広い射線の共有'],
    mapPickRate: 38,
    memo: '事故が起きやすいので、安定した立ち回りが特に大切です。',
    trackerSlug: 'abyss',
    currentRotation: false,
    appMediaUrl: 'https://appmedia.jp/valorant/78209657',
    detailImage: '/valorant/abyss.webp',
  },
  corrode: {
    slug: 'corrode',
    titleJa: 'コロード',
    titleEn: 'Corrode',
    subtitle: 'VALORANT MAP DETAIL',
    overview: 'まだ研究途中の要素が多く、テンポ良い連携と情報共有が差になりやすいマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: ['ユーティリティで前線を押し上げる', 'ミッド周辺の強ポジを早めに取る'],
    defendPoints: ['エリアを広げすぎず守る', '寄りやすい形を意識する'],
    focusPoints: ['レーンの距離感', '人数差を作った後の詰め方'],
    mapPickRate: 35,
    memo: '連携が整っているチームほど守りでも攻めでも安定しやすいです。',
    trackerSlug: 'corrode',
    currentRotation: false,
    appMediaUrl: 'https://appmedia.jp/valorant/79061576',
    detailImage: '/valorant/corrode.webp',
  },
}

function toPercent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`
}

function DetailMapImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string
  alt: string
  className: string
  onClick: () => void
}) {
  return <img src={src} alt={alt} className={className} onClick={onClick} />
}

export default function ValorantMapGuidePage() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug.toLowerCase() : ''
  const map = valorantMapData[slug] ?? valorantMapData.haven

  const [topAgents, setTopAgents] = useState<MapAgent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    async function fetchAgents() {
      setLoadingAgents(true)

      try {
        const response = await fetch(
          `/api/valorant-map-agents?slug=${encodeURIComponent(map.trackerSlug)}`
        )
        const json = await response.json()

        if (!mounted) return

        if (Array.isArray(json?.items) && json.items.length > 0) {
          setTopAgents(json.items.slice(0, 3))
        } else {
          setTopAgents([])
        }
      } catch {
        if (!mounted) return
        setTopAgents([])
      } finally {
        if (mounted) {
          setLoadingAgents(false)
        }
      }
    }

    fetchAgents()

    return () => {
      mounted = false
    }
  }, [map.trackerSlug])

  const pageTitle = `${map.titleJa} / ${map.titleEn}`

  return (
    <div className="detailPage">
      <main className="detailPage__main">
        <section className="detailHero">
          <Link href="/" className="detailBackLink detailBackLink--light">
            ← 一覧ページへ戻る
          </Link>

          <p className="detailEyebrow detailEyebrow--light">{map.subtitle}</p>
          <h1 className="detailPageTitle">{pageTitle}</h1>
          <p className="detailPageLead">
            マップごとの基本方針と、現在の上位採用エージェントをまとめて確認できます。
          </p>

          <div className="detailHeroBadges">
            <span className="detailTopBadge">
              {map.currentRotation ? '現行ローテーション' : 'アーカイブ'}
            </span>
            <span className="detailTopBadge detailTopBadge--soft">{map.titleEn}</span>
          </div>
        </section>

        <section className="detailSection">
          <div className="detailTwoCol">
            <article className="detailCard detailCard--overview">
              <div className="detailSectionHeader">
                <p className="detailSectionSub">MAP OVERVIEW</p>
                <h2>マップ全体図</h2>
              </div>

              <div className="detailOverviewImageWrap">
                <DetailMapImage
                  src={map.detailImage}
                  alt={pageTitle}
                  className="detailOverviewImage"
                  onClick={() => setIsImageModalOpen(true)}
                />
                <button
                  type="button"
                  className="detailZoomHint"
                  onClick={() => setIsImageModalOpen(true)}
                >
                  クリックで拡大
                </button>
              </div>

              <div className="detailButtonRow">
                <a
                  href={map.appMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="externalGuideLink"
                >
                  外部ガイドを見る
                </a>
              </div>
            </article>

            <article className="detailCard">
              <div className="detailSectionHeader">
                <p className="detailSectionSub">1 MIN GUIDE</p>
                <h2>1分でわかる {map.titleJa}</h2>
              </div>
              <p className="detailSubLead">{map.overview}</p>

              <div className="detailMiniGrid detailMiniGrid--single">
                <article className="detailMiniPanel detailMiniPanel--light">
                  <h3>{map.attackLabel}</h3>
                  <ul>
                    {map.attackPoints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="detailMiniPanel detailMiniPanel--light">
                  <h3>{map.defendLabel}</h3>
                  <ul>
                    {map.defendPoints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="detailMiniPanel detailMiniPanel--light">
                  <h3>{map.focusLabel}</h3>
                  <ul>
                    {map.focusPoints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </article>
          </div>
        </section>

        <section className="detailSection">
          <article className="detailCard">
            <div className="detailSectionHeader">
              <p className="detailSectionSub">AGENT PICK RATE</p>
              <h2>エージェント採用率</h2>
              <p>現在の公開データから、上位3エージェントを表示しています。</p>
            </div>

            {loadingAgents ? (
              <div className="detailLoadingBox">エージェント採用率を確認しています。</div>
            ) : topAgents.length > 0 ? (
              <div className="agentRankList agentRankList--triple">
                {topAgents.map((agent, index) => (
                  <article key={agent.name} className="agentRankCard">
                    <div className="agentRankCard__top">
                      <div>
                        <p className="agentRankCard__rank">TOP {index + 1}</p>
                        <h3>{agent.name}</h3>
                      </div>
                      <span className="agentRoleBadge">{agent.role || 'Agent'}</span>
                    </div>

                    <div className="detailMetricRow">
                      <span>採用率</span>
                      <strong>{agent.pickRate}%</strong>
                    </div>
                    <div className="detailBar detailBar--gold">
                      <div
                        className="detailBarFill detailBarFill--gold"
                        style={{ width: toPercent(agent.pickRate) }}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="detailLoadingBox">現在このマップの採用率データを表示できません。</div>
            )}
          </article>
        </section>
      </main>

      {isImageModalOpen ? (
        <div
          className="detailImageModal"
          onClick={() => setIsImageModalOpen(false)}
          role="presentation"
        >
          <div
            className="detailImageModal__dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${pageTitle} 拡大画像`}
          >
            <button
              type="button"
              className="detailImageModal__close"
              onClick={() => setIsImageModalOpen(false)}
            >
              ×
            </button>

            <DetailMapImage
              src={map.detailImage}
              alt={pageTitle}
              className="detailImageModal__image"
              onClick={() => {}}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
