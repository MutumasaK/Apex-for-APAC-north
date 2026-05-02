import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

const newsLinks = [
  {
    title: 'VALORANT 公式ニュース',
    href: 'https://playvalorant.com/ja-jp/news/',
    summary: 'Riot 公式ニュース一覧です。パッチやイベント、競技情報の確認に使えます。',
  },
  {
    title: 'マップローテーション一覧',
    href: '/valorant/maps',
    summary: 'ニュースと合わせて、現在のマッププールもすぐ確認できます。',
  },
]

export default function ValorantNewsPage() {
  return (
    <>
      <SeoHead
        title="VALORANT 最新情報 | Apex Dashboard"
        description="VALORANT の最新ニュースや関連ページへの導線をまとめたページです。"
        path="/valorant/news"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">VALORANT NEWS</p>
            <h1>VALORANTの最新情報。</h1>
            <p className="pageHero__lead">
              公式ニュースと関連ページへの導線を、検索でも内部リンクでも辿りやすい形に整理しています。
            </p>
          </section>

          <section className="pageSection">
            <div className="linkList">
              {newsLinks.map((item) =>
                item.href.startsWith('http') ? (
                  <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className="listLink">
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </a>
                ) : (
                  <a key={item.title} href={item.href} className="listLink">
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </a>
                )
              )}
            </div>
          </section>
        </main>
      </SiteLayout>
    </>
  )
}
