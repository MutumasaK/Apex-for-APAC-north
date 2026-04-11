import {
  computeEsclStatus,
  formatJst,
  isAfter21Jst,
  isRedisEnabled,
  readEsclStatus,
  saveEsclStatus,
} from '../../lib/escl-status-core'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const now = new Date()

    // Redisが有効なら保存済みデータを最優先
    if (isRedisEnabled()) {
      const stored = await readEsclStatus(now)
      if (stored) {
        return res.status(200).json(stored)
      }
    }

    // Redis未設定のローカル環境では、その場計算で返す
    if (!isRedisEnabled()) {
      const computed = await computeEsclStatus(now)
      return res.status(200).json({
        ...computed,
        source: 'live-no-store',
      })
    }

    // 21:00 JST 以前は未取得のまま返す
    if (!isAfter21Jst(now)) {
      return res.status(200).json({
        date: null,
        items: [
          {
            id: 'scrim-pending',
            title: '自チームのESCLスクリム情報',
            dateLabel: '',
            statusLabel: '未取得',
            note: '本日の確定データはまだ保存されていません。',
          },
        ],
        meta: {
          teamName: '京都ブライアンホテル',
          ratePoint: 0,
          rateUpdatedAt: `最終確認: ${formatJst(now)}`,
        },
        status: '未取得',
        group: null,
        scrimId: null,
        scrimName: null,
        updatedAtLabel: `最終確認: ${formatJst(now)}`,
        source: 'empty',
      })
    }

    // 21:00 JST 以降で保存がない場合は、その場で補完取得して保存
    const computed = await computeEsclStatus(now)
    const saved = await saveEsclStatus(computed, now)

    return res.status(200).json(saved)
  } catch (error) {
    return res.status(200).json({
      date: null,
      items: [
        {
          id: 'scrim-error',
          title: '自チームのESCLスクリム情報',
          dateLabel: '',
          statusLabel: '未取得',
          note:
            error instanceof Error
              ? `ESCLステータスの取得に失敗しました: ${error.message}`
              : 'ESCLステータスの取得に失敗しました。',
        },
      ],
      meta: {
        teamName: '京都ブライアンホテル',
        ratePoint: 0,
        rateUpdatedAt: `最終確認: ${formatJst(new Date())}`,
      },
      status: '未取得',
      group: null,
      scrimId: null,
      scrimName: null,
      updatedAtLabel: `最終確認: ${formatJst(new Date())}`,
      source: 'error',
    })
  }
}