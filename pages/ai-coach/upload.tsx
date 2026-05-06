import { FormEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

type SubmitState = {
  status: 'idle' | 'submitting' | 'success' | 'error'
  message: string
  submissionId?: string
  feedbackUrl?: string
}

const rankOptions = ['Rookie-Bronze', 'Silver-Gold', 'Platinum', 'Diamond', 'Master', 'Predator', 'Mixed']
const sceneOptions = ['Fight review', 'Macro rotation', 'IGL call', 'End game', 'Scrim review', 'Ranked review']

export default function AiCoachUploadPage() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle', message: '' })
  const [submissionMode, setSubmissionMode] = useState<'file' | 'url'>('file')
  const isSubmitting = submitState.status === 'submitting'
  const acceptedVideoTypes = useMemo(() => 'video/mp4,video/webm,video/quicktime,video/x-matroska', [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    // 提出方法に応じた検証
    if (submissionMode === 'url') {
      const videoUrl = formData.get('videoUrl') as string
      const targetTimestamps = String(formData.get('targetTimestamps') || '').trim()
      if (!videoUrl) {
        setSubmitState({ status: 'error', message: 'URLを入力してください。' })
        return
      }
      // URLの基本的な検証
      if (!targetTimestamps) {
        setSubmitState({
          status: 'error',
          message: 'URL提出の場合は、分析してほしい時間帯 / タイムスタンプを入力してください。',
        })
        return
      }
      formData.set('targetTimestamps', targetTimestamps)
      try {
        new URL(videoUrl)
      } catch {
        setSubmitState({ status: 'error', message: '有効なURLを入力してください。' })
        return
      }
    } else {
      // ファイルアップロードの場合は必須チェック
      const videoFile = formData.get('videoFile') as File
      if (!videoFile || videoFile.size === 0) {
        setSubmitState({ status: 'error', message: '動画ファイルを選択してください。' })
        return
      }
    }

    setSubmitState({ status: 'submitting', message: '動画を安全に保存しています。完了まで画面を閉じずにお待ちください。' })

    try {
      const response = await fetch('/api/ai-coach/video-submissions', {
        method: 'POST',
        body: formData,
      })
      const json = await response.json().catch(() => ({}))

      if (!response.ok || !json.ok) {
        throw new Error(json.message || '送信に失敗しました。')
      }

      form.reset()
      setSubmitState({
        status: 'success',
        message: '動画提出を受け付けました。運営が確認し、フィードバック準備後に閲覧ページで確認できます。',
        submissionId: json.submissionId,
        feedbackUrl: json.feedbackUrl,
      })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : '送信に失敗しました。',
      })
    }
  }

  return (
    <>
      <SeoHead
        title="動画提出 | Apex AI Coach β版"
        description="Apex AI Coach β版のチーム動画提出フォームです。提出動画は運営確認用として安全に保存され、サイト上には公開されません。"
        path="/ai-coach/upload"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH VIDEO SUBMISSION</p>
            <h1>チーム動画を提出する</h1>
            <p className="pageHero__lead">
              Apex の試合動画を運営確認用として安全に保存し、β版では運営または AI Coach が手動/半自動でフィードバックを返します。
              動画や GPT URL はサイト上に公開しません。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              {submitState.status === 'success' ? (
                <div className="formSuccess">
                  <p className="eyebrow">SUBMITTED</p>
                  <h2>動画提出が完了しました</h2>
                  <p>{submitState.message}</p>
                  <div className="submissionSummary">
                    <div>
                      <span>提出ID</span>
                      <strong>{submitState.submissionId}</strong>
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
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => setSubmitState({ status: 'idle', message: '' })}
                    >
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
                      <input className="textInput" name="userName" required />
                    </label>
                    <label className="fieldLabel">
                      Discord ID
                      <input className="textInput" name="discordId" required placeholder="name#0000 / user_id" />
                    </label>
                    <label className="fieldLabel">
                      メールアドレス
                      <input className="textInput" name="email" type="email" required />
                    </label>
                    <label className="fieldLabel">
                      ランク帯
                      <select className="textInput" name="rankTier" required defaultValue="">
                        <option value="" disabled>
                          選択してください
                        </option>
                        {rankOptions.map((rank) => (
                          <option key={rank} value={rank}>
                            {rank}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fieldLabel">
                      マップ名
                      <input className="textInput" name="mapName" required placeholder="World's Edge / Storm Point など" />
                    </label>
                    <label className="fieldLabel">
                      チーム構成
                      <input className="textInput" name="teamComp" placeholder="例: Bangalore / Catalyst / Crypto" />
                    </label>
                    <label className="fieldLabel">
                      見てほしいシーン
                      <select className="textInput" name="sceneType" required defaultValue="">
                        <option value="" disabled>
                          選択してください
                        </option>
                        {sceneOptions.map((scene) => (
                          <option key={scene} value={scene}>
                            {scene}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="fieldLabel">
                    重点的に見てほしいポイント
                    <input className="textInput" name="focusPoints" placeholder="例: 初動判断、ファイト前のコール、終盤ポジション" />
                  </label>

                  <label className="fieldLabel">
                    補足説明
                    <textarea
                      className="textArea"
                      name="description"
                      rows={6}
                      required
                      placeholder="試合の状況、困っていること、特に見てほしい時間帯などを書いてください。"
                    />
                  </label>

                  {submissionMode === 'url' ? (
                    <label className="fieldLabel">
                      分析してほしい時間帯 / タイムスタンプ（URL提出時は必須）
                      <input
                        className="textInput"
                        name="targetTimestamps"
                        required
                        placeholder="例：12:30〜13:05、1:02:10〜1:03:20"
                      />
                      <span className="fieldHint">長尺動画の場合、分析してほしい場面の時間を入力してください。</span>
                    </label>
                  ) : null}

                  <div className="aiCoachSubmissionModeSelector">
                    <p className="fieldLabel">動画の提出方法</p>
                    <div className="modeToggle">
                      <label className="modeOption">
                        <input
                          type="radio"
                          name="submissionType"
                          value="file"
                          checked={submissionMode === 'file'}
                          onChange={(e) => setSubmissionMode(e.target.value as 'file' | 'url')}
                        />
                        <span>ファイルをアップロード</span>
                      </label>
                      <label className="modeOption">
                        <input
                          type="radio"
                          name="submissionType"
                          value="url"
                          checked={submissionMode === 'url'}
                          onChange={(e) => setSubmissionMode(e.target.value as 'file' | 'url')}
                        />
                        <span>URLで提出（長尺動画向け）</span>
                      </label>
                    </div>
                  </div>

                  {submissionMode === 'file' ? (
                    <label className="fieldLabel">
                      動画ファイル
                      <input className="textInput fileInput" name="videoFile" type="file" accept={acceptedVideoTypes} />
                    </label>
                  ) : (
                    <label className="fieldLabel">
                      動画URL
                      <input
                        className="textInput"
                        name="videoUrl"
                        type="url"
                        placeholder="https://youtube.com/... または https://example.com/video.mp4 など"
                      />
                    </label>
                  )}

                  <div className="aiCoachConsentBox">
                    <label className="checkboxField checkboxField--inline">
                      <input name="consentAccepted" type="checkbox" required />
                      <span>
                        動画にチーム情報や VC 音声が含まれる可能性を理解し、チームメンバーの許可を得たうえで提出します。
                      </span>
                    </label>
                    <ul className="detailList">
                      <li>提出動画はサイト上に公開されません。</li>
                      <li>削除希望がある場合は運営に連絡できます。</li>
                      <li>β版では品質改善のため、分析傾向を参考にする可能性があります。</li>
                    </ul>
                  </div>

                  {submitState.message ? (
                    <p className={`formMessage formMessage--${submitState.status === 'error' ? 'error' : 'success'}`}>
                      {submitState.message}
                    </p>
                  ) : null}

                  <button type="submit" className="button button--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'アップロード中...' : '動画を提出する'}
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
