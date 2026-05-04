import { computeEsclTeamStatus, formatJst } from '../../lib/escl-status-core'

function buildNeutralPayload(teamName = '') {
  const updatedAtLabel = `最終確認: ${formatJst(new Date())}`
  const displayTeamName = teamName.trim() || '-'
  const emptyStatus = teamName.trim() ? '該当チームなし' : 'チーム未選択'
  const message = teamName.trim()
    ? '該当するESCLチームが見つかりませんでした。'
    : 'チーム名を入力するとESCL情報を確認できます。'

  const selectedScrim = {
    id: '',
    title: 'ESCLチーム情報',
    detailUrl: '',
    dateLabel: '',
    entryStatus: 'unknown',
    entryStatusLabel: 'データ確認中',
    checkinStatus: 'unknown',
    checkinStatusLabel: 'データ確認中',
    statusLabel: 'データ確認中',
    rate: 0,
    note: message,
    updatedAt: updatedAtLabel,
  }

  return {
    selectedTeam: teamName.trim()
      ? {
          teamId: '',
          teamName: displayTeamName,
          teamSlug: '',
        }
      : null,
    selectedScrim,
    todayStatus: selectedScrim,
    recentScrims: [],
    scrims: [selectedScrim],
    items: [selectedScrim],
    meta: {
      teamName: displayTeamName,
      ratePoint: 0,
      rateUpdatedAt: updatedAtLabel,
    },
    teamName: displayTeamName,
    rate: '-',
    participationStatus: emptyStatus,
    checkinStatus: teamName.trim() ? '-' : 'チーム未選択',
    message,
    updatedAtLabel,
    updatedAt: updatedAtLabel,
    source: teamName.trim() ? 'not-found' : 'empty',
  }
}

function getQueryValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const teamName = getQueryValue(req.query.teamName)
  const teamId = getQueryValue(req.query.teamId)
  const teamSlug = getQueryValue(req.query.teamSlug)

  if (!teamName && !teamId && !teamSlug) {
    return res.status(200).json(buildNeutralPayload())
  }

  try {
    const data = await computeEsclTeamStatus({
      teamName: teamName || undefined,
      teamId: teamId ? Number(teamId) : undefined,
      teamSlug: teamSlug || undefined,
    })

    if (!data?.selectedTeam?.teamId) {
      return res.status(200).json(buildNeutralPayload(teamName))
    }

    return res.status(200).json({
      ...data,
      teamName: data.selectedTeam.teamName,
      rate: data.selectedScrim.rate,
      participationStatus: data.selectedScrim.entryStatusLabel,
      checkinStatus: data.selectedScrim.checkinStatusLabel,
    })
  } catch (error) {
    console.error('escl api error', error instanceof Error ? error.message : error)
    return res.status(200).json(buildNeutralPayload(teamName))
  }
}
