import type { GetServerSideProps } from 'next'
import { APEX_GUIDE_MAPS } from '../lib/apex'
import { buildAbsoluteUrl } from '../lib/site'
import { VALORANT_MAPS } from '../lib/valorant'

function buildSitemap() {
  const staticPaths = [
    '/',
    '/apex',
    '/apex/rank-map',
    '/apex/legends-pick-rate',
    '/apex/news',
    '/escl',
    '/contact',
    '/valorant',
    '/valorant/maps',
    '/valorant/news',
    '/ai-coach',
    '/dashboard/coach',
    '/pricing',
  ]
  const apexPaths = APEX_GUIDE_MAPS.map((item) => `/apex/${item.slug}`)
  const valorantPaths = VALORANT_MAPS.map((item) => `/valorant/maps/${item.slug}`)

  const urls = [...staticPaths, ...apexPaths, ...valorantPaths]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (path) => `<url>
  <loc>${buildAbsoluteUrl(path)}</loc>
</url>`
  )
  .join('\n')}
</urlset>`
}

export default function SitemapXml() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/xml')
  res.write(buildSitemap())
  res.end()

  return {
    props: {},
  }
}
