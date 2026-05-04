import Link from 'next/link'
import { useEffect, useState } from 'react'
import SeoHead from '../../components/SeoHead'
import SiteLayout from '../../components/SiteLayout'
import { AI_COACH_NOTES } from '../../lib/ai-coach-plans'

type SampleCaseImage = {
  src: string
  alt: string
}

type LightboxImage = SampleCaseImage & {
  title?: string
}

type SampleCase = {
  label: string
  title: string
  description: string
  images: SampleCaseImage[]
  points: string[]
}

const overviewImage = '/ai-coach/sample-analysis-overview.png'

const sampleCases: SampleCase[] = [
  {
    label: 'CASE 01 / 初動設計',
    title: '弱いEVOでも先に動ける位置を取る',
    description:
      'ハーベスターがない初動で、物資量・安置方向・退避先を先に整理。撃ち合いでEVOを育てるのではなく、生存できる導線を優先する判断例。',
    images: [
      {
        src: '/ai-coach/case-01-initial-position.png',
        alt: 'CASE 01 初動設計 弱いEVOでも先に動ける位置を取る戦術図',
      },
      {
        src: overviewImage,
        alt: 'Apex AI Coach サンプル分析 全体まとめ',
      },
    ],
    points: ['初動で止まる位置', 'ハーベスターなし時の判断', '第1リングまでに決める移動先'],
  },
  {
    label: 'CASE 02 / ファイト判断',
    title: '撃ち始める前に遮蔽と退き先を共有する',
    description:
      'ノックを狙う前に、味方HP・射線の重なり・カバー距離を確認。“撃てる”ではなく“詰め切れる / 引ける”状態かを判断する例。',
    images: [
      {
        src: '/ai-coach/case-02-fight-decision.png',
        alt: 'CASE 02 ファイト判断 撃ち始める前に遮蔽と退き先を共有する戦術図',
      },
      {
        src: overviewImage,
        alt: 'Apex AI Coach サンプル分析 全体まとめ',
      },
    ],
    points: ['味方との距離', 'フォーカス対象', '詰める条件', '引く判断'],
  },
  {
    label: 'CASE 03 / マクロ改善',
    title: 'ハーベスターなし時の停滞をなくす',
    description:
      'アーマー差を埋めるために止まり続けるのではなく、先入り・外周取り・安全な育成ルートのどれを選ぶかを整理する例。',
    images: [
      {
        src: '/ai-coach/case-03-macro-rotation.png',
        alt: 'CASE 03 マクロ改善 ハーベスターなし時の停滞をなくす戦術図',
      },
      {
        src: overviewImage,
        alt: 'Apex AI Coach サンプル分析 全体まとめ',
      },
    ],
    points: ['ハーベスターの有無', 'アーマー差', '安置入りの早さ', '次に取るべき場所'],
  },
]

const analysisSections = [
  {
    title: 'マクロ改善例',
    items: [
      'EVOを作ってから動くのではなく、弱いEVOでも生きられる位置を先に取る',
      'ハーベスターなし時は、物資量より通行権と退避先を優先する',
      '3人検知が入ったエリアへ無理に入らず、外周から次の安全地帯を取る',
    ],
  },
  {
    title: 'ファイト分析例',
    items: [
      '撃ち始める前に遮蔽と退き先を共有する',
      'ノック後の即確ではなく、味方HPと周囲の漁夫ルートを確認する',
      '展開役とカバー役の距離を広げすぎない',
    ],
  },
  {
    title: '重要コール例',
    items: ['ハベなし、先入り', 'EVOより通行権', '3人検知、入らない', 'ノック後、味方HP確認'],
  },
  {
    title: '次回チェックリスト',
    items: [
      '弱いEVOでも耐えられる位置を先に決める',
      'ファイト前に漁夫確認コールを固定する',
      'ノック後の確キル判断をチームで統一する',
    ],
  },
]

