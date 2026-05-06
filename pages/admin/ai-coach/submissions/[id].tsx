import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import SeoHead from '../../../../components/SeoHead'
import SiteLayout from '../../../../components/SiteLayout'

type Submission = Record<string, string | number | string[] | undefined>

type Feedback = {
  summary: string
  good_points: string
  problems: string
  improvements: string
  igl_calls: string
  next_checklist: string
  coach_notes: string
  category: string
  issue_tags: string
  priority: string
  team_action_items: string
  visibility: string
}

type VideoNotes = {
  target_timestamps: string
  ai_video_notes: string
  admin_video_memo: string
}

const ADMIN_TOKEN_STORAGE_KEY = 'aiCoachAdminToken'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const emptyFeedback: Feedback = {
  summary: '',
  good_points: '',
  problems: '',
  improvements: '',
  igl_calls: '',
  next_checklist: '',
  coach_notes: '',
  category: '',
  issue_tags: '',
  priority: '',
  team_action_items: '',
  visibility: 'customer',
}

const emptyVideoNotes: VideoNotes = {
  target_timestamps: '',
  ai_video_notes: '',
  admin_video_memo: '',
}

function valueText(value: unknown) {
  if (Array.isArray(value)) return value.join(', ')
  return String(value ?? '').trim()
}

function displayValue(value: unknown) {
  return valueText(value) || '-'
}

function reportValue(report: Record<string, unknown>, key: string) {
  const value = report[key]
  if (Array.isArray(value)) return value.join(', ')
  return valueText(value)
}

function buildGptsPrompt(submission: Submission) {
  const isUrlSubmission = valueText(submission.submission_type) === 'url'
  const caution = isUrlSubmission
    ? `【注意】
この提出はURL提出です。
動画本体は自動解析していません。
動画全体ではなく、上記タイムスタンプ周辺を主な分析対象として扱ってください。
ユーザー説明文、分析対象タイムスタンプ、管理者メモをもとに分析してください。`
    : `【注意】
この提出はアップロード動画です。
必要に応じてAI動画確認メモと管理者メモを参考にしてください。
映像から確認できない内容は断定せず、推測として扱ってください。`

  return `あなたはApex Legends専門のAIコーチです。
以下の提出内容をもとに、競技目線でフィードバックレポートを作成してください。

【提出ID】
${displayValue(submission.id)}

【チーム名】
${displayValue(submission.team_name)}

【ランク帯】
${displayValue(submission.rank_tier)}

【マップ】
${displayValue(submission.map_name)}

【使用構成】
${displayValue(submission.team_comp)}

【シーン種別】
${displayValue(submission.scene_type)}

【重点的に見てほしいポイント】
${displayValue(submission.focus_points)}

【補足説明】
${displayValue(submission.description)}

【分析対象タイムスタンプ】
${valueText(submission.target_timestamps) || '指定なし'}

【AI動画確認メモ】
${valueText(submission.ai_video_notes) || 'AIメモは未生成です。'}

【管理者メモ / タイムスタンプ補足】
${valueText(submission.admin_video_memo) || '管理者が動画を確認したうえで、重要な状況をここに追記してください。'}

${caution}

【出力形式】
1. 総評
2. 良かった点
3. 問題点
4. 改善案
5. IGLコール例
6. 次回チェックリスト
7. チームとして次回やること
8. 注意事項

【ルール】
・映像から確認できないことは断定せず「推測」と書く
・次の試合で実行できる内容にする
・チームメンバーを責める表現は避ける
・競技目線だが、チーム練度に合わせた現実的な提案にする
・AI分析は1つの視点であり、絶対的な正解ではないことを明記する`
}

