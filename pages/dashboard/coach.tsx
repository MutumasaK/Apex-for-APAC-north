import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

const mockFindings = [
  {
    label: 'ファイト開始前',
    text: '先に遮蔽物を確保してからピークする判断が必要です。',
  },
  {
    label: '射線管理',
    text: '正面と右奥の2射線を同時に受けているため、展開前に片側を切るべきです。',
  },
  {
    label: 'IGLコール',
    text: '「右を切って左フォーカス、ノック後に即カバー」と短く共有します。',
  },
]

export default function CoachDashboardPage() {
  return (
    <>
      <SeoHead
        title="AI Coach Dashboard Mock | Apex Dashboard"
        description="AI Coachの分析ダッシュボードのモック画面です。現時点では分析処理は実行されません。"
        path="/dashboard/coach"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH DASHBOARD</p>
            <h1>レビュー結果のモック画面</h1>
            <p className="pageHero__lead">
              実際のAI分析と決済処理は未接続です。完成時の利用イメージを確認できます。
            </p>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">UPLOAD</p>
                    <h2>分析対象</h2>
                  </div>
                </div>
                <div className="softPanel">
                  <strong>clip_round3_fight.mp4</strong>
                  <p>モックファイルです。アップロード処理はまだ実行されません。</p>
                </div>
              </article>

              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">RESULT</p>
                    <h2>分析サマリー</h2>
                  </div>
                </div>
                <div className="detailStack">
                  {mockFindings.map((finding) => (
                    <div key={finding.label} className="softPanel">
                      <strong>{finding.label}</strong>
                      <p>{finding.text}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">NEXT STEP</p>
                  <h2>次の試合で使える改善チェックリスト</h2>
                </div>
              </div>
              <ul className="detailList">
                <li>ファイト前に退路と遮蔽物を一言で共有する</li>
                <li>フォーカス対象を決めてから展開する</li>
                <li>ノック後のカバー担当を先に決める</li>
              </ul>
              <Link href="/pricing" className="button button--primary">
                プランを見る
              </Link>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
