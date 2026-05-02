import Link from 'next/link'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'
import { VALORANT_MAPS } from '../../../lib/valorant'

function ValorantMapCard({ map, archive = false }: { map: (typeof VALORANT_MAPS)[number]; archive?: boolean }) {
  return (
    <article className={`valorantMapCard${archive ? ' valorantMapCard--archive' : ''}`}>
      <Link href={`/valorant/maps/${map.slug}`} className="valorantMapLink">
        <div className="valorantMapThumb">
          <img src={map.cardImage} alt={map.titleEn} className="valorantMapImage" />
          <div className="valorantMapOverlay">
            <span>{archive ? 'ARCHIVE MAP' : 'CURRENT MAP'}</span>
            <strong>{map.titleEn}</strong>
          </div>
        </div>
        <div className="valorantMapMeta">
          <p className="mapName">{map.titleEn}</p>
          <span className="mapGuideLink">マップ攻略</span>
        </div>
      </Link>
    </article>
  )
}

export default function ValorantMapsPage() {
  const currentMaps = VALORANT_MAPS.filter((item) => item.currentRotation)
  const archiveMaps = VALORANT_MAPS.filter((item) => !item.currentRotation)

  return (
    <>
      <SeoHead
        title="VALORANT マップ一覧 | Apex Dashboard"
        description="VALORANTの現行シーズンマップとアーカイブマップを一覧で確認できます。各マップ攻略ページへ移動できます。"
        path="/valorant/maps"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">VALORANT MAPS</p>
            <h1>VALORANT マップローテーション</h1>
            <p className="pageHero__lead">
              現行ローテーションとアーカイブを分けて、各マップ攻略ページへ移動しやすくしています。
            </p>
          </section>

          <section className="pageSection">
            <div className="sectionHeader">
              <p className="sectionHeader__sub">CURRENT ROTATION</p>
              <h2>現行シーズンのマップ</h2>
            </div>
            <div className="mapGrid">
              {currentMaps.map((map) => (
                <ValorantMapCard key={map.slug} map={map} />
              ))}
            </div>
          </section>

          <section className="pageSection">
            <div className="sectionHeader">
              <p className="sectionHeader__sub">ARCHIVE</p>
              <h2>アーカイブマップ</h2>
            </div>
            <div className="mapGrid">
              {archiveMaps.map((map) => (
                <ValorantMapCard key={map.slug} map={map} archive />
              ))}
            </div>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
