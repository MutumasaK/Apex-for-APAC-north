import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCurrentRankMap } from '../../lib/apex'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  try {
    const rankMap = await fetchCurrentRankMap()
    return res.status(200).json(rankMap)
  } catch (error) {
    console.error('rankmap api error', error instanceof Error ? error.message : error)
    return res.status(200).json({
      ok: false,
      sourceUrl: 'https://gamefavo.com/news/apex/apex-rotation-schedule/',
      errorType: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