export default function AdminAiCoachSubmissionDetailPage() {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const isValidSubmissionId = !id || UUID_PATTERN.test(id)
  const [adminToken, setAdminToken] = useState('')
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(emptyFeedback)
  const [videoNotes, setVideoNotes] = useState<VideoNotes>(emptyVideoNotes)
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false)
  const [feedbackLoadFailed, setFeedbackLoadFailed] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isUrlSubmission = valueText(submission?.submission_type) === 'url'
  const isFileSubmission = valueText(submission?.submission_type) === 'file'
  const gptsPrompt = useMemo(() => (submission ? buildGptsPrompt(submission) : ''), [submission])
  const customerUrl = id ? `/ai-coach/feedback/${id}` : ''

  useEffect(() => {
    setAdminToken(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '')
  }, [])

  useEffect(() => {
    if (!id || !adminToken || !isValidSubmissionId) return
    loadSubmission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, adminToken, isValidSubmissionId])

  async function loadSubmission(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!id) return

    if (!isValidSubmissionId) {
      setMessage('正しい提出IDでアクセスしてください')
      return
    }

    setLoading(true)
    setMessage('提出詳細を読み込んでいます。')

    try {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken)
      const response = await fetch(`/api/admin/ai-coach/submissions/${encodeURIComponent(id)}`, {
        headers: { 'x-ai-coach-admin-token': adminToken },
      })
      const json = await response.json().catch(() => ({}))

      if (!response.ok || !json.ok) {
        throw new Error('submission_load_failed')
      }

      setSubmission(json.submission)
      setVideoNotes({
        target_timestamps: valueText(json.submission?.target_timestamps),
        ai_video_notes: valueText(json.submission?.ai_video_notes),
        admin_video_memo: valueText(json.submission?.admin_video_memo),
      })
      setFeedbackLoadFailed(Boolean(json.feedbackLoadFailed))

      if (json.report) {
        setHasSavedFeedback(true)
        setFeedback({
          summary: reportValue(json.report, 'summary'),
          good_points: reportValue(json.report, 'good_points'),
          problems: reportValue(json.report, 'problems'),
          improvements: reportValue(json.report, 'improvements'),
          igl_calls: reportValue(json.report, 'igl_calls'),
          next_checklist: reportValue(json.report, 'next_checklist'),
          coach_notes: reportValue(json.report, 'coach_notes'),
          category: reportValue(json.report, 'category'),
          issue_tags: reportValue(json.report, 'issue_tags'),
          priority: reportValue(json.report, 'priority'),
          team_action_items: reportValue(json.report, 'team_action_items'),
          visibility: reportValue(json.report, 'visibility') || 'customer',
        })
      } else {
        setHasSavedFeedback(false)
        setFeedback(emptyFeedback)
      }

      setMessage('提出詳細を読み込みました。')
    } catch (error) {
      console.error('admin submission detail page load failed', error)
      setMessage('提出詳細の読み込みに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  function openVideoUrl() {
    const videoUrl = valueText(submission?.video_url)
    if (!videoUrl) {
      setMessage('動画URLが保存されていません。')
      return
    }
    window.open(videoUrl, '_blank', 'noopener,noreferrer')
  }

  async function openSignedVideo() {
    if (!id || !isValidSubmissionId) return
    setMessage('動画確認用URLを発行しています。')

    try {
      const response = await fetch(`/api/admin/ai-coach/submissions/${encodeURIComponent(id)}/signed-url`, {
        method: 'POST',
        headers: { 'x-ai-coach-admin-token': adminToken },
      })
      const json = await response.json().catch(() => ({}))

      if (!response.ok || !json.ok || !json.signedUrl) {
        throw new Error('signed_url_failed')
      }

      window.open(json.signedUrl, '_blank', 'noopener,noreferrer')
      setMessage('動画確認用URLを発行しました。')
    } catch (error) {
      console.error('signed video open failed', error)
      setMessage('動画確認用URLの発行に失敗しました。時間をおいて再度お試しください。')
    }
  }

  function generateAiVideoNotesPlaceholder() {
    setVideoNotes((current) => ({
      ...current,
      ai_video_notes:
        current.ai_video_notes ||
        'AIメモ生成の実装待ちです。現時点では管理者が動画確認メモを追記してください。',
    }))
    setMessage('AIメモ欄に下書きを追加しました。')
  }

  async function saveVideoNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !isValidSubmissionId) return

    if (isUrlSubmission && !videoNotes.target_timestamps.trim()) {
      setMessage('URL提出の場合は、分析してほしい時間帯 / タイムスタンプを入力してください。')
      return
    }

    setLoading(true)
    setMessage('動画メモを保存しています。')

    try {
      const response = await fetch(`/api/admin/ai-coach/submissions/${encodeURIComponent(id)}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-coach-admin-token': adminToken,
        },
        body: JSON.stringify(videoNotes),
      })
      const json = await response.json().catch(() => ({}))

      if (!response.ok || !json.ok) {
        throw new Error('video_notes_save_failed')
      }

      setMessage('動画メモを保存しました。')
      await loadSubmission()
    } catch (error) {
      console.error('video notes save failed', error)
      setMessage('動画メモの保存に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(gptsPrompt)
    setMessage('コピーしました')
  }

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !isValidSubmissionId) return

    setLoading(true)
    setMessage('フィードバックを保存しています。')

    try {
      const response = await fetch('/api/admin/ai-coach/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-coach-admin-token': adminToken,
        },
        body: JSON.stringify({
          submissionId: id,
          ...feedback,
          issueTags: feedback.issue_tags,
          status: 'published',
        }),
      })
      const json = await response.json().catch(() => ({}))

      if (!response.ok || !json.ok) {
        throw new Error('feedback_save_failed')
      }

      setHasSavedFeedback(true)
      setMessage('フィードバックを保存しました。顧客向けページに反映されています。')
      await loadSubmission()
    } catch (error) {
      console.error('feedback save failed', error)
      setMessage('フィードバックの保存に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  function updateFeedback(key: keyof Feedback, value: string) {
    setFeedback((current) => ({ ...current, [key]: value }))
  }

  function updateVideoNotes(key: keyof VideoNotes, value: string) {
    setVideoNotes((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <SeoHead
        title="AI Coach 提出詳細 | Apex Dashboard"
        description="AI Coachの提出詳細確認とフィードバック保存を行います。"
        path={id ? `/admin/ai-coach/submissions/${id}` : '/admin/ai-coach/submissions'}
      />

      <SiteLayout footerCta={false}>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">ADMIN / AI COACH</p>
            <h1>提出詳細</h1>
            <p className="pageHero__lead">提出内容を確認し、GPTsで作成したフィードバックを顧客向けに保存します。</p>
          </section>

          <section className="pageSection">
            <article className="card">
              {!isValidSubmissionId ? <p className="formMessage formMessage--error">正しい提出IDでアクセスしてください</p> : null}
              <form className="adminTokenForm" onSubmit={loadSubmission}>
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
                <button className="button button--primary" disabled={loading || !isValidSubmissionId} type="submit">
                  詳細を読み込む
                </button>
              </form>
              {message ? <p className="formMessage">{message}</p> : null}
            </article>
          </section>

          {submission ? (
            <>
              <section className="pageSection">
                <article className="card">
                  <div className="cardHeader">
                    <div>
                      <p className="sectionHeader__sub">SUBMISSION</p>
                      <h2>{displayValue(submission.team_name)}</h2>
                    </div>
                    <Link href={customerUrl} className="inlineLink" target="_blank">
                      顧客向けページ
                    </Link>
                  </div>

                  <div className="submissionSummary">
                    <div><span>提出ID</span><strong>{displayValue(submission.id)}</strong></div>
                    <div><span>提出者</span><strong>{displayValue(submission.user_name)}</strong></div>
                    <div><span>提出方法</span><strong>{displayValue(submission.submission_type)}</strong></div>
                    <div><span>ランク帯</span><strong>{displayValue(submission.rank_tier)}</strong></div>
                    <div><span>マップ</span><strong>{displayValue(submission.map_name)}</strong></div>
                    <div><span>使用構成</span><strong>{displayValue(submission.team_comp)}</strong></div>
                    <div><span>シーン種別</span><strong>{displayValue(submission.scene_type)}</strong></div>
                    <div><span>分析対象タイムスタンプ</span><strong>{displayValue(submission.target_timestamps)}</strong></div>
                  </div>

                  <p className="cardLead">{displayValue(submission.description)}</p>

                  {isUrlSubmission ? (
                    <div className="softPanel">
                      <strong>動画URL</strong>
                      <span>{displayValue(submission.video_url)}</span>
                      <strong>分析対象タイムスタンプ</strong>
                      <span>{displayValue(submission.target_timestamps)}</span>
                      <div className="formActions">
                        <button type="button" className="button button--primary" onClick={openVideoUrl}>
                          動画URLを開く
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="softPanel">
                      <strong>動画パス</strong>
                      <span>{displayValue(submission.video_path)}</span>
                      <div className="formActions">
                        <button type="button" className="button button--primary" onClick={openSignedVideo}>
                          動画を確認
                        </button>
                        <button type="button" className="button button--secondary" onClick={generateAiVideoNotesPlaceholder}>
                          AIメモを生成
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              </section>

              <section className="pageSection">
                <article className="card">
                  <div className="cardHeader">
                    <div>
                      <p className="sectionHeader__sub">VIDEO NOTES</p>
                      <h2>動画確認メモ</h2>
                    </div>
                  </div>

                  <form className="contactForm feedbackAdminForm" onSubmit={saveVideoNotes}>
                    <label className="fieldLabel">
                      分析対象タイムスタンプ
                      <textarea
                        className="textArea"
                        rows={3}
                        value={videoNotes.target_timestamps}
                        onChange={(event) => updateVideoNotes('target_timestamps', event.target.value)}
                        required={isUrlSubmission}
                      />
                    </label>

                    {isFileSubmission ? (
                      <label className="fieldLabel">
                        AI動画確認メモ
                        <textarea
                          className="textArea"
                          rows={6}
                          value={videoNotes.ai_video_notes}
                          onChange={(event) => updateVideoNotes('ai_video_notes', event.target.value)}
                        />
                      </label>
                    ) : null}

                    <label className="fieldLabel">
                      管理者メモ / タイムスタンプ補足
                      <textarea
                        className="textArea"
                        rows={6}
                        value={videoNotes.admin_video_memo}
                        onChange={(event) => updateVideoNotes('admin_video_memo', event.target.value)}
                        placeholder="12:30〜13:05&#10;第2リング、漁夫に行こうとしたが返り討ちにあった。"
                      />
                    </label>

                    <button className="button button--primary" type="submit" disabled={loading}>
                      動画メモを保存
                    </button>
                  </form>
                </article>
              </section>

              <section className="pageSection">
                <article className="card">
                  <div className="cardHeader">
                    <div>
                      <p className="sectionHeader__sub">GPTS PROMPT</p>
                      <h2>GPTs用プロンプト</h2>
                    </div>
                  </div>
                  <div className="formActions">
                    <button type="button" className="button button--secondary" onClick={copyPrompt}>
                      GPTs用プロンプトをコピー
                    </button>
                  </div>
                  <textarea className="textArea" rows={12} readOnly value={gptsPrompt} />
                </article>
              </section>

              <section className="pageSection">
                <article className="card">
                  <div className="cardHeader">
                    <div>
                      <p className="sectionHeader__sub">FEEDBACK</p>
                      <h2>フィードバック保存</h2>
                    </div>
                  </div>

                  {!hasSavedFeedback ? (
                    <p className="formMessage">
                      {feedbackLoadFailed
                        ? 'フィードバックはまだ保存されていません。必要なカラムが未適用の場合はSQLを適用してから保存してください。'
                        : 'フィードバックはまだ保存されていません。'}
                    </p>
                  ) : null}

                  <form className="contactForm feedbackAdminForm" onSubmit={saveFeedback}>
                    {([
                      ['summary', 'summary', 4],
                      ['good_points', 'good_points', 4],
                      ['problems', 'problems', 4],
                      ['improvements', 'improvements', 4],
                      ['igl_calls', 'igl_calls', 4],
                      ['next_checklist', 'next_checklist', 4],
                      ['coach_notes', 'coach_notes', 4],
                      ['team_action_items', 'team_action_items', 4],
                    ] as const).map(([key, label, rows]) => (
                      <label className="fieldLabel" key={key}>
                        {label}
                        <textarea
                          className="textArea"
                          rows={rows}
                          value={feedback[key]}
                          onChange={(event) => updateFeedback(key, event.target.value)}
                          required={key === 'summary'}
                        />
                      </label>
                    ))}

                    <div className="formGrid">
                      <label className="fieldLabel">
                        category
                        <input className="textInput" value={feedback.category} onChange={(event) => updateFeedback('category', event.target.value)} />
                      </label>
                      <label className="fieldLabel">
                        issue_tags
                        <input className="textInput" value={feedback.issue_tags} onChange={(event) => updateFeedback('issue_tags', event.target.value)} />
                      </label>
                      <label className="fieldLabel">
                        priority
                        <input className="textInput" value={feedback.priority} onChange={(event) => updateFeedback('priority', event.target.value)} />
                      </label>
                      <label className="fieldLabel">
                        visibility
                        <input className="textInput" value={feedback.visibility} onChange={(event) => updateFeedback('visibility', event.target.value)} />
                      </label>
                    </div>

                    <button className="button button--primary" type="submit" disabled={loading}>
                      フィードバックを保存
                    </button>
                  </form>

                  {hasSavedFeedback ? (
                    <p className="formMessage">
                      顧客向けURL: <Link href={customerUrl}>{customerUrl}</Link>
                    </p>
                  ) : null}
                </article>
              </section>
            </>
          ) : null}
        </main>
      </SiteLayout>
    </>
  )
}
