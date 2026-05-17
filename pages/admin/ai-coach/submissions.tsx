import { FormEvent, useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import Link from 'next/link'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'

type Submission = {
  id: string
  team_name?: string
  plan_name?: string
  user_name?: string
  map_name?: string
  team_comp?: string
  status?: string
  submission_type?: string
  created_at?: string
}

const ADMIN_TOKEN_STORAGE_KEY = 'aiCoachAdminToken'

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function AdminAiCoachSubmissionsPage() {
  const [adminToken, setAdminToken] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAdminToken(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '')
  }, [])

  async function loadSubmissions(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setLoading(true)
    setMessage('提出一覧を読み込んでいます。')

    try {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken)
      const response = await fetch('/api/admin/ai-coach/submissions', {
        headers: { 'x-ai-coach-admin-token': adminToken },
      })
      const json = await response.json().catch(() => ({}))

      if (!response.ok || !json.ok) {
        throw new Error(json.error || '提出一覧の読み込みに失敗しました。')
      }

      setSubmissions(json.submissions || [])
      setSelectedIds([])
      setMessage('提出一覧を読み込みました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '提出一覧の読み込みに失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SeoHead
        title="AI Coach 提出一覧 | Apex Dashboard"
        description="AI Coach の提出動画とフィードバック作成状況を管理します。"
        path="/admin/ai-coach/submissions"
      />

      <SiteLayout footerCta={false}>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">ADMIN / AI COACH</p>
            <h1>提出一覧</h1>
            <p className="pageHero__lead">
              GPTsで分析する提出内容を確認し、詳細ページからフィードバックを保存します。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              <form className="adminTokenForm" onSubmit={loadSubmissions}>
                <label className="fieldLabel">
                  管理トークン
                  <input
                    className="textInput"
                    type="password"
                    value={adminToken}
                    onChange={(event) => setAdminToken(event.target.value)}
                    placeholder="AI_COACH_ADMIN_TOKEN"
                    required
                  />
                </label>
                <button className="button button--primary" disabled={loading} type="submit">
                  一覧を読み込む
                </button>
              </form>
              {message ? <p className="formMessage">{message}</p> : null}
            </article>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">SUBMISSIONS</p>
                  <h2>提出内容</h2>
                </div>
              </div>

              <div className="linkList">
                {submissions.length ? (
                  submissions.map((submission) => {
                    const checked = selectedIds.includes(submission.id)
                    return (
                      <div key={submission.id} className="listRow">
                        <label className="rowCheckbox">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedIds((current) =>
                                current.includes(submission.id) ? current.filter((s) => s !== submission.id) : [...current, submission.id]
                              )
                            }}
                          />
                        </label>
                        <div className="listContent">
                          <strong>{submission.team_name || '-'}</strong>
                          <span>
                            プラン: {submission.plan_name || 'Free'} / 提出者: {submission.user_name || '-'} / 方法: {submission.submission_type || '-'} / マップ:{' '}
                            {submission.map_name || '-'} / 構成: {submission.team_comp || '-'} / 状態:{' '}
                            {submission.status || 'submitted'} / {formatDate(submission.created_at)}
                          </span>
                          <span className="smallText">{`顧客URL: /ai-coach/feedback/${submission.id}`}</span>
                        </div>
                        <div className="listActions">
                          <Link href={`/admin/ai-coach/submissions/${submission.id}`} className="button button--ghost">
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="emptyText">まだ提出一覧が読み込まれていません。</p>
                )}
              </div>
              <div className="formActions" style={{ marginTop: 12 }}>
                <button
                  className="button button--primary"
                  disabled={!selectedIds.length || loading}
                  onClick={async () => {
                    if (!selectedIds.length) return
                    if (!confirm(`選択した ${selectedIds.length} 件にテストメールを送信します。よろしいですか？`)) return
                    setLoading(true)
                    setMessage('一括送信実行中...')
                    try {
                      const response = await fetch('/api/admin/send-test-emails', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-ai-coach-admin-token': adminToken,
                        },
                        body: JSON.stringify({ submissionIds: selectedIds }),
                      })
                      const json = await response.json().catch(() => ({}))
                      if (!response.ok || !json.ok) throw new Error(json.error || 'bulk_send_failed')
                      setMessage('一括送信が完了しました。Mailtrap を確認してください。')
                      setSelectedIds([])
                    } catch (err) {
                      console.error('bulk send failed', err)
                      setMessage('一括送信に失敗しました。')
                    } finally {
                      setLoading(false)
                    }
                  }}
                >
                  選択した提出に一括テスト送信
                </button>
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const cookies = context.req.headers.cookie || ''
  const token = cookies
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('aiCoachAdminToken='))
    ?.split('=')[1]

  if (!token || token !== process.env.AI_COACH_ADMIN_TOKEN) {
    return {
      redirect: {
        destination: '/admin/ai-coach/login',
        permanent: false,
      },
    }
  }

  return { props: {} }
}
