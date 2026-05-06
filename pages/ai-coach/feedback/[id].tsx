import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'

type FeedbackData = {
  submission?: Record<string, string>
  report?: Record<string, string | string[]> | null
}

const reportSections = [
  ['総評', 'summary'],
  ['良かった点', 'good_points'],
  ['課題', 'problems'],
  ['改善案', 'improvements'],
  ['IGLコール', 'igl_calls'],
  ['次回チェックリスト', 'next_checklist'],
  ['チームアクション項目', 'team_action_items'],
  ['コーチメモ', 'coach_notes'],
] as const

function TextBlock({ value }: { value?: string | string[] }) {
  if (Array.isArray(value)) {
    if (!value.length) return <p className="emptyText">未入力です。</p>
    return <div className="feedbackText">{value.map((item) => <p key={item}>{item}</p>)}</div>
  }

  if (!value) return <p className="emptyText">未入力です。</p>

  return (
    <div className="feedbackText">
      {value.split('\n').map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  )
}

export default function AiCoachFeedbackPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const [data, setData] = useState<FeedbackData>({})
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!id) return

    let mounted = true

    async function loadFeedback() {
      try {
        const response = await fetch(`/api/ai-coach-feedback/${encodeURIComponent(id)}`)
        const json = await response.json().catch(() => ({}))

        if (!response.ok || !json.ok) {
          throw new Error(json.error || 'not_found')
        }

        if (mounted) {
          setData({ submission: json.submission, report: json.report })
          setStatus('ready')
        }
      } catch {
        if (mounted) setStatus('error')
      }
    }

    loadFeedback()

    return () => {
      mounted = false
    }
  }, [id])

  const submission = data.submission
  const report = data.report

  return (
    <>
      <SeoHead
        title="AI Coach フィードバック | Apex Dashboard"
        description="提出内容に対するAI Coachフィードバックを確認できます。動画ファイルや公開URLは表示しません。"
        path={id ? `/ai-coach/feedback/${id}` : '/ai-coach/feedback'}
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH FEEDBACK</p>
            <h1>フィードバックレポート</h1>
            <p className="pageHero__lead">
              提出内容に対するフィードバックを表示します。動画ファイルや公開URLはこのページには表示されません。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              {status === 'loading' ? <p className="formMessage">フィードバックを読み込んでいます。</p> : null}

              {status === 'error' ? (
                <div className="formSuccess">
                  <h2>レポートが見つかりません</h2>
                  <p>URLまたは提出IDを確認してください。</p>
                  <Link href="/ai-coach/upload" className="button button--primary">
                    動画提出へ
                  </Link>
                </div>
              ) : null}

              {status === 'ready' && submission ? (
                <>
                  <div className="cardHeader">
                    <div>
                      <p className="sectionHeader__sub">SUBMISSION</p>
                      <h2>{submission.team_name || '提出チーム'}</h2>
                    </div>
                    <span className="statusPill">{report ? '公開済み' : '作成中'}</span>
                  </div>

                  <div className="teamHeroCard">
                    <div>
                      <p className="teamHeroCard__label">提出ID</p>
                      <strong>{submission.id}</strong>
                    </div>
                    <div>
                      <p className="teamHeroCard__label">マップ</p>
                      <strong>{submission.map_name || '-'}</strong>
                    </div>
                    <div>
                      <p className="teamHeroCard__label">シーン</p>
                      <strong>{submission.scene_type || '-'}</strong>
                    </div>
                  </div>

                  {!report ? (
                    <div className="softPanel">
                      <strong>現在フィードバック作成中です</strong>
                      <span>運営が提出内容を確認しています。レポート完成後、このページに内容が表示されます。</span>
                    </div>
                  ) : (
                    <>
                      <div className="submissionSummary">
                        <div>
                          <span>カテゴリ</span>
                          <strong>{String(report.category || '-')}</strong>
                        </div>
                        <div>
                          <span>優先度</span>
                          <strong>{String(report.priority || '-')}</strong>
                        </div>
                        <div>
                          <span>課題タグ</span>
                          <strong>{Array.isArray(report.issue_tags) ? report.issue_tags.join(', ') : String(report.issue_tags || '-')}</strong>
                        </div>
                      </div>

                      <div className="feedbackReportGrid">
                        {reportSections.map(([label, key]) => (
                          <section key={key} className="feedbackReportSection">
                            <p className="sectionHeader__sub">{label}</p>
                            <TextBlock value={report[key]} />
                          </section>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
