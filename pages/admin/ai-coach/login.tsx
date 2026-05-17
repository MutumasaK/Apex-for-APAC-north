import { FormEvent, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'

const ADMIN_TOKEN_STORAGE_KEY = 'aiCoachAdminToken'

function setAdminCookie(value: string) {
  document.cookie = `aiCoachAdminToken=${encodeURIComponent(value)}; path=/; max-age=86400`
}

export default function AdminAiCoachLoginPage() {
  const router = useRouter()
  const [adminToken, setAdminToken] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const savedToken = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    if (savedToken) {
      setAdminToken(savedToken)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!adminToken) {
      setMessage('管理トークンを入力してください。')
      return
    }

    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken)
    setAdminCookie(adminToken)
    router.push('/admin/ai-coach/submissions')
  }

  return (
    <>
      <SeoHead
        title="AI Coach 管理ログイン | Apex Dashboard"
        description="AI Coach 管理画面にアクセスするためのログインページです。"
        path="/admin/ai-coach/login"
      />

      <SiteLayout footerCta={false}>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">ADMIN / AI COACH</p>
            <h1>管理ページにログイン</h1>
            <p className="pageHero__lead">
              AI Coach 管理画面にはトークン認証が必要です。トークンを入力してアクセスしてください。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              <form className="adminTokenForm" onSubmit={handleSubmit}>
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
                <button className="button button--primary" type="submit">
                  ログイン
                </button>
              </form>
              {message ? <p className="formMessage">{message}</p> : null}
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
