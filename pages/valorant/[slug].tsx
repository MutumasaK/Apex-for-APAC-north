import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'

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
    overview: '3サイト特有のローテ判断と情報管理が重要なマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      'フェイクで守備をずらしてから本命を通す',
      'サイト侵入前に情報取得を行う',
    ],
    defendPoints: [
      '人数配分を崩しすぎない',
      'A/C寄りの判断を早める',
    ],
    focusPoints: ['中盤の情報更新が重要', '浅側ローテを避ける'],
    mapPickRate: 49,
    memo: '現行ローテでも、3サイト構造の理解と守備のローテ判断があると対応しやすいマップです。',
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
    overview: '狭い導線と上下の取り合いが重要なマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      'ミッド確保からサイト圧を広げる',
      'スモークとフラッシュを重ねる',
    ],
    defendPoints: [
      'ミッド放棄を早めに決めない',
      'ヘブン側の維持を意識する',
    ],
    focusPoints: ['人数有利でも詰めすぎない', '縦ラインのケアを徹底する'],
    mapPickRate: 52,
    memo: 'ミッドを取れるかどうかで攻守ともに選択肢が大きく変わります。',
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
    overview: 'テレポーターを絡めた揺さぶりとセットアップが重要なマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      'テレポーターでローテをずらす',
      '設置後のラインを先に決める',
    ],
    defendPoints: [
      '片寄りすぎず情報を残す',
      'ショート/ロングの主導権を争う',
    ],
    focusPoints: ['サイト内ユーティリティ管理', '設置後のクロスを崩さない'],
    mapPickRate: 47,
    memo: '設置までの速度と設置後の形づくりをセットで考えると安定します。',
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
    overview: '広い射線とロングレンジの撃ち合いが多いマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '広い射線をユーティリティで区切る',
      'ミッドコントロールを軽視しない',
    ],
    defendPoints: [
      '無理な単独ピークを減らす',
      'サイト内の遅延を厚くする',
    ],
    focusPoints: ['ロングのクロス管理', '人数不利時の引き判断'],
    mapPickRate: 45,
    memo: 'ロングレンジでの不利交換を減らし、ユーティリティ先行で進めるのが重要です。',
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
    overview: '挟み込みの圧力と守備の対応速度が問われるマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '両側圧力で守備を分断する',
      'エリア確保後の再集合を早くする',
    ],
    defendPoints: [
      '押し引きの位置を固定しすぎない',
      '片側崩壊時のリテイク導線を確保する',
    ],
    focusPoints: ['孤立を作らない', '初動の情報共有を徹底する'],
    mapPickRate: 43,
    memo: '現行ローテでも、2人単位でのエリア管理が安定しやすいマップです。',
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
    overview: '回転ドアと3サイト構造による情報戦が重要なマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '音情報を使って守備を揺らす',
      'サイト切り替えを素早く行う',
    ],
    defendPoints: [
      'C/B間の情報共有を切らさない',
      '裏取りタイミングを合わせる',
    ],
    focusPoints: ['ドア開閉の情報管理', '寄り判断を早めすぎない'],
    mapPickRate: 44,
    memo: '回転の速さに振り回されないよう、守備の基準位置を明確にしておくと安定します。',
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
    overview: 'ロング主体のエリア争いとミッド管理の質が問われるマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      'ミッドからの圧力を継続する',
      'ロング設置後の形を先に作る',
    ],
    defendPoints: [
      '前寄り情報を取りすぎない',
      'リテイク導線を残して守る',
    ],
    focusPoints: ['ロングの人数差管理', 'A/Bの情報断絶を防ぐ'],
    mapPickRate: 41,
    memo: 'ロング射線の管理と設置後の耐久力が勝敗に直結しやすいマップです。',
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
    overview: '落下リスクと外周ルートの管理が特徴の個性が強いマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '外周からの圧力と本命進行を分けて使う',
      '不用意なピークで落下しない位置取りを徹底する',
    ],
    defendPoints: [
      '無理な前詰めより射線管理を優先する',
      '人数不利ではリテイク前提の配置に切り替える',
    ],
    focusPoints: ['落下リスクの共有', 'サイト内の孤立を作らない'],
    mapPickRate: 38,
    memo: '現行ローテ外でも、独特の落下リスクと広い展開力への理解があると対応しやすいマップです。',
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
    overview: '細い導線の圧迫感とエリア交換の速さが鍵になるマップ。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '先に使うユーティリティを整理して侵入速度を上げる',
      'ミッド周辺の主導権を取って守備を割る',
    ],
    defendPoints: [
      '狭所でのクロスを意識する',
      'エリアを渡す判断を早めて人数有利で取り返す',
    ],
    focusPoints: ['狭所の撃ち合い管理', '人数差を活かした再取得'],
    mapPickRate: 35,
    memo: '現行ローテ外でも、狭い導線と素早い情報交換への対応力を磨く教材として使いやすいマップです。',
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
  const [imageSrc, setImageSrc] = useState(src.endsWith('.webp') ? src : '')
  const [isReady, setIsReady] = useState(src.endsWith('.webp'))

  useEffect(() => {
    let active = true

    setImageSrc(src.endsWith('.webp') ? src : '')
    setIsReady(src.endsWith('.webp'))

    if (typeof window === 'undefined' || src.endsWith('.webp')) {
      return () => {
        active = false
      }
    }

    const image = new window.Image()
    image.decoding = 'async'
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight

        const context = canvas.getContext('2d')
        if (!context) return

        context.drawImage(image, 0, 0)
        const webpSrc = canvas.toDataURL('image/webp', 0.92)

        if (active && webpSrc.startsWith('data:image/webp')) {
          setImageSrc(webpSrc)
          setIsReady(true)
        }
      } catch {
        if (active) {
          setImageSrc(src)
          setIsReady(true)
        }
      }
    }

    image.onerror = () => {
      if (active) {
        setImageSrc(src)
        setIsReady(true)
      }
    }

    image.src = src

    return () => {
      active = false
    }
  }, [src])

  if (!isReady || !imageSrc) {
    return <div className="detailLoadingBox">画像を最適化しています...</div>
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={() => {
        setImageSrc(src)
        setIsReady(true)
      }}
    />
  )
}

