import Link from 'next/link'
import SeoHead from '../components/SeoHead'
import SiteLayout from '../components/SiteLayout'

const analysisItems = [
  'ファイト開始前の判断',
  'ポジション取り',
  '射線管理',
  'カバータイミング',
  'ダウン原因',
  'その瞬間に言うべきIGLコール',
  '次の試合で使える改善チェックリスト',
]

export default function AiCoachPage() {
  return (
    <>
      <SeoHead
        title="AI COACH | Apex Dashboard"
        description="ファイトシーンをAIが競技目線で分析するAI Coachの紹介ページです。現時点では分析と決済はモックです。"
        path="/ai-coach"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH</p>
            <h1>ファイトシーンを、AIが競技目線で分析。</h1>
            <p className="pageHero__lead">
              レビュー動画やクリップをもとに、判断、ポジション、射線、カバー、IGLコールまで整理する想定のサブスク機能です。
            </p>
            <div className="heroActionRow">
              <Link href="/pricing" className="button button--primary">
                料金プランを見る
              </Link>
              <Link href="/dashboard/coach" className="button button--ghost">
                モック画面を開く
              </Link>
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">ANALYSIS</p>
                  <h2>分析項目</h2>
                </div>
              </div>

              <div className="featureGrid">
                {analysisItems.map((item) => (
                  <div key={item} className="softPanel">
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
