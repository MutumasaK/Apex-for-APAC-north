import Link from 'next/link'
import SeoHead from '../components/SeoHead'
import SiteLayout from '../components/SiteLayout'

const plans = [
  {
    name: 'Free',
    price: '¥0 / 月',
    description: '月1本まで簡易分析',
    features: ['AI Coachのモック体験', '簡易チェックリスト', '個人利用向け'],
  },
  {
    name: 'Player',
    price: '¥980 / 月',
    description: '個人向け詳細分析',
    features: ['詳細なファイト分析', 'ダウン原因の整理', '改善チェックリスト'],
  },
  {
    name: 'Team',
    price: '¥2,980 / 月',
    description: 'チーム向け複数メンバー分析',
    features: ['複数メンバーの振り返り', 'IGLコール提案', 'チーム課題の整理'],
  },
]

export default function PricingPage() {
  return (
    <>
      <SeoHead
        title="料金プラン | Apex Dashboard"
        description="AI CoachのFree、Player、Teamプランを確認できます。現時点では決済処理はモックです。"
        path="/pricing"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">PRICING</p>
            <h1>AI Coachの料金プラン</h1>
            <p className="pageHero__lead">
              現時点では決済処理はモックです。将来的なサブスク導線として、完成形に近い見た目で整理しています。
            </p>
          </section>

          <section className="pageSection">
            <div className="pricingGrid">
              {plans.map((plan) => (
                <article key={plan.name} className="card pricingCard">
                  <p className="sectionHeader__sub">{plan.name}</p>
                  <h2>{plan.price}</h2>
                  <p className="cardLead">{plan.description}</p>
                  <ul className="detailList">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link href="/contact" className="button button--primary">
                    相談する
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
