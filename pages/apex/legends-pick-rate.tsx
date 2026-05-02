import type { GetServerSideProps } from 'next'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { fetchApexLegendPickRates } from '../../lib/apex'

type ApexLegendPickRatePageProps = {
  legendRates: Awaited<ReturnType<typeof fetchApexLegendPickRates>>
}

export default function ApexLegendPickRatePage({ legendRates }: ApexLegendPickRatePageProps) {
  return (
    <>
      <SeoHead
        title="Apex レジェンドピック率 | Apex Dashboard"
        description="Apex Legends のレジェンドピック率を上位順で確認できる SEO 向けページです。"
        path="/apex/legends-pick-rate"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">LEGEND PICK RATE</p>
            <h1>Apex Legends のレジェンドピック率。</h1>
            <p className="pageHero__lead">
              現在の公開データをベースに、採用率の高いレジェンドを上位順で見やすく整理しています。
            </p>
          </section>

          <section className="pageSection">
            <div className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">CURRENT META</p>
                  <h2>レジェンド採用率ランキング</h2>
                </div>
                <span className="mutedText">{legendRates.updatedAtLabel}</span>
              </div>

              <div className="metricList metricList--stack">
                {legendRates.items.map((legend) => (
                  <article key={legend.name} className="metricCard metricCard--wide">
                    <div className="metricCard__top">
                      <span>TOP {legend.rank}</span>
                      <strong>{legend.name}</strong>
                    </div>
                    <div className="metricCard__bar">
                      <div
                        className="metricCard__barFill"
                        style={{ width: `${Math.min(legend.pickRate, 100)}%` }}
                      />
                    </div>
                    <p>{legend.pickRateLabel}</p>
                  </article>
                ))}
              </div>

              {legendRates.note ? <p className="cardNote">{legendRates.note}</p> : null}
            </div>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<ApexLegendPickRatePageProps> = async () => {
  return {
    props: {
      legendRates: await fetchApexLegendPickRates(),
    },
  }
}