function SampleCaseCarousel({
  images,
  title,
  onOpenImage,
}: {
  images: SampleCaseImage[]
  title: string
  onOpenImage: (image: LightboxImage) => void
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const activeImage = images[currentImageIndex]
  const canNavigate = images.length > 1

  const showPreviousImage = () => {
    setCurrentImageIndex((current) => (current === 0 ? images.length - 1 : current - 1))
  }

  const showNextImage = () => {
    setCurrentImageIndex((current) => (current + 1) % images.length)
  }

  return (
    <div className="sampleCaseCarousel">
      <div className="sampleCaseCarousel__viewport">
        <button
          type="button"
          className="sampleCaseCarousel__imageButton"
          onClick={() => onOpenImage({ ...activeImage, title })}
          aria-label={`${activeImage.alt}を拡大表示する`}
        >
          {images.map((image, index) => (
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              className={`sampleCaseCarousel__image${index === currentImageIndex ? ' is-active' : ''}`}
              aria-hidden={index !== currentImageIndex}
            />
          ))}
        </button>
        <span className="sampleCaseCarousel__count">
          {currentImageIndex + 1} / {images.length}
        </span>
      </div>

      {canNavigate && (
        <>
          <button
            type="button"
            className="sampleCaseCarousel__arrow sampleCaseCarousel__arrow--left"
            onClick={showPreviousImage}
            aria-label={`${title} の前の画像を見る`}
          >
            ‹
          </button>
          <button
            type="button"
            className="sampleCaseCarousel__arrow sampleCaseCarousel__arrow--right"
            onClick={showNextImage}
            aria-label={`${title} の次の画像を見る`}
          >
            ›
          </button>
        </>
      )}

      {canNavigate && (
        <div className="sampleCaseCarousel__indicator" aria-label={`${title} の画像位置`}>
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              className={`sampleCaseCarousel__dot${index === currentImageIndex ? ' is-active' : ''}`}
              onClick={() => setCurrentImageIndex(index)}
              aria-label={`${title} の${index + 1}枚目を表示`}
              aria-pressed={index === currentImageIndex}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SampleAnalysisPage() {
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null)

  useEffect(() => {
    if (!lightboxImage) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLightboxImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxImage])

  useEffect(() => {
    if (!lightboxImage) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [lightboxImage])

  return (
    <>
      <SeoHead
        title="サンプル分析レポート | AI Coach | Apex Dashboard"
        description="AI Coachがどのような観点で、ファイト・マクロ・IGL判断を整理するかのサンプルです。"
        path="/ai-coach/sample-analysis"
      />

      <SiteLayout>
        <main className="pageMain">
          <section className="pageHero pageHero--light">
            <p className="eyebrow">AI COACH REPORT</p>
            <h1>サンプル分析レポート</h1>
            <p className="pageHero__lead">
              AI Coachがどのような観点で、ファイト・マクロ・IGL判断を整理するかのサンプルです。
            </p>
          </section>

          <section className="pageSection">
            <article className="card">
              <div className="cardHeader">
                <div>
                  <p className="sectionHeader__sub">OVERVIEW</p>
                  <h2>分析概要</h2>
                </div>
              </div>
              <div className="featureGrid">
                <div className="softPanel">
                  <strong>対象</strong>
                  <span>Apex Legends / オリンパス</span>
                </div>
                <div className="softPanel">
                  <strong>分析テーマ</strong>
                  <span>オリンパスのマクロ改善：ハーベスターなし時</span>
                </div>
                <div className="softPanel">
                  <strong>結論</strong>
                  <span>EVOを作ってから動くのではなく、弱いEVOでも生きられる位置を先に取る。</span>
                </div>
              </div>
            </article>
          </section>

          <section className="pageSection">
            <div className="sampleGallery">
              {sampleCases.map((caseItem) => (
                <article key={caseItem.label} className="sampleAnalysisCard">
                  <div className="sampleAnalysisCard__header">
                    <p className="sampleAnalysisCard__label">{caseItem.label}</p>
                    <h2 className="sampleAnalysisCard__title">{caseItem.title}</h2>
                    <p className="sampleAnalysisCard__description">{caseItem.description}</p>
                  </div>

                  <SampleCaseCarousel
                    images={caseItem.images}
                    title={caseItem.title}
                    onOpenImage={setLightboxImage}
                  />

                  <div>
                    <p className="sampleCaseImageCaption">見るポイント</p>
                    <ul className="sampleCasePoints">
                      {caseItem.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="pageSection">
            <div className="cardGrid cardGrid--two">
              {analysisSections.map((section) => (
                <article key={section.title} className="card">
                  <h2>{section.title}</h2>
                  <div className="linkList">
                    {section.items.map((item) => (
                      <div key={item} className="listLink listLink--static">
                        <strong>{item}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="pageSection">
            <article className="card aiNoticeCard">
              <h2>AI分析を使う際の注意点</h2>
              <p>
                <strong>
                  AI Coachは答えを決めるものではなく、チームの振り返りを整理するための補助ツールです。
                </strong>
              </p>
              <ul className="detailList">
                {AI_COACH_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          </section>

          <section className="pageSection">
            <article className="card ctaCard">
              <h2>AI Coachについて相談する</h2>
              <p>チームの反省会やスクリムレビューに合わせた使い方を相談できます。</p>
              <div className="aiCoachActions">
                <Link href="/contact" className="button button--primary">
                  AI Coachについて相談する
                </Link>
                <Link href="/ai-coach" className="button button--secondary">
                  AI Coach紹介に戻る
                </Link>
              </div>
            </article>
          </section>
        </main>

        {lightboxImage && (
          <div
            className="sampleLightbox"
            role="dialog"
            aria-modal="true"
            aria-label="画像の拡大表示"
            onClick={() => setLightboxImage(null)}
          >
            <div className="sampleLightbox__content" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className="sampleLightbox__close"
                onClick={() => setLightboxImage(null)}
                aria-label="拡大画像を閉じる"
              >
                ×
              </button>

              {lightboxImage.title && <p className="sampleLightbox__title">{lightboxImage.title}</p>}

              <img src={lightboxImage.src} alt={lightboxImage.alt} className="sampleLightbox__image" />
            </div>
          </div>
        )}
      </SiteLayout>
    </>
  )
}
