import { FormEvent, useState } from 'react'
import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

type SubmitState = {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message: string
  submissionId?: string
  reportId?: string
  feedbackUrl?: string
}

type ApiResponse = {
  ok?: boolean
  message?: string
  submission_id?: string
  report_id?: string
  feedback_url?: string
}

const rankOptions = ['Rookie-Bronze', 'Silver-Gold', 'Platinum', 'Diamond', 'Master', 'Predator', 'Mixed']
const sceneOptions = ['Fight review', 'Macro rotation', 'IGL call', 'End game', 'Scrim review', 'Ranked review']

function getFormText(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function validateForm(formData: FormData) {
  const requiredFields = [
    ['teamName', 'チーム名を入力してください。'],
    ['submitterName', '提出者名を入力してください。'],
    ['email', '連絡用メールアドレスを入力してください。'],
    ['rankTier', 'ランク帯を選択してください。'],
    ['mapName', 'マップ名を入力してください。'],
    ['teamComp', '使用構成を入力してください。'],
    ['sceneType', 'シーン種別を選択してください。'],
    ['focusPoints', '重点的に見てほしいポイントを入力してください。'],
    ['description', '補足説明を入力してください。'],
    ['timestamps', '分析対象のタイムスタンプを入力してください。'],
    ['videoUrl', '動画URLを入力してください。'],
  ] as const

  for (const [key, message] of requiredFields) {
    if (!getFormText(formData, key)) return message
  }

  const email = getFormText(formData, 'email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '連絡用メールアドレスを正しい形式で入力してください。'

  try {
    new URL(getFormText(formData, 'videoUrl'))
  } catch {
    return '動画URLを正しい形式で入力してください。'
  }

  return ''
}

function buildPayload(formData: FormData) {
  return {
    teamName: getFormText(formData, 'teamName'),
    submitterName: getFormText(formData, 'submitterName'),
    email: getFormText(formData, 'email'),
    discordId: getFormText(formData, 'discordId'),
    rankTier: getFormText(formData, 'rankTier'),
    mapName: getFormText(formData, 'mapName'),
    teamComp: getFormText(formData, 'teamComp'),
    sceneType: getFormText(formData, 'sceneType'),
    focusPoints: getFormText(formData, 'focusPoints'),
    description: getFormText(formData, 'description'),
    timestamps: getFormText(formData, 'timestamps'),
    videoUrl: getFormText(formData, 'videoUrl'),
    shareWithTeammates: formData.get('shareWithTeammates') === 'on',
  }
}

export default function AiCoachUploadPage() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle', message: '' })
  const isSubmitting = submitState.status === 'submitting'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const validationMessage = validateForm(formData)
    if (validationMessage) {
      setSubmitState({ status: 'error', message: validationMessage })
      return
    }

    setSubmitState({
      status: 'submitting',
      message: '提出内容を保存しています。完了まで画面を閉じずにお待ちください。',
    })

    try {
      const response = await fetch('/api/ai-coach/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(formData)),
      })
      const json = (await response.json().catch(() => ({}))) as ApiResponse

      if (!response.ok || !json.ok) {
        throw new Error(json.message || '提出を保存できませんでした。時間をおいてもう一度お試しください。')
      }

      form.reset()
      setSubmitState({
        status: 'success',
        message: json.message || '提出を受け付けました。',
        submissionId: json.submission_id,
        reportId: json.report_id,
        feedbackUrl: json.feedback_url,
      })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : '提出を保存できませんでした。時間をおいてもう一度お試しください。',
      })
    }
  }

  return (
    <>
      <SeoHead
        title="動画URL提出 | Apex AI Coach β版"
        description="Apex AI Coach β版のチーム動画URL提出フォームです。タイムスタンプを必須にして分析精度を高めます。"
        path="/ai-coach/upload"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH VIDEO SUBMISSION</p>
            <h1>チーム動画URLを提出する</h1>
            <p className="pageHero__lead">
              本番β版では、まずURL提出を安定運用します。動画ファイル提出はSupabase Storageへの直接アップロード方式へ移行後に再開します。
              分析したい場面のタイムスタンプは必須です。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              {submitState.status === 'success' ? (
                <div className="formSuccess">
                  <p className="eyebrow">SUBMITTED</p>
                  <h2>提出を受け付けました</h2>
                  <p>{submitState.message}</p>
                  <div className="submissionSummary">
                    <div>
                      <span>提出ID</span>
                      <strong>{submitState.submissionId}</strong>
                    </div>
                    <div>
                      <span>レポートID</span>
                      <strong>{submitState.reportId}</strong>
                    </div>
                    {submitState.feedbackUrl ? (
                      <div>
                        <span>フィードバックページ</span>
                        <Link href={submitState.feedbackUrl}>{submitState.feedbackUrl}</Link>
                      </div>
                    ) : null}
                  </div>
                  <div className="formActions">
                    {submitState.feedbackUrl ? (
                      <Link href={submitState.feedbackUrl} className="button button--primary">
                        フィードバックページへ
                      </Link>
                    ) : null}
                    <button type="button" className="button button--ghost" onClick={() => setSubmitState({ status: 'idle', message: '' })}>
                      追加で提出する
                    </button>
                  </div>
                </div>
              ) : (
                <form className="contactForm aiCoachUploadForm" onSubmit={handleSubmit}>
                  <div className="formGrid">
                    <label className="fieldLabel">
                      チーム名
                      <input className="textInput" name="teamName" required />
                    </label>
                    <label className="fieldLabel">
                      提出者名
                      <input className="textInput" name="submitterName" required />
                    </label>
                    <label className="fieldLabel">
                      メールアドレス
                      <input className="textInput" name="email" type="email" required />
                    </label>
                    <label className="fieldLabel">
                      Discord ID（任意）
                      <input className="textInput" name="discordId" placeholder="name#0000 / user_id" />
                      <span className="fieldHint">分析完了通知をDiscordで受け取りたい場合はDiscord IDを入力してください。</span>
                    </label>
                    <label className="fieldLabel">
                      ランク帯
                      <select className="textInput" name="rankTier" required defaultValue="">
                        <option value="" disabled>選択してください</option>
                        {rankOptions.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
                      </select>
                    </label>
                    <label className="fieldLabel">
                      マップ
                      <input className="textInput" name="mapName" required placeholder="World's Edge / Storm Point など" />
                    </label>
                    <label className="fieldLabel">
                      使用構成
                      <input className="textInput" name="teamComp" required placeholder="例: Bangalore / Catalyst / Crypto" />
                    </label>
                    <label className="fieldLabel">
                      シーン種別
                      <select className="textInput" name="sceneType" required defaultValue="">
                        <option value="" disabled>選択してください</option>
                        {sceneOptions.map((scene) => <option key={scene} value={scene}>{scene}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="fieldLabel">
                    重点的に見てほしいポイント
                    <input className="textInput" name="focusPoints" required placeholder="例: 初動判断、ファイト前のコール、終盤ポジション" />
                  </label>

                  <label className="fieldLabel">
                    補足説明
                    <textarea className="textArea" name="description" rows={5} required placeholder="試合状況、困っていること、特に見てほしい判断を書いてください。" />
                  </label>

                  <label className="fieldLabel">
                    分析対象タイムスタンプ
                    <input className="textInput" name="timestamps" required placeholder="例: 12:30-13:05, 1:02:10-1:03:20" />
                    <span className="fieldHint">動画URLの中で分析してほしい場面を指定してください。</span>
                  </label>

                  <label className="fieldLabel">
                    動画URL
                    <input className="textInput" name="videoUrl" type="url" required placeholder="https://youtube.com/... など" />
                  </label>

                  <div className="softPanel">
                    <strong>ファイル提出について</strong>
                    <span>Vercelのリクエストサイズ制限を避けるため、ファイル提出は一時停止しています。Storage直接アップロード方式へ移行後に再開します。</span>
                  </div>

                  <div className="aiCoachConsentBox">
                    <label className="checkboxField checkboxField--inline">
                      <input name="shareWithTeammates" type="checkbox" defaultChecked />
                      <span>チームメイトへの共有を許可する</span>
                    </label>
                    <ul className="detailList">
                      <li>フィードバック本文はメールやDiscord本文には載せず、共有URLのページに表示します。</li>
                      <li>メールアドレスは必須です。入金確認、決済完了、領収書、プラン変更、解約など重要なお知らせはメールに送ります。</li>
                      <li>動画URLは分析と運営確認のために保存されます。第三者に公開されるものではありません。</li>
                    </ul>
                  </div>

                  {submitState.message ? (
                    <p className={`formMessage formMessage--${submitState.status === 'error' ? 'error' : 'success'}`}>
                      {submitState.message}
                    </p>
                  ) : null}

                  <button type="submit" className="button button--primary" disabled={isSubmitting}>
                    {isSubmitting ? '送信中...' : '動画URLを提出する'}
                  </button>
                </form>
              )}
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