export default function ValorantMapGuidePage() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
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
        if (!mounted) return
        setLoadingAgents(false)
      }
    }

    fetchAgents()

    return () => {
      mounted = false
    }
  }, [map.trackerSlug])

  const pageTitle = useMemo(
    () => `${map.titleJa} / ${map.titleEn}`,
    [map.titleJa, map.titleEn]
  )

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
            マップごとの攻略ポイントと採用傾向を、見やすいカード形式で整理しています。
          </p>

          <div className="detailHeroBadges">
            <span className="detailTopBadge">
              {map.currentRotation ? '現行コンペティティブ対象' : '個別マップアーカイブ'}
            </span>
            <span className="detailTopBadge detailTopBadge--soft">
              {map.titleEn}
            </span>
          </div>
        </section>

        <section className="detailSection">
          <div className="detailTwoCol">
            <article className="detailCard detailCard--overview">
              <div className="detailSectionHeader">
                <p className="detailSectionSub">MAP OVERVIEW</p>
                <h2>マップ概要</h2>
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
                  マップ攻略サイト
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
              <h2>エージェントの使用率</h2>
              <p>最新公開データを優先し、取得できない場合は補助データを表示します。</p>
            </div>

            {loadingAgents ? (
              <div className="detailLoadingBox">
                エージェント使用率を取得しています。
              </div>
            ) : topAgents.length > 0 ? (
              <div className="agentRankList agentRankList--triple">
                {topAgents.map((agent, index) => (
                  <article key={agent.name} className="agentRankCard">
                    <div className="agentRankCard__top">
                      <div>
                        <p className="agentRankCard__rank">TOP {index + 1}</p>
                        <h3>{agent.name}</h3>
                      </div>
                      <span className="agentRoleBadge">
                        {agent.role || 'Agent'}
                      </span>
                    </div>

                    <div className="detailMetricRow">
                      <span>使用率</span>
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
              <div className="detailLoadingBox">
                現在このマップの使用率データを表示できません。
              </div>
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
