import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { APEX_GUIDE_MAPS, fetchCurrentRankMap } from '../../lib/apex'

type ApexRankMapPageProps = {
  rankMap: Awaited<ReturnType<typeof fetchCurrentRankMap>>
}

export default function ApexRankMapPage({ rankMap }: ApexRankMapPageProps) {
  return (
    <>
      <SeoHead
        title="Apex ランクマップ最新情報 | Apex Dashboard"
        description="Apex Legends の現在のランクマップと、主要マップごとの攻略ガイドを一覧で確認できます。"
        path="/apex/rank-map"
        image={rankMap.ok && rankMap.image ? rankMap.image : '/hero.jpg'}
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">APEX RANK MAP</p>
            <h1>現在のランクマップと、主要マップごとの攻略ガイド。</h1>
            <p className="pageHero__lead">
              ランクマッチのローテーション確認と、各マップの立ち回りポイントをひとつのページにまとめています。
            </p>
          </section>

          <section className="pageSection">
            <div className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">CURRENT MAP</p>
                  <h2>現在のランクマップ</h2>
                </div>
              </div>

              {rankMap.ok ? (
                <div className="featureMapCard featureMapCard--wide">
                  <img src={rankMap.image} alt={rankMap.name} className="featureMapCard__image" />
                  <div>
                    <p className="featureMapCard__eyebrow">Apex Legends Ranked</p>
                    <strong>{rankMap.name}</strong>
                    <p>{rankMap.updatedAtLabel}</p>
                  </div>
                </div>
              ) : (
                <div className="softPanel">
                  <strong>現在のランクマップを確認中です。</strong>
                  <p>{rankMap.message}</p>
                </div>
              )}
            </div>
          </section>

          <section className="pageSection">
            <div className="sectionHeader">
              <p className="sectionHeader__sub">MAP GUIDES</p>
              <h2>マップ別攻略ページ</h2>
            </div>

            <div className="mapGrid">
              {APEX_GUIDE_MAPS.map((map) => (
                <Link key={map.slug} href={`/apex/${map.slug}`} className="mapCard">
                  <img src={map.image} alt={map.shortTitle} className="mapCard__image" />
                  <div className="mapCard__body">
                    <p className="mapCard__eyebrow">{map.shortTitle}</p>
                    <strong>{map.title}</strong>
                    <span>{map.overview}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<ApexRankMapPageProps> = async () => {
  return {
    props: {
      rankMap: await fetchCurrentRankMap(),
    },
  }
}
