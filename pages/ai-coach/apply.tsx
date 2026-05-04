import { FormEvent, useState } from 'react'
import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

export default function AiCoachApplyPage() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      <SeoHead
        title="β版申し込み | Apex AI Coach"
        description="Apex AI Coach β版の申し込みフォームです。"
        path="/ai-coach/apply"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">BETA APPLY</p>
            <h1>Apex AI Coach β版 申し込み</h1>
            <p className="pageHero__lead">
              希望プランと主な悩みを送ってください。
              β版では申し込み後にGPTリンクで利用案内する形を想定しています。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              {submitted ? (
                <div className="formSuccess">
                  <h2>申し込みを受け付けました</h2>
                  <p>内容を確認後、β版の利用案内をご連絡します。</p>
                  <Link href="/ai-coach" className="button button--primary">
                    AI Coachへ戻る
                  </Link>
                </div>
              ) : (
                <form className="contactForm" onSubmit={handleSubmit}>
                  <div className="formGrid">
                    <label className="fieldLabel">
                      名前
                      <input className="textInput" name="name" required />
                    </label>
                    <label className="fieldLabel">
                      メールアドレス
                      <input className="textInput" name="email" type="email" required />
                    </label>
                    <label className="fieldLabel">
                      Discord名
                      <input className="textInput" name="discord" required />
                    </label>
                    <label className="fieldLabel">
                      希望プラン
                      <select className="textInput" name="plan" required defaultValue="Lite">
                        <option value="Free">Free</option>
                        <option value="Lite">Lite</option>
                        <option value="Player">Player</option>
                      </select>
                    </label>
                    <label className="fieldLabel">
                      ランク帯
                      <input className="textInput" name="rank" placeholder="例: Diamond / Master" />
                    </label>
                    <label className="fieldLabel">
                      利用目的
                      <input className="textInput" name="purpose" placeholder="例: スクリム反省 / ランク改善" />
                    </label>
                  </div>

                  <label className="fieldLabel">
                    主な悩み
                    <textarea
                      className="textArea"
                      name="problem"
                      rows={6}
                      required
                      placeholder="ファイトで負ける場面、マクロ判断、IGLコールなど"
                    />
                  </label>

                  <p className="formNote">
                    AIの分析は1つの視点であり、映像や画像から確認できないことは推測を含む可能性があります。
                  </p>

                  <button type="submit" className="button button--primary">
                    申し込む
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
