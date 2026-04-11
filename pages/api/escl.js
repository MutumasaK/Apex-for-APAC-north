const ESCL_BASE_URL =
  process.env.ESCL_BASE_URL || 'https://fightnt.escl.gg/api'

const LIST_SCRIM_ENDPOINT =
  process.env.ESCL_LIST_SCRIM_ENDPOINT || '/ListScrim'

const GET_PARTICIPANTS_ENDPOINT =
  process.env.ESCL_GET_PARTICIPANTS_ENDPOINT || '/GetParticipantsByScrimId'

const PUBLIC_TEAM_API_URL =
  process.env.ESCL_PUBLIC_TEAM_API_URL ||
  'https://core-api-prod.escl.workers.dev/public.v1.PublicTeamService/GetTeams'

const TARGET_TEAM_NAME =
  process.env.ESCL_TARGET_TEAM_NAME || '京都ブライアンホテル'

const MAX_SCRIMS_TO_CHECK = Number(process.env.ESCL_MAX_SCRIMS_TO_CHECK || 10)
const MAX_RETURN_ITEMS = Number(process.env.ESCL_MAX_RETURN_ITEMS || 3)

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

function isTargetTeamName(name) {
  return normalizeText(name) === normalizeText(TARGET_TEAM_NAME)
}

function pickFirstArray(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.result)) return payload.result
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.scrims)) return payload.scrims
  if (Array.isArray(payload?.teams)) return payload.teams
  if (Array.isArray(payload?.participants)) return payload.participants
  return []
}

