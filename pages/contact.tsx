import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import SeoHead from '../components/SeoHead'
import SiteLayout from '../components/SiteLayout'

const inquiryOptions = [
  'AI Coach',
  'チーム分析',
  'スポンサー掲載',
  'その他',
]

export default function ContactPage() {
  const router = useRouter()
  const initialTeam = typeof router.query.team === 'string' ? router.query.team : ''
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    discordId: '',
    inquiryType: inquiryOptions[0],
    plan: 'Lite',
    rank: '',
    teamName: initialTeam,
    message: '',
    website: '',
  })

  const isValid = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
        form.inquiryType.trim() &&
        form.plan.trim() &&
        form.message.trim()
    )
  }, [form])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isValid) {
      setStatus('error')
      setMessage('入力内容を確認してください。')
      return
    }

    setStatus('sending')
    setMessage('')

    try {
      const response = await fetch('/api/ai-coach-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          inquiryType: form.inquiryType,
          plan: form.plan,
          discordId: form.discordId,
          rank: form.rank,
          teamName: form.teamName,
          email: form.email,
          message: form.message,
          website: form.website,
        }),
      })
      const json = await response.json()

      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || '送信に失敗しました。')
      }

      setStatus('success')
      setMessage('申請を受け付けました。確認後、メールまたはDiscordでご連絡します。')
      setForm((prev) => ({ ...prev, name: '', email: '', discordId: '', rank: '', teamName: '', message: '', website: '' }))
    } catch (error) {
      setStatus('error')
      setMessage('申請の送信に失敗しました。時間をおいて再度お試しください。')
    }
  }

  return (
    <>
      <SeoHead
        title="問い合わせ | Apex Dashboard"
        description="チーム利用、AI Coach、スポンサー掲載に関する問い合わせフォームです。"
        path="/contact"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">CONTACT</p>
            <h1>チーム利用・AI Coach・スポンサー掲載の相談はこちら。</h1>
            <p className="pageHero__lead">
              チーム分析の導入相談、AI Coachの利用相談、スポンサー掲載の相談を受け付けています。
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
                      name="name"
                      value={form.name}
                      required
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>

                  <label className="fieldLabel">
                    メールアドレス
                    <input
                      className="textInput"
                      name="email"
                      type="email"
                      value={form.email}
                      required
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </label>

                  <label className="fieldLabel">
                    希望内容
                    <select
                      className="textInput"
                      name="inquiryType"
                      value={form.inquiryType}
                      required
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
                    希望プラン
                    <select
                      className="textInput"
                      name="plan"
                      value={form.plan}
                      required
                      onChange={(event) => setForm((prev) => ({ ...prev, plan: event.target.value }))}
                    >
                      <option value="Free">Free</option>
                      <option value="Lite">Lite</option>
                      <option value="Player">Player</option>
                    </select>
                  </label>

                  <label className="fieldLabel">
                    Discord ID
                    <input
                      className="textInput"
                      name="discordId"
                      value={form.discordId}
                      placeholder="例: username#1234"
                      onChange={(event) => setForm((prev) => ({ ...prev, discordId: event.target.value }))}
                    />
                  </label>

                  <label className="fieldLabel">
                    ランク帯
                    <input
                      className="textInput"
                      name="rank"
                      value={form.rank}
                      placeholder="例: Diamond / Master"
                      onChange={(event) => setForm((prev) => ({ ...prev, rank: event.target.value }))}
                    />
                  </label>

                  <label className="fieldLabel">
                    チーム名
                    <input
                      className="textInput"
                      name="teamName"
                      value={form.teamName}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, teamName: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="fieldLabel">
                  相談内容
                  <textarea
                    className="textArea"
                    name="message"
                    rows={8}
                    required
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  />
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
                  <button type="submit" className="button button--primary" disabled={status === 'sending'}>
                    {status === 'sending' ? '送信中...' : '相談内容を送信する'}
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
