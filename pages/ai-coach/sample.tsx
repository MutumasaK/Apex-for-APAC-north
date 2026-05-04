import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

const goodPoints = [
  '初動後に高所を先に押さえる意識がある',
  'ダメージ交換後に味方のカバー位置へ戻れている',
  '詰める判断自体は3人で揃っている',
]

const issues = [
  '射線を切る前にピーク時間が長くなっている',
  '漁夫確認のコールがファイト開始後に遅れている',
  '展開幅が広がり、1人目の被弾を即カバーしづらい',
]

const improvements = [
  '撃ち始める前に遮蔽物と退き先を全員で確認する',
  'ファイト前に「漁夫確認」「詰め役」「カバー役」を短く固定する',
  'ダウンを取った後も即確ではなく、周囲確認を1コール挟む',
]

const calls = [
  '「左高所だけ先に取る。撃つのは合図後」',
  '「一回止まって漁夫確認。右奥だけ見て」',
  '「ダウン取った。即確しない、周囲見てから詰める」',
]

const checklist = [
  'ファイト前に退き先を1つ決める',
  '詰める前に漁夫確認コールを入れる',
  '展開役とカバー役を毎回言葉にする',
]

export default function AiCoachSamplePage() {
  return (
    <>
      <SeoHead
        title="サンプル分析 | Apex AI Coach β版"
        description="オリンパスのファイトシーンを題材にしたApex AI Coach β版のサンプル分析です。"
        path="/ai-coach/sample"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">SAMPLE ANALYSIS</p>
            <h1>オリンパス ファイトシーン分析サンプル</h1>
            <p className="pageHero__lead">
              AI Coachが実際にどのような観点で分析するかの例です。
              ここでは画像と状況メモをもとに、総評、改善案、IGLコール例を整理しています。
            </p>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <h2>総評</h2>
                <p className="cardLead">
                  オリンパス特有の開けた射線で被弾リスクが高い場面です。
                  高所を先に取る判断は良い一方で、撃ち合い開始前の退き先共有と漁夫確認が不足しています。
                </p>
              </article>
              <article className="card aiNoticeCard">
                <h2>有料プランで見られる内容</h2>
                <p>
                  詳細な立ち位置レビュー、画像内の注目ポイント分解、チーム別のコール改善案はLiteプランで確認できます。
                </p>
                <Link href="/ai-coach/pricing" className="button button--primary">
                  続きはLiteプランで確認
                </Link>
              </article>
            </div>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <AnalysisCard title="良かった点" items={goodPoints} />
              <AnalysisCard title="問題点" items={issues} />
              <AnalysisCard title="改善案" items={improvements} />
              <AnalysisCard title="IGLコール例" items={calls} />
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">NEXT CHECKLIST</p>
                  <h2>次回チェックリスト</h2>
                </div>
              </div>
              <ul className="detailList">
                {checklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="aiCoachActions">
                <Link href="/contact" className="button button--primary">
                  β版に申し込む
                </Link>
                <Link href="/ai-coach" className="button button--secondary">
                  AI Coachへ戻る
                </Link>
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

function AnalysisCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="card">
      <h2>{title}</h2>
      <ul className="detailList">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  )
}
