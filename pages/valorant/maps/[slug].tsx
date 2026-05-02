import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'
import { getValorantMap } from '../../../lib/valorant'

type ValorantMapPageProps = {
  map: NonNullable<ReturnType<typeof getValorantMap>>
}

export default function ValorantMapPage({ map }: ValorantMapPageProps) {
  return (
    <>
      <SeoHead
        title={`${map.titleJa} / ${map.titleEn} | VALORANT マップガイド | Apex Dashboard`}
        description={`${map.titleJa} の攻め・守り・意識したい点をまとめた VALORANT マップガイドです。`}
        path={`/valorant/maps/${map.slug}`}
        image={map.cardImage}
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <Link href="/valorant/maps" className="inlineLink inlineLink--back">
              ← マップ一覧へ戻る
            </Link>
            <p className="eyebrow">{map.subtitle}</p>
            <h1>
              {map.titleJa} / {map.titleEn}
            </h1>
            <p className="pageHero__lead">{map.overview}</p>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <img src={map.detailImage} alt={map.titleJa} className="detailImage" />
              </article>

              <article className="card">
                <div className="detailStack">
                  <div className="softPanel">
                    <strong>{map.attackLabel}</strong>
                    <ul className="detailList">
                      {map.attackPoints.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="softPanel">
                    <strong>{map.defendLabel}</strong>
                    <ul className="detailList">
                      {map.defendPoints.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="softPanel">
                    <strong>{map.focusLabel}</strong>
                    <ul className="detailList">
                      {map.focusPoints.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">GUIDE NOTE</p>
                  <h2>攻略メモ</h2>
                </div>
                <a
                  href={map.appMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inlineLink"
                >
                  外部ガイド
                </a>
              </div>
              <p className="cardLead">{map.memo}</p>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<ValorantMapPageProps> = async (context) => {
  const slug = typeof context.params?.slug === 'string' ? context.params.slug : ''
  const map = getValorantMap(slug)

  if (!map) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      map,
    },
  }
}
