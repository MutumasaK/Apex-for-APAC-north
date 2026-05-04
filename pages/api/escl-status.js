import {
  computeEsclStatus,
  computeEsclTeamStatus,
  formatJst,
  isAfter21Jst,
  isRedisEnabled,
  readEsclStatus,
  saveEsclStatus,
} from '../../lib/escl-status-core'
import { DEFAULT_TEAM_NAME } from '../../lib/site'

function pendingPayload(now = new Date()) {
  const updatedAtLabel = `最終確認: ${formatJst(now)}`
  const selectedScrim = {
    id: 'a2fed046-6427-432b-8852-dcc7b0981817',
    title: '本日の ESCL スクリム情報',
    detailUrl: 'https://fightnt.escl.co.jp/scrims/a2fed046-6427-432b-8852-dcc7b0981817',
    dateLabel: '',
    entryStatus: 'unknown',
    entryStatusLabel: 'データ確認中',
    checkinStatus: 'unknown',
    checkinStatusLabel: 'データ確認中',
    statusLabel: 'データ確認中',
    rate: 0,
    note: '本日のスクリム情報を確認しています。',
  }

  return {
    date: null,
    selectedScrim,
    scrims: [],
    items: [selectedScrim],
    meta: {
      teamName: DEFAULT_TEAM_NAME,
      ratePoint: 0,
      rateUpdatedAt: updatedAtLabel,
    },
    status: 'データ確認中',
    group: null,
    scrimId: null,
    scrimName: null,
    updatedAtLabel,
    source: 'empty',
  }
}

function errorPayload(error) {
  const now = new Date()
  const updatedAtLabel = `最終確認: ${formatJst(now)}`
  const selectedScrim = {
    id: 'a2fed046-6427-432b-8852-dcc7b0981817',
    title: '本日の ESCL スクリム情報',
    detailUrl: 'https://fightnt.escl.co.jp/scrims/a2fed046-6427-432b-8852-dcc7b0981817',
    dateLabel: '',
    entryStatus: 'unknown',
    entryStatusLabel: 'データ確認中',
    checkinStatus: 'unknown',
    checkinStatusLabel: 'データ確認中',
    statusLabel: 'データ確認中',
    rate: 0,
    note: '本日のスクリム情報を確認しています。',
  }

  return {
    date: null,
    selectedScrim,
    scrims: [],
    items: [selectedScrim],
    meta: {
      teamName: DEFAULT_TEAM_NAME,
      ratePoint: 0,
      rateUpdatedAt: updatedAtLabel,
    },
    status: 'データ確認中',
    group: null,
    scrimId: null,
    scrimName: null,
    updatedAtLabel,
    source: 'error',
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const { teamName, teamId, teamSlug } = req.query
    const now = new Date()

    if (teamName || teamId || teamSlug) {
      const data = await computeEsclTeamStatus({
        teamName: typeof teamName === 'string' ? teamName : undefined,
        teamId: typeof teamId === 'string' ? Number(teamId) : undefined,
        teamSlug: typeof teamSlug === 'string' ? teamSlug : undefined,
      })

      return res.status(200).json(data)
    }

    if (isRedisEnabled()) {
      const stored = await readEsclStatus(now)
      if (stored?.selectedScrim) {
        return res.status(200).json(stored)
      }
    }

    if (!isAfter21Jst(now)) {
      const computed = await computeEsclStatus(now)
      return res.status(200).json({
        ...computed,
        source: 'live-pending',
      })
    }

    const computed = await computeEsclStatus(now)

    if (!isRedisEnabled()) {
      return res.status(200).json({
        ...computed,
        source: 'live-no-store',
      })
    }

    const saved = await saveEsclStatus(computed, now)
    return res.status(200).json(saved)
  } catch (error) {
    console.error('escl-status error', error instanceof Error ? error.message : error)
    return res.status(200).json(errorPayload(error))
  }
}
