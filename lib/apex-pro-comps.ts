export type ApexProCompItem = {
  id: string
  legends: string[]
  pickedTeams: number
  totalTeams: number
  pickRate: number
  style: string
  summary: string
}

export type ApexProCompMatch = {
  matchId: string
  matchLabel: string
  totalTeams: number
  items: ApexProCompItem[]
}

export type ApexProCompsPayload = {
  updatedAt: string
  source: string
  basis: 'per_match'
  formula: string
  matches: ApexProCompMatch[]
}

const TOTAL_TEAMS = 20

const MOCK_PRO_COMP_MATCHES: ApexProCompMatch[] = [
  {
    matchId: 'match-1',
    matchLabel: 'Match 1',
    totalTeams: TOTAL_TEAMS,
    items: [
      {
        id: 'wraith-crypto-wattson',
        legends: ['Wraith', 'Crypto', 'Wattson'],
        pickedTeams: 4,
        totalTeams: TOTAL_TEAMS,
        pickRate: 20,
        style: '安定構成',
        summary: '索敵、設置読み、終盤の守りを重視した構成です。',
      },
      {
        id: 'bangalore-bloodhound-catalyst',
        legends: ['Bangalore', 'Bloodhound', 'Catalyst'],
        pickedTeams: 3,
        totalTeams: TOTAL_TEAMS,
        pickRate: 15,
        style: 'ファイト構成',
        summary: 'スモークと索敵で射線を作り、局地戦の突破力を高めます。',
      },
      {
        id: 'valkyrie-caustic-wattson',
        legends: ['Valkyrie', 'Caustic', 'Wattson'],
        pickedTeams: 3,
        totalTeams: TOTAL_TEAMS,
        pickRate: 15,
        style: '守備構成',
        summary: '移動手段を確保しながら、建物や終盤ポジションを固めます。',
      },
    ],
  },
  {
    matchId: 'match-2',
    matchLabel: 'Match 2',
    totalTeams: TOTAL_TEAMS,
    items: [
      {
        id: 'bangalore-bloodhound-catalyst',
        legends: ['Bangalore', 'Bloodhound', 'Catalyst'],
        pickedTeams: 5,
        totalTeams: TOTAL_TEAMS,
        pickRate: 25,
        style: 'ファイト構成',
        summary: '射線管理と索敵テンポを両立し、中盤の接敵に強い構成です。',
      },
      {
        id: 'wraith-crypto-wattson',
        legends: ['Wraith', 'Crypto', 'Wattson'],
        pickedTeams: 2,
        totalTeams: TOTAL_TEAMS,
        pickRate: 10,
        style: '安定構成',
        summary: 'ポータルで安全にポジションを取り、情報量で終盤を組み立てます。',
      },
      {
        id: 'pathfinder-bangalore-lifeline',
        legends: ['Pathfinder', 'Bangalore', 'Lifeline'],
        pickedTeams: 2,
        totalTeams: TOTAL_TEAMS,
        pickRate: 10,
        style: '機動構成',
        summary: '素早い展開とリカバリーで、広いエリアを使って戦います。',
      },
    ],
  },
  {
    matchId: 'match-3',
    matchLabel: 'Match 3',
    totalTeams: TOTAL_TEAMS,
    items: [
      {
        id: 'valkyrie-caustic-wattson',
        legends: ['Valkyrie', 'Caustic', 'Wattson'],
        pickedTeams: 4,
        totalTeams: TOTAL_TEAMS,
        pickRate: 20,
        style: '守備構成',
        summary: '移動と防衛を両立し、終盤の粘りと安全な移動を重視します。',
      },
      {
        id: 'bangalore-bloodhound-catalyst',
        legends: ['Bangalore', 'Bloodhound', 'Catalyst'],
        pickedTeams: 4,
        totalTeams: TOTAL_TEAMS,
        pickRate: 20,
        style: 'ファイト構成',
        summary: '戦闘開始から詰めまでの判断を速くしやすい構成です。',
      },
      {
        id: 'horizon-seer-bangalore',
        legends: ['Horizon', 'Seer', 'Bangalore'],
        pickedTeams: 2,
        totalTeams: TOTAL_TEAMS,
        pickRate: 10,
        style: '攻撃構成',
        summary: '高所取りと索敵から攻撃の起点を作りやすい構成です。',
      },
    ],
  },
]

function sortItemsByPickRate(match: ApexProCompMatch, itemLimit?: number): ApexProCompMatch {
  const sortedItems = [...match.items].sort((a, b) => b.pickRate - a.pickRate)

  return {
    ...match,
    items: typeof itemLimit === 'number' ? sortedItems.slice(0, itemLimit) : sortedItems,
  }
}

export function getApexProComps(options?: {
  matchLimit?: number
  itemLimit?: number
  latestFirst?: boolean
}): ApexProCompsPayload {
  const matches = options?.latestFirst ? [...MOCK_PRO_COMP_MATCHES].reverse() : [...MOCK_PRO_COMP_MATCHES]
  const limitedMatches =
    typeof options?.matchLimit === 'number' ? matches.slice(0, options.matchLimit) : matches

  return {
    updatedAt: '2026-04-26',
    source: 'ALGS Pro League mock data',
    basis: 'per_match',
    formula: '各試合ごとの構成Pick率 = その試合でその構成を使ったチーム数 ÷ その試合の参加チーム数 × 100',
    matches: limitedMatches.map((match) => sortItemsByPickRate(match, options?.itemLimit)),
  }
}
