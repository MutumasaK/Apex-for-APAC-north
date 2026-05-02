import type { ApexProCompsPayload } from '../lib/apex-pro-comps'

type ProMetaCardProps = {
  data: ApexProCompsPayload
  compact?: boolean
}

export default function ProMetaCard({ data, compact = false }: ProMetaCardProps) {
  return (
    <article className="card proMetaCard">
      <div className="cardHeader">
        <div>
          <p className="sectionHeader__sub">PRO META</p>
          <h3>プロリーグ構成Pick率</h3>
          <p className="proMetaCard__subtitle">試合ごとのPick率</p>
        </div>
      </div>

      <p className="cardLead">{data.formula}</p>

      <div className="proMetaCard__meta">
        <span>{data.source}</span>
        <span>Updated {data.updatedAt}</span>
      </div>

      <div className={compact ? 'proMatchGrid proMatchGrid--compact' : 'proMatchGrid'}>
        {data.matches.map((match) => (
          <section key={match.matchId} className="proMatchBlock">
            <div className="proMatchBlock__header">
              <strong>{match.matchLabel}</strong>
              <span>{match.totalTeams}チーム参加</span>
            </div>

            <div className="proCompList">
              {match.items.map((item) => (
                <article key={`${match.matchId}-${item.id}`} className="proCompItem">
                  <div className="proCompItem__top">
                    <div className="legendTagRow" aria-label={`${item.legends.join(' / ')} 構成`}>
                      {item.legends.map((legend) => (
                        <span key={legend} className="legendTag">
                          {legend}
                        </span>
                      ))}
                    </div>
                    <strong className="proCompItem__rate">{item.pickRate.toFixed(1)}%</strong>
                  </div>

                  <div className="proCompItem__details">
                    <span>
                      採用 {item.pickedTeams} / {item.totalTeams}チーム
                    </span>
                    <span>{item.style}</span>
                  </div>

                  <p>{item.summary}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
