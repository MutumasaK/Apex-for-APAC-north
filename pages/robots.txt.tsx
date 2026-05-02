import type { GetServerSideProps } from 'next'
import { buildAbsoluteUrl } from '../lib/site'

export default function RobotsTxt() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const body = `User-agent: *
Allow: /

Sitemap: ${buildAbsoluteUrl('/sitemap.xml')}`

  res.setHeader('Content-Type', 'text/plain')
  res.write(body)
  res.end()

  return {
    props: {},
  }
}
