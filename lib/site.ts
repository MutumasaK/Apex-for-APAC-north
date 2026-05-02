export const SITE_NAME = 'Apex Dashboard'
export const SITE_DESCRIPTION =
  'Apex と VALORANT の最新情報、ESCLチーム情報、ランクマップ、AI Coachをまとめて確認できる競技向けダッシュボードです。'
export const DEFAULT_OG_IMAGE = '/hero.jpg'
export const DEFAULT_TEAM_NAME = '京都ブライアンホテル'

export const PRIMARY_NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/apex', label: 'Apex' },
  { href: '/escl', label: 'ESCL' },
  { href: '/valorant', label: 'VALORANT' },
  { href: '/ai-coach', label: 'AI Coach' },
  { href: '/contact', label: 'Contact' },
]

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL

  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

export function buildAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalizedPath}`
}
