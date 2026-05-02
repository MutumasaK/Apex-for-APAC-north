import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import SeoHead from '../../../components/SeoHead'
import SiteLayout from '../../../components/SiteLayout'
import { buildTeamSlug, computeEsclTeamStatus, searchEsclTeams } from '../../../lib/escl-status-core'

type EsclTeamPageProps = {
  teamData: Awaited<ReturnType<typeof computeEsclTeamStatus>>
}

export default function EsclTeamPage({ teamData }: EsclTeamPageProps) {
  const teamSlug = buildTeamSlug(teamData.selectedTeam)

  return (
    <>
      <SeoHead
        title={`${teamData.selectedTeam.name} | ESCLチーム情報 | Apex Dashboard`}
        description={`${teamData.selectedTeam.name} のESCL参加状況、RATE、直近スクリム結果を確認できます。`}
        path={teamSlug ? `/escl/teams/${teamSlug}` : '/escl'}
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">ESCL TEAM DETAIL</p>
            <h1>{teamData.selectedTeam.name} のESCLチーム情報</h1>
            <p className="pageHero__lead">
              選択中チームの参加状況、RATE、直近スクリム結果を確認できます。
            </p>
          </section>

          <section className="pageSection">
            <div className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">TEAM OVERVIEW</p>
                  <h2>選択中チーム</h2>
                </div>
                <Link href="/escl" className="inlineLink">
                  チーム検索へ戻る
                </Link>
              </div>

              <div className="teamHeroCard">
                <div>
                  <p className="teamHeroCard__label">チーム名</p>
                  <strong>{teamData.selectedTeam.name}</strong>
                </div>
                <div>
                  <p className="teamHeroCard__label">RATE</p>
                  <strong>{teamData.selectedTeam.rate}</strong>
                </div>
                <div>
                  <p className="teamHeroCard__label">teamId</p>
                  <strong>{teamData.selectedTeam.teamId}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">TODAY STATUS</p>
                    <h2>本日の参加状況</h2>
                  </div>
                </div>

                <div className="detailSummaryCard">
                  <strong>{teamData.todayStatus.statusLabel}</strong>
                  <p>{teamData.todayStatus.note}</p>
                  <span>{teamData.todayStatus.dateLabel || teamData.updatedAtLabel}</span>
                </div>
              </article>

              <article className="card">
                <div className="cardHeader">
                  <div>
                    <p className="sectionHeader__sub">RECENT SCRIMS</p>
                    <h2>直近スクリム結果</h2>
                  </div>
                </div>

                <div className="linkList">
                  {teamData.recentScrims.map((item) => (
                    <div key={item.id} className="listLink listLink--static">
                      <strong>{item.title}</strong>
                      <span>{item.dateLabel}</span>
                      <span>
                        {item.statusLabel} / {item.note}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">CONTACT</p>
                  <h2>掲載相談・問い合わせ</h2>
                </div>
              </div>

              <p className="cardLead">
                チーム掲載、ESCL情報の修正依頼、スポンサーや運営関連の相談は問い合わせフォームから受け付けています。
              </p>
              <Link
                href={`/contact?team=${encodeURIComponent(teamData.selectedTeam.name)}`}
                className="button button--primary"
              >
                このチームについて問い合わせる
              </Link>
            </article>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<EsclTeamPageProps> = async (context) => {
  const teamSlug = typeof context.params?.teamSlug === 'string' ? context.params.teamSlug : ''
  const teamData = await computeEsclTeamStatus({ teamSlug })

  if (!teamData.selectedTeam.teamId) {
    const fallback = await searchEsclTeams('')
    return {
      redirect: {
        destination: fallback[0]?.slug ? `/escl/teams/${fallback[0].slug}` : '/escl',
        permanent: false,
      },
    }
  }

  return {
    props: {
      teamData,
    },
  }
}
