export const AI_COACH_PLANS = [
  {
    name: 'Free',
    price: '¥0',
    priceSuffix: '',
    purpose: 'AI Coachの価値を見せる',
    features: ['サンプル分析閲覧', 'AI Coachの説明', '注意事項の確認'],
    cta: 'サンプル分析を見る',
    href: '/ai-coach/sample-analysis',
  },
  {
    name: 'Lite',
    price: '¥980',
    priceSuffix: ' / 月',
    purpose: 'お試し課金',
    features: ['ファイトシーン分析 月3回', '簡易マクロ相談', '簡易IGLコール改善', '次回意識する3項目', '反省テンプレ出力'],
    cta: 'β版に申し込む',
    href: '/contact',
  },
  {
    name: 'Player',
    price: '¥1,980',
    priceSuffix: ' / 月',
    purpose: '個人向け本命',
    features: ['ファイトシーン分析 月10回', '通常マクロ相談', '通常IGLコール改善', 'ランク停滞相談', '反省テンプレ出力', '次回チェックリスト作成'],
    cta: 'β版に申し込む',
    href: '/contact',
  },
]

export const AI_COACH_NOTES = [
  'AIの分析はあくまで1つの視点です',
  '実際のチーム方針、IGL判断、選手の意図を尊重してください',
  '映像や画像から読み取れない情報は推測になる場合があります',
  'ハルシネーション、つまり事実と異なる内容を生成する可能性があります',
  '最終判断はチーム内で確認し、人間のレビューを前提にしてください',
  'AIの提案は、反省会のたたき台として活用してください',
]
