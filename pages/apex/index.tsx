import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { APEX_GUIDE_MAPS } from '../../lib/apex'

export default function ApexHubPage() {
  return (
    <>
      <SeoHead
        title="Apex 情報ハブ | Apex Dashboard"
        description="Apex のランクマップ、レジェンドピック率、最新ニュースへ移動できるハブページです。"
        path="/apex"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">APEX HUB</p>
            <h1>Apex の情報をひとまとめに。</h1>
            <p className="pageHero__lead">
              ランクマップ、レジェンドピック率、ニュース、マップ別ガイドへすぐ移動できます。
            </p>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">RANK MAP</p>
                    <h2>本日のランクマップ</h2>
                  </div>
                  <Link href="/apex/rank-map" className="inlineLink">
                    詳細へ
                  </Link>
                </div>
                <p className="cardLead">現在のランクマップと、主要マップごとの攻略ページを確認できます。</p>
              </article>

              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">PICK RATE</p>
                    <h2>高pick率のレジェンド</h2>
                  </div>
                  <Link href="/apex/legends-pick-rate" className="inlineLink">
                    詳細へ
                  </Link>
                </div>
                <p className="cardLead">現在のメタを把握しやすいように、レジェンド採用率を一覧表示しています。</p>
              </article>
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">MAP GUIDES</p>
                  <h2>マップ別ガイド</h2>
                </div>
                <Link href="/apex/news" className="inlineLink">
                  最新情報へ
                </Link>
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
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
