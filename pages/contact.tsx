import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import SeoHead from '../components/SeoHead'
import SiteLayout from '../components/SiteLayout'

const inquiryOptions = [
  'チーム掲載について',
  'ESCL情報の修正依頼',
  'スポンサー・提案相談',
  '取材・メディア掲載',
  'AI Coachについて',
  'その他',
]

export default function ContactPage() {
  const router = useRouter()
  const initialTeam = typeof router.query.team === 'string' ? router.query.team : ''
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '',
    contact: '',
    inquiryType: inquiryOptions[0],
    targetTeamName: initialTeam,
    content: '',
    replyWanted: true,
    website: '',
  })

  const isValid = useMemo(() => {
    return Boolean(form.name.trim() && form.contact.trim() && form.inquiryType.trim() && form.content.trim())
  }, [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) return

    setStatus('sending')
    setMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()

      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || '送信に失敗しました。')
      }

      setStatus('success')
      setMessage(
        json.stored
          ? '問い合わせを受け付けました。確認後にご連絡します。'
          : '問い合わせを受け付けました。保存先が未設定のため、サーバーログに記録しています。'
      )
      setForm((prev) => ({ ...prev, name: '', contact: '', content: '', website: '' }))
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '送信に失敗しました。')
    }
  }

  return (
    <>
      <SeoHead
        title="問い合わせ | Apex Dashboard"
        description="チーム掲載、ESCL情報の修正依頼、スポンサー相談、AI Coachに関する問い合わせフォームです。"
        path="/contact"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">CONTACT</p>
            <h1>掲載相談やチーム関連の問い合わせはこちら。</h1>
            <p className="pageHero__lead">
              送信内容はAPIで受け取り、Supabaseの環境変数が設定されている場合は保存されます。
            </p>
          </section>

          <section className="pageSection">
            <article className="card card--form">
              <form className="contactForm" onSubmit={handleSubmit}>
                <div className="formGrid">
                  <label className="fieldLabel">
                    名前
                    <input
                      className="textInput"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>

                  <label className="fieldLabel">
                    メールまたはDiscord ID
                    <input
                      className="textInput"
                      value={form.contact}
                      onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                    />
                  </label>

                  <label className="fieldLabel">
                    問い合わせ種別
                    <select
                      className="textInput"
                      value={form.inquiryType}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, inquiryType: event.target.value }))
                      }
                    >
                      {inquiryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="fieldLabel">
                    対象チーム名
                    <input
                      className="textInput"
                      value={form.targetTeamName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, targetTeamName: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="fieldLabel">
                  内容
                  <textarea
                    className="textArea"
                    rows={8}
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  />
                </label>

                <label className="checkboxField">
                  <input
                    type="checkbox"
                    checked={form.replyWanted}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, replyWanted: event.target.checked }))
                    }
                  />
                  返信を希望する
                </label>

                <label className="honeypotField" aria-hidden="true">
                  Website
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                  />
                </label>

                <div className="formActions">
                  <button type="submit" className="button button--primary" disabled={!isValid || status === 'sending'}>
                    {status === 'sending' ? '送信中...' : '送信する'}
                  </button>
                  {message ? <p className={`formMessage formMessage--${status}`}>{message}</p> : null}
                </div>
              </form>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
