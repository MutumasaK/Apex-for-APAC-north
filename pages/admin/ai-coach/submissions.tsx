import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'

type Submission = {
  id: string
  team_name?: string
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
                  submissions.map((submission) => (
                    <Link
                      key={submission.id}
                      href={`/admin/ai-coach/submissions/${submission.id}`}
                      className="listLink"
                    >
                      <strong>{submission.team_name || '-'}</strong>
                      <span>
                        提出者: {submission.user_name || '-'} / 方法: {submission.submission_type || '-'} / マップ:{' '}
                        {submission.map_name || '-'} / 構成: {submission.team_comp || '-'} / 状態:{' '}
                        {submission.status || 'submitted'} / {formatDate(submission.created_at)}
                      </span>
                      <span className="button button--ghost">詳細を見る</span>
                    </Link>
                  ))
                ) : (
                  <p className="emptyText">まだ提出一覧が読み込まれていません。</p>
                )}
              </div>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
