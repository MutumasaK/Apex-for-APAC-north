import Head from 'next/head'
import { buildAbsoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from '../lib/site'

type SeoHeadProps = {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
}

export default function SeoHead({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
}: SeoHeadProps) {
  const canonicalUrl = buildAbsoluteUrl(path)
  const ogImageUrl = buildAbsoluteUrl(image)

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
    </Head>
  )
}
