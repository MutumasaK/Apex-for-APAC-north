import {
  computeEsclStatus,
  formatJst,
  isAfter21Jst,
  isRedisEnabled,
  readEsclStatus,
  saveEsclStatus,
} from '../../lib/escl-status-core'

const TEAM_NAME = process.env.ESCL_TARGET_TEAM_NAME || '京都ブライアンホテル'

function pendingPayload(now = new Date()) {
  const updatedAtLabel = `最終確認: ${formatJst(now)}`

  return {
    date: null,
    items: [
      {
        id: 'scrim-pending',
        title: '自チームのESCLスクリム情報',
        dateLabel: '',
        statusLabel: '確認中',
        note: '本日のESCLスクリムは、21:00 JST以降に参加状況を確認します。',
      },
    ],
    meta: {
      teamName: TEAM_NAME,
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
      ? `ESCLステータスの取得に失敗しました: ${error.message}`
      : 'ESCLステータスの取得に失敗しました。'

  return {
    date: null,
    items: [
      {
        id: 'scrim-error',
        title: '自チームのESCLスクリム情報',
        dateLabel: '',
        statusLabel: '未確認',
        note: message,
      },
    ],
    meta: {
      teamName: TEAM_NAME,
      ratePoint: 0,
      rateUpdatedAt: updatedAtLabel,
    },
    status: '未確認',
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
    const now = new Date()

    if (isRedisEnabled()) {
      const stored = await readEsclStatus(now)
      if (stored) {
        return res.status(200).json(stored)
      }
    }

    if (!isAfter21Jst(now)) {
      return res.status(200).json(pendingPayload(now))
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
