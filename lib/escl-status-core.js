import { Redis } from '@upstash/redis'

const TEAM_NAME = process.env.ESCL_TARGET_TEAM_NAME || '京都ブライアンホテル'
const API_BASE = 'https://core-api-prod.escl.workers.dev'
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

const ENDPOINTS = {
  listScrim: `${API_BASE}/public.v1.PublicScrimService/ListScrim`,
  getCheckInsByScrimId: `${API_BASE}/public.v1.PublicCheckInService/GetCheckInsByScrimId`,
  getParticipantsByScrimId: `${API_BASE}/public.v1.PublicParticipantService/GetParticipantsByScrimId`,
  getGroups: `${API_BASE}/public.v1.PublicGroupService/GetGroups`,
  getTeams: `${API_BASE}/public.v1.PublicTeamService/GetTeams`,
}

const hasRedisEnv =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN)

export const redis = hasRedisEnv
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

export function buildHeaders() {
  return {
    Accept: '*/*',
    'Content-Type': 'application/json',
    Origin: 'https://fightnt.escl.co.jp',
    Referer: 'https://fightnt.escl.co.jp/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  }
}

export async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload ?? {}),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`)
  }

  return response.json()
}

export function toJstDate(date = new Date()) {
  return new Date(date.getTime() + JST_OFFSET_MS)
}

export function getJstDateParts(date = new Date()) {
  const jst = toJstDate(date)

  return {
    year: jst.getUTCFullYear(),
    month: String(jst.getUTCMonth() + 1).padStart(2, '0'),
    day: String(jst.getUTCDate()).padStart(2, '0'),
    hour: String(jst.getUTCHours()).padStart(2, '0'),
    minute: String(jst.getUTCMinutes()).padStart(2, '0'),
  }
}

export function getJstDateKey(date = new Date()) {
  const { year, month, day } = getJstDateParts(date)
  return `${year}-${month}-${day}`
}

export function formatJst(date = new Date()) {
  const { year, month, day, hour, minute } = getJstDateParts(date)
  return `${year}/${month}/${day} ${hour}:${minute} JST`
}

export function isAfter21Jst(date = new Date()) {
  return Number(getJstDateParts(date).hour) >= 21
}

export function isSameJstDayFromUnixSec(unixSec, baseDate = new Date()) {
  if (!unixSec) return false

  const target = new Date(Number(unixSec) * 1000)
  const targetParts = getJstDateParts(target)
  const baseParts = getJstDateParts(baseDate)

  return (
    targetParts.year === baseParts.year &&
    targetParts.month === baseParts.month &&
    targetParts.day === baseParts.day
  )
}

export function normalizeListScrims(payload) {
  if (Array.isArray(payload?.scrims)) return payload.scrims
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

export function normalizeCheckins(payload) {
  if (Array.isArray(payload?.checkins)) return payload.checkins
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

export function normalizeParticipants(payload) {
  if (Array.isArray(payload?.participants)) return payload.participants
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

export function normalizeGroups(payload) {
  if (Array.isArray(payload?.groups)) return payload.groups
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

export function normalizeTeams(payload) {
  if (Array.isArray(payload?.teams)) return payload.teams
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload)) return payload
  return []
}

export function pickTodayClScrim(scrims, now = new Date()) {
  const candidates = scrims.filter(
    (scrim) => scrim?.type === 'SCRIM_TYPE_CL' && isSameJstDayFromUnixSec(scrim?.startAt, now)
  )

  if (candidates.length === 0) {
    return null
  }

  return [...candidates].sort((a, b) => {
    const aFinished = a?.finished ? 1 : 0
    const bFinished = b?.finished ? 1 : 0

    if (aFinished !== bFinished) {
      return aFinished - bFinished
    }

    return Number(b?.startAt ?? 0) - Number(a?.startAt ?? 0)
  })[0]
}

function normalizeTeamName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

export function matchTeamName(name) {
  const normalizedTarget = normalizeTeamName(TEAM_NAME)
  const normalizedName = normalizeTeamName(name)

  if (!normalizedName) return false
  return normalizedName === normalizedTarget || normalizedName.includes(normalizedTarget)
}

export function buildStatusNote({ status, groupLabel, scrimName }) {
  if (status === '未確認') {
    return '本日のESCLスクリム情報をまだ確認できていません。'
  }

  if (status === '未参加') {
    return '本日のチェックイン一覧に自チームは見つかりませんでした。'
  }

  if (groupLabel) {
    return `${scrimName} / ${groupLabel}`
  }

  return `${scrimName} / グループ確認中`
}

export function buildStorageKey(date = new Date()) {
  return `escl-status:${getJstDateKey(date)}`
}

export function isRedisEnabled() {
  return Boolean(redis)
}

export async function computeEsclStatus(now = new Date()) {
  const updatedAtLabel = `最終確認: ${formatJst(now)}`

  const listScrimPayload = await postJson(ENDPOINTS.listScrim, {})
  const scrims = normalizeListScrims(listScrimPayload)
  const targetScrim = pickTodayClScrim(scrims, now)

  if (!targetScrim) {
    return {
      date: getJstDateKey(now),
      items: [
        {
          id: 'scrim-not-found',
          title: '自チームのESCLスクリム情報',
          dateLabel: '',
          statusLabel: '未確認',
          note: '本日のCLスクリムを一覧から確認できませんでした。',
        },
      ],
      meta: {
        teamName: TEAM_NAME,
        ratePoint: 0,
        rateUpdatedAt: updatedAtLabel,
      },
      status: '未確認',
      group: null,
      scrimId: null,
      scrimName: null,
      updatedAtLabel,
      source: 'live',
    }
  }

  const scrimId = targetScrim.id
  const scrimName = `CLスクリム #${scrimId}`

  const [checkinsResult, participantsResult, groupsResult, teamsResult] = await Promise.allSettled([
    postJson(ENDPOINTS.getCheckInsByScrimId, { scrimId }),
    postJson(ENDPOINTS.getParticipantsByScrimId, { scrimId }),
    postJson(ENDPOINTS.getGroups, { scrimId }),
    postJson(ENDPOINTS.getTeams, {}),
  ])

  const checkins =
    checkinsResult.status === 'fulfilled' ? normalizeCheckins(checkinsResult.value) : []
  const participants =
    participantsResult.status === 'fulfilled'
      ? normalizeParticipants(participantsResult.value)
      : []
  const groups = groupsResult.status === 'fulfilled' ? normalizeGroups(groupsResult.value) : []
  const teams = teamsResult.status === 'fulfilled' ? normalizeTeams(teamsResult.value) : []

  const team = teams.find((item) => matchTeamName(item?.name))
  const ratePoint = Number(team?.rate ?? 0)
  const checkedIn = checkins.some((item) => matchTeamName(item?.team?.name ?? item?.name))

  let status = '未参加'
  let groupLabel = null

  if (checkinsResult.status !== 'fulfilled') {
    status = '未確認'
  } else if (checkedIn) {
    status = '参加'

    const participant = participants.find((item) => matchTeamName(item?.team?.name ?? item?.name))
    if (participant?.groupId != null) {
      const matchedGroup = groups.find((group) => Number(group?.id) === Number(participant.groupId))

      if (matchedGroup?.groupNum != null) {
        groupLabel = `G${matchedGroup.groupNum}`
      }
    }
  }

  return {
    date: getJstDateKey(now),
    items: [
      {
        id: `scrim-${scrimId}`,
        title: '自チームのESCLスクリム情報',
        dateLabel: groupLabel ? `グループ ${groupLabel}` : '',
        statusLabel: status,
        note: buildStatusNote({ status, groupLabel, scrimName }),
      },
    ],
    meta: {
      teamName: TEAM_NAME,
      ratePoint,
      rateUpdatedAt: updatedAtLabel,
    },
    status,
    group: groupLabel,
    scrimId,
    scrimName,
    updatedAtLabel,
    source: 'live',
  }
}

export async function saveEsclStatus(payload, now = new Date()) {
  if (!redis) {
    return {
      ...payload,
      source: 'live',
      savedAt: null,
    }
  }

  const key = buildStorageKey(now)
  const value = {
    ...payload,
    source: 'stored',
    savedAt: formatJst(now),
  }

  await redis.set(key, value)
  return value
}

export async function readEsclStatus(now = new Date()) {
  if (!redis) return null
  return redis.get(buildStorageKey(now))
}