function buildUrl(base, endpoint, params = {}) {
  const url = new URL(endpoint, base.endsWith('/') ? base : `${base}/`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      ...init.headers,
    },
    ...init,
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: 'https://fightnt.escl.co.jp',
      Referer: 'https://fightnt.escl.co.jp/teams?q=' + encodeURIComponent(TARGET_TEAM_NAME),
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`POST failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function pickScrimId(scrim) {
  return (
    scrim?.scrimId ??
    scrim?.ScrimId ??
    scrim?.id ??
    scrim?.Id ??
    scrim?.matchId ??
    scrim?.MatchId ??
    null
  )
}

function pickScrimTitle(scrim) {
  return (
    scrim?.title ??
    scrim?.Title ??
    scrim?.name ??
    scrim?.Name ??
    scrim?.scrimName ??
    scrim?.ScrimName ??
    scrim?.eventName ??
    scrim?.EventName ??
    'ESCL Scrim'
  )
}

function pickDateLike(scrim) {
  return (
    scrim?.startDate ??
    scrim?.StartDate ??
    scrim?.date ??
    scrim?.Date ??
    scrim?.scheduledAt ??
    scrim?.ScheduledAt ??
    scrim?.createdAt ??
    scrim?.CreatedAt ??
    null
  )
}

function formatDateLabel(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatJstDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function extractParticipants(payload) {
  const source = pickFirstArray(payload)

  return source.map((item) => ({
    name:
      item?.teamName ??
      item?.TeamName ??
      item?.name ??
      item?.Name ??
      item?.team?.name ??
      item?.Team?.Name ??
      '',
    raw: item,
  }))
}

function getParticipantCount(payload) {
  return extractParticipants(payload).length
}

function findTargetParticipant(payload) {
  return extractParticipants(payload).find((participant) =>
    isTargetTeamName(participant.name)
  )
}

function sortScrimsByDateDesc(scrims) {
  return [...scrims].sort((a, b) => {
    const ad = new Date(pickDateLike(a) ?? 0).getTime()
    const bd = new Date(pickDateLike(b) ?? 0).getTime()
    return bd - ad
  })
}

function extractNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '')
    if (!cleaned) return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function findNestedArrays(obj, keys) {
  const results = []

  function walk(value) {
    if (!value || typeof value !== 'object') return

    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }

    for (const [key, child] of Object.entries(value)) {
      if (keys.includes(key) && Array.isArray(child)) {
        results.push(child)
      }
      walk(child)
    }
  }

  walk(obj)
  return results
}

function extractGamePoint(entry) {
  if (!entry || typeof entry !== 'object') return null

  const candidates = [
    entry?.points,
    entry?.point,
    entry?.score,
    entry?.totalScore,
    entry?.totalPoint,
    entry?.resultPoint,
    entry?.matchPoint,
    entry?.gamePoint,
    entry?.placementPoints,
    entry?.killPoints,
    entry?.overallPoints,
    entry?.overallScore,
  ]

  for (const candidate of candidates) {
    const parsed = extractNumericValue(candidate)
    if (parsed !== null) return parsed
  }

  return null
}

function extractTotalPoint(raw) {
  if (!raw || typeof raw !== 'object') return null

  const candidates = [
    raw?.totalPoints,
    raw?.totalPoint,
    raw?.TotalPoints,
    raw?.TotalPoint,
    raw?.points,
    raw?.Points,
    raw?.score,
    raw?.Score,
    raw?.overallPoints,
    raw?.overallScore,
    raw?.resultPoint,
    raw?.teamPoints,
    raw?.teamPoint,
  ]

  for (const candidate of candidates) {
    const parsed = extractNumericValue(candidate)
    if (parsed !== null) return parsed
  }

  return null
}

function extractPerGamePoints(raw) {
  const arrayKeys = [
    'results',
    'Results',
    'matches',
    'Matches',
    'games',
    'Games',
    'rounds',
    'Rounds',
    'details',
    'Details',
  ]

  const arrays = findNestedArrays(raw, arrayKeys)
  const allPoints = []

  for (const array of arrays) {
    const points = array
      .map((entry) => extractGamePoint(entry))
      .filter((value) => value !== null)

    if (points.length > allPoints.length) {
      allPoints.splice(0, allPoints.length, ...points)
    }
  }

  return allPoints.slice(0, 6)
}

function buildScoreNote(raw) {
  const perGame = extractPerGamePoints(raw)
  const detectedTotal = extractTotalPoint(raw)

  if (perGame.length > 0) {
    const total =
      detectedTotal !== null
        ? detectedTotal
        : perGame.reduce((sum, point) => sum + point, 0)

    const detail = perGame
      .map((point, index) => `G${index + 1}:${point}`)
      .join(' / ')

    return `合計点 ${total}pt | ${detail}`
  }

  if (detectedTotal !== null) {
    return `合計点 ${detectedTotal}pt`
  }

  return ''
}

function buildDisplayItem({ scrim, isParticipating, participantCount, rawTeamData }) {
  const scrimId = pickScrimId(scrim)
  const title = pickScrimTitle(scrim)
  const scoreNote = rawTeamData ? buildScoreNote(rawTeamData) : ''
  const defaultNote = isParticipating
    ? `自チームの参加を確認しました。参加チーム数: ${participantCount}。`
    : ''

  return {
    id: String(scrimId ?? `${title}-${Math.random().toString(36).slice(2, 8)}`),
    title,
    dateLabel: formatDateLabel(pickDateLike(scrim)),
    statusLabel: isParticipating ? '参加' : '未参加',
    note: scoreNote || defaultNote,
  }
}

async function fetchTeamRatePoint() {
  try {
    const payload = await postJson(PUBLIC_TEAM_API_URL, {})
    const teams = pickFirstArray(payload)

    const target = teams.find((team) =>
      isTargetTeamName(team?.name ?? team?.Name ?? team?.teamName ?? team?.TeamName)
    )

    const rate = extractNumericValue(target?.rate ?? target?.Rate ?? 0)
    return {
      ratePoint: rate !== null ? rate : 0,
      rateUpdatedAt: formatJstDate(new Date()),
    }
  } catch (error) {
    return {
      ratePoint: 0,
      rateUpdatedAt: formatJstDate(new Date()),
    }
  }
}

export default async function handler(req, res) {
  try {
    const listUrl = buildUrl(ESCL_BASE_URL, LIST_SCRIM_ENDPOINT)
    const listPayload = await fetchJson(listUrl)
    const allScrims = sortScrimsByDateDesc(pickFirstArray(listPayload)).slice(
      0,
      MAX_SCRIMS_TO_CHECK
    )

    const analyzed = await Promise.all(
      allScrims.map(async (scrim) => {
        const scrimId = pickScrimId(scrim)

        if (!scrimId) {
          return {
            scrim,
            targetFound: false,
            participantCount: 0,
            targetRaw: null,
          }
        }

        try {
          const participantsUrl = buildUrl(ESCL_BASE_URL, GET_PARTICIPANTS_ENDPOINT, {
            scrimId,
          })

          const participantPayload = await fetchJson(participantsUrl)
          const participantCount = getParticipantCount(participantPayload)
          const targetParticipant = findTargetParticipant(participantPayload)

          return {
            scrim,
            targetFound: Boolean(targetParticipant),
            participantCount,
            targetRaw: targetParticipant?.raw ?? null,
          }
        } catch (error) {
          return {
            scrim,
            targetFound: false,
            participantCount: 0,
            targetRaw: null,
          }
        }
      })
    )

    const participating = analyzed.filter((item) => item.targetFound)
    const recent = analyzed.filter((item) => !item.targetFound)

    let items = []

    if (participating.length > 0) {
      items = participating.slice(0, MAX_RETURN_ITEMS).map((item) =>
        buildDisplayItem({
          scrim: item.scrim,
          isParticipating: true,
          participantCount: item.participantCount,
          rawTeamData: item.targetRaw,
        })
      )
    } else if (recent.length > 0) {
      items = recent.slice(0, 1).map((item) =>
        buildDisplayItem({
          scrim: item.scrim,
          isParticipating: false,
          participantCount: item.participantCount,
          rawTeamData: null,
        })
      )
    } else {
      items = [
        {
          id: 'escl-fallback',
          title: '自チームのESCLスクリム情報',
          dateLabel: '',
          statusLabel: '未参加',
          note: '',
        },
      ]
    }

    const rateInfo = await fetchTeamRatePoint()

    return res.status(200).json({
      items,
      meta: {
        targetTeamName: TARGET_TEAM_NAME,
        ratePoint: rateInfo.ratePoint,
        rateUpdatedAt: rateInfo.rateUpdatedAt,
        hasParticipation: participating.length > 0,
      },
    })
  } catch (error) {
    const rateInfo = await fetchTeamRatePoint()

    return res.status(200).json({
      items: [
        {
          id: 'escl-error',
          title: '自チームのESCLスクリム情報',
          dateLabel: '',
          statusLabel: '未参加',
          note: '',
        },
      ],
      meta: {
        targetTeamName: TARGET_TEAM_NAME,
        ratePoint: rateInfo.ratePoint,
        rateUpdatedAt: rateInfo.rateUpdatedAt,
        hasParticipation: false,
      },
    })
  }
}