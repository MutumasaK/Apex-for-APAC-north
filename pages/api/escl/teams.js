import { searchEsclTeams } from '../../../lib/escl-status-core'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const query = typeof req.query.query === 'string' ? req.query.query : ''

  try {
    const items = await searchEsclTeams(query)
    return res.status(200).json({
      query,
      items,
    })
  } catch (error) {
    console.error('escl teams search error', error instanceof Error ? error.message : error)
    return res.status(200).json({
      query,
      items: [],
      error: 'search_failed',
    })
  }
}
