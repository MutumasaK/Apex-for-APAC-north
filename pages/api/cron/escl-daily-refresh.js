import {
  computeEsclStatus,
  formatJst,
  saveEsclStatus,
} from '../../../lib/escl-status-core'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization

  if (!process.env.CRON_SECRET) {
    return res.status(500).json({
      error: 'cron_secret_missing',
      message: 'CRON_SECRET が設定されていません。',
    })
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'cron 実行の認証に失敗しました。',
    })
  }

  try {
    const now = new Date()
    const computed = await computeEsclStatus(now)
    const saved = await saveEsclStatus(computed, now)

    return res.status(200).json({
      ok: true,
      message: '当日分のESCLステータスを保存しました。',
      executedAt: formatJst(now),
      data: saved,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'cron_refresh_failed',
      message:
        error instanceof Error
          ? error.message
          : 'cron 更新に失敗しました。',
    })
  }
}