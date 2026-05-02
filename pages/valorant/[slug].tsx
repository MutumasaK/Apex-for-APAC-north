import type { GetServerSideProps } from 'next'

export default function LegacyValorantMapRedirect() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = typeof context.params?.slug === 'string' ? context.params.slug : ''

  return {
    redirect: {
      destination: `/valorant/maps/${slug}`,
      permanent: false,
    },
  }
}
