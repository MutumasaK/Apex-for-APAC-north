import Link from 'next/link'
import SeoHead from '../components/SeoHead'
import SiteLayout from '../components/SiteLayout'
import { AI_COACH_NOTES, AI_COACH_PLANS } from '../lib/ai-coach-plans'

const capabilities = [
  'ファイト分析',
  'マクロ分析',
  'IGLコール改善',
  '反省会テンプレート化',
  '次回までの改善アクション整理',
]

const scenes = [
  'スクリム後の短時間レビュー',
  'ランクで起きた負けパターンの整理',
  'チーム内で判断基準を揃えるミーティング',
]

const outputs = [
  '総評',
  '良かった点と問題点',
  'マクロ改善案',
  'IGLコール例',
  '次回チェックリスト',
]

export default function AiCoachPage() {
  return (
    <>
      <SeoHead
        title="Apex AI Coach β版 | Apex Dashboard"
        description="ファイト・マクロ判断・IGLコールを整理するApex AI Coach β版の紹介ページです。"
        path="/ai-coach"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">APEX AI COACH BETA</p>
            <h1>Apex AI Coach β版</h1>
            <p className="pageHero__lead">
              ファイトシーン・マクロ判断・IGLコールをAIが整理。
              反省を感覚で終わらせず、次の試合でやることまで落とし込みます。
            </p>
            <div className="heroActionRow">
              <Link href="/ai-coach/sample-analysis" className="button button--primary">
                サンプル分析を見る
              </Link>
              <Link href="/ai-coach/upload" className="button button--secondary">
                動画を提出する
              </Link>
              <Link href="/contact" className="button button--ghost">
                β版に申し込む
              </Link>
            </div>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">WHAT IT DOES</p>
                    <h2>できること</h2>
                  </div>
                </div>
                <div className="linkList">
                  {capabilities.map((item) => (
                    <div key={item} className="listLink listLink--static">
                      <strong>{item}</strong>
                      <span>β版では1つのGPTでFree / Lite / Playerを案内します。</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">USE CASE</p>
                    <h2>利用シーン</h2>
                  </div>
                </div>
                <div className="linkList">
                  {scenes.map((item) => (
                    <div key={item} className="listLink listLink--static">
                      <strong>{item}</strong>
                      <span>ファイト・マクロ・コールを、次の試合で直す項目に変換します。</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">OUTPUT</p>
                  <h2>出力される分析内容</h2>
                </div>
              </div>
              <div className="featureGrid">
                {outputs.map((item) => (
                  <div key={item} className="softPanel">
                    <strong>{item}</strong>
                    <span>β版では1つのGPTで、状況メモや画像から整理します。</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">BETA PLANS</p>
                  <h2>料金表</h2>
                </div>
                <Link href="/ai-coach/pricing" className="inlineLink">
                  料金を詳しく見る
                </Link>
              </div>
              <div className="pricingGrid">
                {AI_COACH_PLANS.map((plan) => (
                  <article key={plan.name} className="pricingCard pricingCard--inner">
                    <p className="sectionHeader__sub">{plan.name}</p>
                    <h3>{plan.price}<span>{plan.priceSuffix}</span></h3>
                    <p>{plan.purpose}</p>
                    <ul className="detailList">
                      {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                    </ul>
                    <Link href={plan.href} className="button button--primary">{plan.cta}</Link>
                  </article>
                ))}
              </div>
            </article>
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
              <h2>サンプル分析から試す</h2>
              <p>オリンパスのファイトシーンを題材に、総評・改善案・IGLコール例を確認できます。</p>
              <div className="aiCoachActions">
                <Link href="/ai-coach/sample-analysis" className="button button--primary">
                  サンプル分析を見る
                </Link>
                <Link href="/contact" className="button button--secondary">
                  β版に申し込む
                </Link>
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
