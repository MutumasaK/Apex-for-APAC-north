import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'

const newsLinks = [
  {
    title: 'Apex Legends 公式ニュース',
    href: 'https://www.ea.com/ja/games/apex-legends/apex-legends/news?page=1&type=latest',
    summary: 'EA 公式の最新ニュース一覧です。アップデートやイベント情報の確認に使えます。',
  },
  {
    title: 'ランクマップ情報',
    href: '/apex/rank-map',
    summary: 'ニュースとあわせて、今プレイすべきマップの情報をすぐ確認できます。',
  },
]

export default function ApexNewsPage() {
  return (
    <>
      <SeoHead
        title="Apex 最新情報 | Apex Dashboard"
        description="Apex の最新ニュースやアップデート導線をまとめたページです。"
        path="/apex/news"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">APEX NEWS</p>
            <h1>Apexの最新情報。</h1>
            <p className="pageHero__lead">
              公式ニュースと、関連する攻略ページへすぐ移動できる導線をまとめています。
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
