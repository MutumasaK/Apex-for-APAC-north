import { Redis } from '@upstash/redis'

const TEAM_NAME = '京都ブライアンホテル'
const API_BASE = 'https://core-api-prod.escl.workers.dev'

const ENDPOINTS = {
  listScrim: `${API_BASE}/public.v1.PublicScrimService/ListScrim`,
  getCheckInsByScrimId: `${API_BASE}/public.v1.PublicCheckInService/GetCheckInsByScrimId`,
  getParticipantsByScrimId: `${API_BASE}/public.v1.PublicParticipantService/GetParticipantsByScrimId`,
  getGroups: `${API_BASE}/public.v1.PublicGroupService/GetGroups`,
  getTeams: `${API_BASE}/public.v1.PublicTeamService/GetTeams`,
}

const hasRedisEnv =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

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
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
  }
}

export async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload ?? {}),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`)
  }

  return response.json()
}

export function toJstDate(date = new Date()) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
}

export function getJstDateParts(date = new Date()) {
  const jst = toJstDate(date)
  const year = jst.getUTCFullYear()
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  const hour = String(jst.getUTCHours()).padStart(2, '0')
  const minute = String(jst.getUTCMinutes()).padStart(2, '0')

  return { year, month, day, hour, minute }
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
  const jst = toJstDate(date)
  return jst.getUTCHours() >= 21
}

export function isSameJstDayFromUnixSec(unixSec, baseDate = new Date()) {
  if (!unixSec) return false

  const target = new Date((unixSec + 9 * 60 * 60) * 1000)
  const base = toJstDate(baseDate)

  return (
    target.getUTCFullYear() === base.getUTCFullYear() &&
    target.getUTCMonth() === base.getUTCMonth() &&
    target.getUTCDate() === base.getUTCDate()
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
  const candidates = scrims.filter((scrim) => {
    return (
      scrim?.type === 'SCRIM_TYPE_CL' &&
      isSameJstDayFromUnixSec(scrim?.startAt, now)
    )
  })

  if (!candidates.length) return null

  const sorted = [...candidates].sort((a, b) => {
    const aFinished = a?.finished ? 1 : 0
    const bFinished = b?.finished ? 1 : 0

    if (aFinished !== bFinished) return aFinished - bFinished
    return Number(b?.startAt ?? 0) - Number(a?.startAt ?? 0)
  })

  return sorted[0]
}

export function matchTeamName(name) {
  if (!name || typeof name !== 'string') return false
  return name.trim() === TEAM_NAME || name.includes(TEAM_NAME)
}

export function buildStatusNote({ status, groupLabel, scrimName }) {
  if (status === '未取得') {
    return '当日のESCL参加状況を取得できませんでした。'
  }

  if (status === '未参加') {
    return '当日のチェックイン一覧に自チーム名が見つかりませんでした。'
  }

  if (groupLabel) {
    return `${scrimName} / ${groupLabel}`
  }

  return `${scrimName} / グループ未確定`
}

export function buildStorageKey(date = new Date()) {
  return `escl-status:${getJstDateKey(date)}`
}

export function isRedisEnabled() {
  return !!redis
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
          statusLabel: '未取得',
          note: '当日のCLスクリムを自動選定できませんでした。',
        },
      ],
      meta: {
        teamName: TEAM_NAME,
        ratePoint: 0,
        rateUpdatedAt: updatedAtLabel,
      },
      status: '未取得',
      group: null,
      scrimId: null,
      scrimName: null,
      updatedAtLabel,
      source: 'live',
    }
  }

  const scrimId = targetScrim.id
  const scrimName = `CLスクリム#${scrimId}`

  const [checkinsPayload, participantsPayload, groupsPayload, teamsPayload] =
    await Promise.allSettled([
      postJson(ENDPOINTS.getCheckInsByScrimId, { scrimId }),
      postJson(ENDPOINTS.getParticipantsByScrimId, { scrimId }),
      postJson(ENDPOINTS.getGroups, { scrimId }),
      postJson(ENDPOINTS.getTeams, {}),
    ])

  const checkins =
    checkinsPayload.status === 'fulfilled'
      ? normalizeCheckins(checkinsPayload.value)
      : []

  const participants =
    participantsPayload.status === 'fulfilled'
      ? normalizeParticipants(participantsPayload.value)
      : []

  const groups =
    groupsPayload.status === 'fulfilled'
      ? normalizeGroups(groupsPayload.value)
      : []

  const teams =
    teamsPayload.status === 'fulfilled'
      ? normalizeTeams(teamsPayload.value)
      : []

  const myTeamRate = teams.find((team) => matchTeamName(team?.name))
  const ratePoint = Number(myTeamRate?.rate ?? 0)

  const checkedIn = checkins.some((checkin) => matchTeamName(checkin?.team?.name))

  let status = '未参加'
  let groupLabel = null

  if (checkinsPayload.status !== 'fulfilled') {
    status = '未取得'
  } else if (checkedIn) {
    status = '参加'

    const myParticipant = participants.find((participant) =>
      matchTeamName(participant?.team?.name)
    )

    if (myParticipant?.groupId && groups.length > 0) {
      const matchedGroup = groups.find(
        (group) => Number(group?.id) === Number(myParticipant.groupId)
      )

      if (matchedGroup?.groupNum != null) {
        groupLabel = `G${matchedGroup.groupNum}`
      }
    }
  }

  const note = buildStatusNote({
    status,
    groupLabel,
    scrimName,
  })

  return {
    date: getJstDateKey(now),
    items: [
      {
        id: `scrim-${scrimId}`,
        title: '自チームのESCLスクリム情報',
        dateLabel: groupLabel ? `グループ: ${groupLabel}` : '',
        statusLabel: status,
        note,
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

  const key = buildStorageKey(now)
  const value = await redis.get(key)
  return value
}