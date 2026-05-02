import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { getApexGuideMap } from '../../lib/apex'

type ApexMapPageProps = {
  map: NonNullable<ReturnType<typeof getApexGuideMap>>
}

export default function ApexMapPage({ map }: ApexMapPageProps) {
  return (
    <>
      <SeoHead
        title={`${map.title} | Apex マップガイド | Apex Dashboard`}
        description={`${map.shortTitle} の立ち回りポイントを簡潔に確認できる Apex マップガイドです。`}
        path={`/apex/${map.slug}`}
        image={map.image}
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <Link href="/apex/rank-map" className="inlineLink inlineLink--back">
              ← ランクマップ一覧へ戻る
            </Link>
            <p className="eyebrow">APEX MAP GUIDE</p>
            <h1>{map.title}</h1>
            <p className="pageHero__lead">{map.overview}</p>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardGrid cardGrid--two">
                <div>
                  <img src={map.image} alt={map.shortTitle} className="detailImage" />
                </div>

                <div className="softPanel">
                  <strong>立ち回りポイント</strong>
                  <ul className="detailList">
                    {map.points.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<ApexMapPageProps> = async (context) => {
  const slug = typeof context.params?.slug === 'string' ? context.params.slug : ''
  const map = getApexGuideMap(slug)

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
