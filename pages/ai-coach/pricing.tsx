import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { AI_COACH_NOTES, AI_COACH_PLANS } from '../../lib/ai-coach-plans'

export default function AiCoachPricingPage() {
  return (
    <>
      <SeoHead
        title="料金表 | Apex AI Coach β版"
        description="Apex AI Coach β版のFree、Lite、Playerプラン比較ページです。"
        path="/ai-coach/pricing"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">BETA PRICING</p>
            <h1>Apex AI Coach β版 料金表</h1>
            <p className="pageHero__lead">
              Freeで価値を確認し、Liteで月3回、Playerで月10回の分析を試せます。
              β版ではGPTリンクへの誘導で提供し、厳密な回数制御は正式版で実装予定です。
            </p>
          </section>

          <section className="pageSection">
            <div className="pricingGrid">
              {AI_COACH_PLANS.map((plan) => (
                <article key={plan.name} className="card pricingCard">
                  <p className="sectionHeader__sub">{plan.name}</p>
                  <h2>{plan.price}<span>{plan.priceSuffix}</span></h2>
                  <p>{plan.purpose}</p>
                  <ul className="detailList">
                    {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                  <Link href={plan.href} className="button button--primary">{plan.cta}</Link>
                </article>
              ))}
            </div>
          </section>

          <section className="pageSection">
            <article className="card aiNoticeCard">
              <h2>AI分析を使う際の注意点</h2>
              <p><strong>AI Coachは答えを決めるものではなく、チームの振り返りを整理するための補助ツールです。</strong></p>
              <ul className="detailList">
                {AI_COACH_NOTES.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </article>
          </section>

          <section className="pageSection">
            <article className="card ctaCard">
              <h2>β版に申し込む</h2>
              <p>希望プランと主な悩みを送ると、利用案内を確認できます。</p>
              <Link href="/contact" className="button button--primary">
                申し込みフォームへ
              </Link>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
