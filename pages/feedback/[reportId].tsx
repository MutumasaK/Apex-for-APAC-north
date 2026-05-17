import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import type { AiCoachFeedbackPayload } from '../../types/ai-coach'

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error'

const sectionKeys = [
  ['総評', 'summary'],
  ['良かった点', 'good_points'],
  ['問題点', 'problems'],
  ['改善案', 'improvements'],
  ['IGLコール例', 'igl_call_examples'],
  ['チーム傾向', 'team_trends'],
] as const

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function Checklist({ value }: { value: unknown }) {
  const items = Array.isArray(value) ? value.map(String).filter(Boolean) : []
  if (!items.length) return <p className="emptyText">分析完了後に表示されます。</p>
  return (
    <ul className="feedbackChecklist">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function FeedbackText({ value }: { value: unknown }) {
  const text = textValue(value)
  if (!text) return <p className="emptyText">分析完了後に表示されます。</p>
  return (
    <div className="feedbackText">
      {text.split('\n').map((line, index) => (
        <p key={`${line}-${index}`}>{line}</p>
      ))}
    </div>
  )
}

export default function FeedbackReportPage() {
  const router = useRouter()
  const reportId = typeof router.query.reportId === 'string' ? router.query.reportId : ''
  const shareToken = typeof router.query.shareToken === 'string' ? router.query.shareToken : ''
  const [state, setState] = useState<LoadState>('loading')
  const [payload, setPayload] = useState<AiCoachFeedbackPayload | null>(null)
  const [copyState, setCopyState] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    if (!reportId || !shareToken) {
      setState('forbidden')
      return
    }

    let mounted = true
    async function load() {
      setState('loading')
      try {
        const response = await fetch(`/api/ai-coach/feedback/${encodeURIComponent(reportId)}?shareToken=${encodeURIComponent(shareToken)}`)
        const json = await response.json().catch(() => ({}))
        if (!response.ok || !json.ok) {
          if (mounted) setState(response.status === 403 ? 'forbidden' : 'error')
          return
        }
        if (mounted) {
          setPayload(json.data)
          setState('ready')
        }
      } catch {
        if (mounted) setState('error')
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [router.isReady, reportId, shareToken])

  const teamName = useMemo(() => {
    if (!payload) return 'Apex AI Coach'
    return textValue(payload.team.name) || textValue(payload.team.team_name) || '未設定チーム'
  }, [payload])

  const isPending = payload?.report.report_status !== 'completed'
  const isFailed = payload?.report.report_status === 'failed'
  const isPlanLimited = payload?.report.report_status === 'plan_limit_reached'

  async function copyShareUrl() {
    if (!payload?.shareUrl) return
    try {
      await navigator.clipboard.writeText(payload.shareUrl)
      setCopyState('共有URLをコピーしました。')
    } catch {
      setCopyState('URLを選択してコピーしてください。')
    }
  }

  return (
    <>
      <SeoHead
        title={`${teamName} フィードバック | Apex AI Coach`}
        description="Apex AI Coachのチーム共有用フィードバックページです。"
        path={reportId ? `/feedback/${reportId}` : '/feedback'}
      />

      <SiteLayout>
        <main className="pageMain feedbackPage">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH FEEDBACK</p>
            <h1>{teamName}</h1>
            <p className="pageHero__lead">
              このページはチーム内共有用です。第三者への共有は控えてください。
            </p>
          </section>

          <section className="pageSection">
            <article className="card feedbackShell">
              {state === 'loading' ? <p className="formMessage">分析結果を読み込んでいます。</p> : null}

              {state === 'forbidden' ? (
                <div className="softPanel">
                  <strong>このフィードバックは表示できません。</strong>
                  <span>共有URLが正しいか確認してください。</span>
                </div>
              ) : null}

              {state === 'error' ? (
                <div className="softPanel">
                  <strong>分析結果を読み込めませんでした。</strong>
                  <span>時間をおいて再度お試しください。</span>
                </div>
              ) : null}

              {state === 'ready' && payload ? (
                <>
                  <div className="cardHeader">
                    <div>
                      <p className="sectionHeader__sub">REPORT</p>
                      <h2>
                        {isPlanLimited
                          ? '今月の分析上限に達しました'
                          : isFailed
                            ? '分析結果を確認中です'
                            : isPending
                              ? '分析結果を作成中です'
                              : '分析レポート'}
                      </h2>
                    </div>
                    <span className="statusPill">
                      {isPlanLimited ? '上限到達' : isFailed ? '確認中' : isPending ? '作成中' : '完了'}
                    </span>
                  </div>

                  <div className="feedbackMetaGrid">
                    <div><span>提出者</span><strong>{textValue(payload.submission.submitter_name) || '-'}</strong></div>
                    <div><span>ランク帯</span><strong>{textValue(payload.submission.rank_tier) || '-'}</strong></div>
                    <div><span>マップ</span><strong>{textValue(payload.submission.map_name) || '-'}</strong></div>
                    <div><span>使用構成</span><strong>{textValue(payload.submission.team_comp) || '-'}</strong></div>
                    <div><span>シーン種別</span><strong>{textValue(payload.submission.scene_type) || '-'}</strong></div>
                    <div><span>分析対象タイムスタンプ</span><strong>{textValue(payload.submission.timestamps) || '-'}</strong></div>
                  </div>

                  {isPlanLimited ? (
                    <div className="softPanel">
                      <strong>今月の分析上限に達しました。</strong>
                      <span>提出内容は保存済みです。プラン変更または翌月の分析枠更新後に、管理者側で分析を再開できます。</span>
                    </div>
                  ) : isFailed ? (
                    <div className="softPanel">
                      <strong>分析結果を確認中です。</strong>
                      <span>提出内容は保存済みです。管理者側で確認後、この共有URLでフィードバックを確認できます。</span>
                    </div>
                  ) : isPending ? (
                    <div className="softPanel">
                      <strong>分析結果を作成中です。</strong>
                      <span>提出内容は保存済みです。完了後、この共有URLでフィードバックを確認できます。</span>
                    </div>
                  ) : (
                    <>
                      <div className="feedbackReportGrid">
                        {sectionKeys.map(([label, key]) => (
                          <section key={key} className="feedbackReportSection">
                            <p className="sectionHeader__sub">{label}</p>
                            <FeedbackText value={payload.report[key]} />
                          </section>
                        ))}
                        <section className="feedbackReportSection">
                          <p className="sectionHeader__sub">次回チェックリスト</p>
                          <Checklist value={payload.report.checklist} />
                        </section>
                      </div>
                    </>
                  )}

                  <div className="sharePanel">
                    <div>
                      <p className="sectionHeader__sub">SHARE URL</p>
                      <strong>{payload.shareUrl}</strong>
                      {copyState ? <span>{copyState}</span> : null}
                    </div>
                    <button type="button" className="button button--primary" onClick={copyShareUrl}>
                      共有URLをコピー
                    </button>
                  </div>
                </>
              ) : null}
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
