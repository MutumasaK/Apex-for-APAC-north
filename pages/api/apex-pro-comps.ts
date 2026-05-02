import type { NextApiRequest, NextApiResponse } from 'next'
import { getApexProComps } from '../../lib/apex-pro-comps'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  res.setHeader('Cache-Control', CACHE_CONTROL)
  return res.status(200).json(getApexProComps())
}
