import Link from 'next/link'
import { PropsWithChildren } from 'react'
import { PRIMARY_NAV_LINKS, SITE_NAME } from '../lib/site'

type SiteLayoutProps = PropsWithChildren<{
  footerCta?: boolean
}>

export default function SiteLayout({ children, footerCta = true }: SiteLayoutProps) {
  return (
    <div className="siteShell">
      <header className="siteHeader">
        <div className="siteHeader__inner">
          <Link href="/" className="siteBrand">
            <span className="siteBrand__eyebrow">COMPETITIVE HUB</span>
            <strong>{SITE_NAME}</strong>
          </Link>

          <nav className="siteNav" aria-label="Primary">
            {PRIMARY_NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="siteNav__link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="siteFooter">
        <div className="siteFooter__inner">
          <div>
            <p className="siteFooter__eyebrow">MATCH READY INTEL</p>
            <h2>Apex と VALORANT の競技情報を、すぐ確認できる場所へ。</h2>
            <p className="siteFooter__lead">
              ESCLチーム情報、ランクマップ、Pick率、マップ攻略、AI Coachの導線を整理しています。
            </p>
          </div>

          <div className="siteFooter__links">
            {PRIMARY_NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href="/pricing">Pricing</Link>
          </div>

          {footerCta ? (
            <div className="siteFooter__cta">
              <p>チーム掲載、ESCL情報の修正、スポンサー相談は問い合わせフォームから受け付けています。</p>
              <Link href="/contact" className="button button--primary">
                問い合わせ
              </Link>
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  )
}
