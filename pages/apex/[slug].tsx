import Link from 'next/link'
import { useRouter } from 'next/router'

type ApexMapData = {
  title: string
  image: string
  subtitle: string
  overview: string
  attackLabel: string
  defendLabel: string
  focusLabel: string
  attackPoints: string[]
  defendPoints: string[]
  focusPoints: string[]
  legends: {
    name: string
    tier: string
    winRate: number
    pickRate: number
  }[]
  memo: string
}

const apexMapData: Record<string, ApexMapData> = {
  'storm-point': {
    title: 'ストームポイント / Storm Point',
    image: '/maps/storm-point.jpg',
    subtitle: 'APEX MAP DETAIL',
    overview: '広い移動距離と遮蔽の薄い区間が特徴で、先入りとルート管理の精度が勝率に直結しやすいマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '先入りできる安置候補を早めに決める',
      '長引く戦闘は避けて漁夫リスクを減らす',
    ],
    defendPoints: [
      '高所と遮蔽の両立を意識する',
      '後退ルートを残しながら撃ち合う',
    ],
    focusPoints: [
      '安置外入りを最小限に抑える',
      '移動開始を遅らせない',
    ],
    legends: [
      { name: 'Bangalore', tier: 'Tier S', winRate: 51.2, pickRate: 16.4 },
      { name: 'Pathfinder', tier: 'Tier A', winRate: 49.8, pickRate: 13.9 },
      { name: 'Bloodhound', tier: 'Tier A', winRate: 50.1, pickRate: 14.7 },
      { name: 'Wraith', tier: 'Tier S', winRate: 50.6, pickRate: 18.5 },
    ],
    memo: '移動の遅れが順位に直結しやすいため、戦闘判断より先にルート設計を固めておくと安定しやすいです。',
  },
  olympus: {
    title: 'オリンパス / Olympus',
    image: '/maps/olympus.jpg',
    subtitle: 'APEX MAP DETAIL',
    overview: '見通しの良いエリアが多く、射線管理と高低差の使い方で差が出やすいマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '広場に出る前に次の遮蔽を決める',
      '有利ポジから短時間で人数差を作る',
    ],
    defendPoints: [
      '横射線を受けない位置取りを優先する',
      '不利なら即離脱できる形を保つ',
    ],
    focusPoints: [
      '漁夫が来る前に戦闘を終わらせる',
      '高所を取れるなら最優先で確保する',
    ],
    legends: [
      { name: 'Bangalore', tier: 'Tier S', winRate: 50.8, pickRate: 15.2 },
      { name: 'Wraith', tier: 'Tier S', winRate: 50.2, pickRate: 17.1 },
      { name: 'Horizon', tier: 'Tier A', winRate: 49.9, pickRate: 14.3 },
      { name: 'Pathfinder', tier: 'Tier A', winRate: 49.7, pickRate: 12.8 },
    ],
    memo: '射線が通りやすいため、撃ち合いの強さだけでなく遮蔽をつなぐ移動意識が重要です。',
  },
  'worlds-edge': {
    title: "ワールズエッジ / World's Edge",
    image: '/maps/worlds-edge.jpg',
    subtitle: 'APEX MAP DETAIL',
    overview: '建物戦と高所管理の比重が高く、漁夫対策と終盤ポジションの優先順位が重要なマップです。',
    attackLabel: '攻め',
    defendLabel: '守り',
    focusLabel: '意識したい点',
    attackPoints: [
      '高所と遮蔽を先に取る',
      '長引く戦闘を避ける',
    ],
    defendPoints: [
      '引く判断を早める',
      '射線を増やしすぎない',
    ],
    focusPoints: [
      '安置先入りを優先する',
      '漁夫警戒を切らさない',
    ],
    legends: [
      { name: 'Bangalore', tier: 'Tier S', winRate: 51.2, pickRate: 16.4 },
      { name: 'Wraith', tier: 'Tier S', winRate: 50.6, pickRate: 18.5 },
      { name: 'Pathfinder', tier: 'Tier A', winRate: 49.8, pickRate: 13.9 },
      { name: 'Bloodhound', tier: 'Tier A', winRate: 50.1, pickRate: 14.7 },
    ],
    memo: '建物周辺の攻防が多いため、展開しすぎずに複数射線を受けない形を維持すると安定します。',
  },
}

function clampRate(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`
}

export default function ApexMapGuidePage() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const map = apexMapData[slug] ?? apexMapData['worlds-edge']

  return (
    <div className="detailShell detailShell--dark">
      <main className="detailMain">
        <section className="detailHeroCard">
          <Link href="/" className="detailBackLink">
            ← 一覧ページへ戻る
          </Link>

          <p className="detailEyebrow">{map.subtitle}</p>
          <h1 className="detailTitle">{map.title}</h1>
          <p className="detailLead">
            マップごとの攻略・勝率・ピック率・メタ・パッチ影響を1ページに集約しています。
          </p>
        </section>

        <section className="detailGuideCard detailGuideCard--gradient">
          <p className="detailEyebrow">1 MIN GUIDE</p>
          <h2 className="detailSectionTitle">1分でわかる {map.title.split(' / ')[0]}</h2>
          <p className="detailSubLead">{map.overview}</p>

          <div className="detailMiniGrid">
            <article className="detailMiniPanel">
              <h3>{map.attackLabel}</h3>
              <ul>
                {map.attackPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="detailMiniPanel">
              <h3>{map.defendLabel}</h3>
              <ul>
                {map.defendPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="detailMiniPanel">
              <h3>{map.focusLabel}</h3>
              <ul>
                {map.focusPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="detailGridTwo">
          <article className="detailCard">
            <div className="detailSectionHeader">
              <h2>レジェンド別勝率</h2>
              <p>このマップでの勝率 / ピック率 / ティア</p>
            </div>

            <div className="detailStatList">
              {map.legends.map((legend) => (
                <div key={legend.name} className="detailStatItem">
                  <div className="detailStatTopRow">
                    <strong>{legend.name}</strong>
                    <span className="detailTierBadge">{legend.tier}</span>
                  </div>

                  <div className="detailMetricRow">
                    <span>勝率</span>
                    <strong>{legend.winRate}%</strong>
                  </div>
                  <div className="detailBar">
                    <div
                      className="detailBarFill detailBarFill--cyan"
                      style={{ width: clampRate(legend.winRate) }}
                    />
                  </div>

                  <div className="detailMetricRow detailMetricRow--compact">
                    <span>ピック率</span>
                    <strong>{legend.pickRate}%</strong>
                  </div>
                  <div className="detailBar">
                    <div
                      className="detailBarFill detailBarFill--pink"
                      style={{ width: clampRate(legend.pickRate) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="detailCard detailCard--visual">
            <img src={map.image} alt={map.title} className="detailVisual" />
            <div className="detailVisualMeta">
              <div className="detailSectionHeader">
                <h2>マップ概要</h2>
                <p>現在のローテーションに合わせた攻略メモ</p>
              </div>
              <p className="detailParagraph">{map.memo}</p>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}