import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { VALORANT_MAPS } from '../../lib/valorant'

export default function ValorantHubPage() {
  const currentMaps = VALORANT_MAPS.filter((item) => item.currentRotation).slice(0, 6)

  return (
    <>
      <SeoHead
        title="VALORANT 情報ハブ | Apex Dashboard"
        description="VALORANTのマップローテーション、マップ攻略、最新ニュースへ移動できる情報ハブです。"
        path="/valorant"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">VALORANT HUB</p>
            <h1>VALORANTの主要情報をまとめて確認。</h1>
            <p className="pageHero__lead">
              現行シーズンのマップローテーションとニュース導線を、見やすいカードUIにまとめています。
            </p>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">MAP ROTATION</p>
                    <h2>現行シーズンのマップローテーション</h2>
                  </div>
                  <Link href="/valorant/maps" className="inlineLink">
                    詳細を見る
                  </Link>
                </div>
                <p className="cardLead">現行マップとアーカイブを分けて、各マップ攻略ページに移動できます。</p>
              </article>

              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">LATEST NEWS</p>
                    <h2>VALORANTの最新情報</h2>
                  </div>
                  <Link href="/valorant/news" className="inlineLink">
                    詳細を見る
                  </Link>
                </div>
                <p className="cardLead">公式ニュースやパッチ情報を確認できます。</p>
              </article>
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">CURRENT MAPS</p>
                  <h2>現行マップ</h2>
                </div>
              </div>
              <div className="mapGrid">
                {currentMaps.map((map) => (
                  <article key={map.slug} className="valorantMapCard">
                    <Link href={`/valorant/maps/${map.slug}`} className="valorantMapLink">
                      <div className="valorantMapThumb">
                        <img src={map.cardImage} alt={map.titleEn} className="valorantMapImage" />
                        <div className="valorantMapOverlay">
                          <span>VALORANT MAP</span>
                          <strong>{map.titleEn}</strong>
                        </div>
                      </div>
                      <div className="valorantMapMeta">
                        <p className="mapName">{map.titleEn}</p>
                        <span className="mapGuideLink">マップ攻略</span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
