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

  return {
    date: null,
    items: [
      {
        id: 'scrim-pending',
        title: '本日の ESCL スクリム情報',
        dateLabel: '',
        statusLabel: '確認中',
        note: '',
      },
    ],
    meta: {
      teamName: DEFAULT_TEAM_NAME,
      ratePoint: 0,
      rateUpdatedAt: updatedAtLabel,
    },
    status: '確認中',
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
  const message =
    error instanceof Error
      ? `ESCL ステータスの取得に失敗しました: ${error.message}`
      : 'ESCL ステータスの取得に失敗しました。'

  return {
    date: null,
    items: [
      {
        id: 'scrim-error',
        title: '本日の ESCL スクリム情報',
        dateLabel: '',
        statusLabel: '確認中',
        note: message,
      },
    ],
    meta: {
      teamName: DEFAULT_TEAM_NAME,
      ratePoint: 0,
      rateUpdatedAt: updatedAtLabel,
    },
    status: '確認中',
    group: null,
    scrimId: null,
    scrimName: null,
    updatedAtLabel,
    source: 'error',
  }
}

export default async function handler(req, res) {
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
      if (stored) {
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
