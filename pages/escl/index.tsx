import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import type { GetServerSideProps } from 'next'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { computeEsclTeamStatus } from '../../lib/escl-status-core'
import { DEFAULT_TEAM_NAME } from '../../lib/site'

type SearchItem = {
  teamId: number
  name: string
  rate: number
  slug: string
}

type EsclPageProps = {
  teamData: Awaited<ReturnType<typeof computeEsclTeamStatus>>
}

export default function EsclPage({ teamData }: EsclPageProps) {
  const router = useRouter()
  const [query, setQuery] = useState(teamData.selectedTeam?.teamName || DEFAULT_TEAM_NAME)
  const [results, setResults] = useState<SearchItem[]>([])
  const [loading, setLoading] = useState(false)
  const selectedTeamSlug = teamData.selectedTeam?.teamSlug || ''

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/escl/teams?query=${encodeURIComponent(trimmed)}`, { cache: 'no-store' })
        const json = await response.json()
        setResults(Array.isArray(json?.items) ? json.items : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [query])

  return (
    <>
      <SeoHead
        title="ESCLチーム情報 | Apex Dashboard"
        description="ESCLのチーム名検索、RATE、参加状況、直近スクリム結果を確認できます。"
        path="/escl"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">ESCL TEAM HUB</p>
            <h1>ESCLチーム情報を検索して、参加状況とRATEを確認。</h1>
            <p className="pageHero__lead">
              デフォルトでは {DEFAULT_TEAM_NAME} を表示します。チーム名で検索すると、他チームのESCL情報にも移動できます。
            </p>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">TEAM SEARCH</p>
                    <h2>チーム名で検索</h2>
                  </div>
                </div>

                <label className="fieldLabel" htmlFor="team-search">
                  ESCLチーム検索
                </label>
                <input
                  id="team-search"
                  className="textInput"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="チーム名を入力"
                />

                <div className="searchResults">
                  {loading ? <div className="softPanel">検索しています。</div> : null}
                  {!loading && results.length === 0 ? (
                    <div className="softPanel">候補が見つからない場合は、別表記でも試してください。</div>
                  ) : null}
                  {results.map((team) => (
                    <button
                      key={team.teamId}
                      type="button"
                      className="searchResultItem"
                      onClick={() => router.push(`/escl/teams/${team.slug}`)}
                    >
                      <strong>{team.name}</strong>
                      <span>RATE {team.rate} / teamId {team.teamId}</span>
                    </button>
                  ))}
                </div>
              </article>

              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">SELECTED TEAM</p>
                    <h2>選択中チーム</h2>
                  </div>
                  {selectedTeamSlug ? (
                    <Link href={`/escl/teams/${selectedTeamSlug}`} className="inlineLink">
                      チーム別ページへ
                    </Link>
                  ) : null}
                </div>

                <div className="teamHeroCard">
                  <div>
                    <p className="teamHeroCard__label">チーム名</p>
                    <strong>{teamData.selectedTeam?.teamName || DEFAULT_TEAM_NAME}</strong>
                  </div>
                  <div>
                    <p className="teamHeroCard__label">RATE</p>
                    <strong>{teamData.selectedScrim.rate}</strong>
                  </div>
                  <div>
                    <p className="teamHeroCard__label">エントリー/参加</p>
                    <strong>{teamData.selectedScrim.entryStatusLabel}</strong>
                  </div>
                </div>

                <div className="linkList">
                  <div className="listLink listLink--static">
                    <strong>{teamData.selectedScrim.title}</strong>
                    <span>{teamData.selectedScrim.dateLabel || teamData.updatedAtLabel}</span>
                    <span>エントリー/参加: {teamData.selectedScrim.entryStatusLabel}</span>
                    <span>チェックイン: {teamData.selectedScrim.checkinStatusLabel}</span>
                    <a href={teamData.selectedScrim.detailUrl} target="_blank" rel="noreferrer" className="inlineLink">
                      詳細を見る
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<EsclPageProps> = async () => {
  return {
    props: {
      teamData: await computeEsclTeamStatus({ teamName: DEFAULT_TEAM_NAME }),
    },
  }
}
