import { Redis } from '@upstash/redis'
import { DEFAULT_TEAM_NAME } from './site'

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
  const source = Array.isArray(payload?.teams)
    ? payload.teams
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : []

  return source
    .map((item) => ({
      teamId: Number(item?.teamId ?? item?.id ?? item?.team?.id ?? 0),
      name: String(item?.name ?? item?.teamName ?? item?.team?.name ?? '').trim(),
      rate: Number(
        item?.rate ??
          item?.ratePoint ??
          item?.rating ??
          item?.teamRate ??
          item?.teamRatePoint ??
          item?.team?.rate ??
          item?.stats?.rate ??
          0
      ),
    }))
    .filter((item) => item.teamId > 0 && item.name)
}

function normalizeTeamName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase()
}

function extractNameFromRecord(record) {
  return record?.team?.name ?? record?.name ?? record?.teamName ?? ''
}

export function slugifyTeamName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildTeamSlug(team) {
  if (!team?.name || !team?.teamId) return ''
  return `${slugifyTeamName(team.name)}-${team.teamId}`
}

function parseTeamSlug(teamSlug) {
  const match = String(teamSlug ?? '').match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}

export function pickTodayClScrim(scrims, now = new Date()) {
  const candidates = scrims.filter(
    (scrim) => scrim?.type === 'SCRIM_TYPE_CL' && isSameJstDayFromUnixSec(scrim?.startAt, now)
  )

  if (candidates.length === 0) {
    return null
  }

  return [...candidates].sort((a, b) => Number(b?.startAt ?? 0) - Number(a?.startAt ?? 0))[0]
}

export function pickRecentClScrims(scrims, limit = 3) {
  return [...scrims]
    .filter((scrim) => scrim?.type === 'SCRIM_TYPE_CL')
    .sort((a, b) => Number(b?.startAt ?? 0) - Number(a?.startAt ?? 0))
    .slice(0, limit)
}

export function buildStatusNote({ status, groupLabel, scrimName }) {
  if (status === '確認中') {
    return '本日の ESCL スクリム情報を確認しています。'
  }

  if (status === '未参加') {
    return `${scrimName} へのチェックインは確認できませんでした。`
  }

  if (groupLabel) {
    return `${scrimName} / ${groupLabel}`
  }

  return `${scrimName} / 参加を確認しました`
}

function findTeamByIdentifier(teams, { teamName, teamId, teamSlug }) {
  const slugTeamId = parseTeamSlug(teamSlug)
  const requestedTeamId = Number(teamId ?? slugTeamId ?? 0)

  if (requestedTeamId > 0) {
    const byId = teams.find((team) => Number(team.teamId) === requestedTeamId)
    if (byId) return byId
  }

  const normalizedTarget = normalizeTeamName(teamName || '')
  if (normalizedTarget) {
    const exact = teams.find((team) => normalizeTeamName(team.name) === normalizedTarget)
    if (exact) return exact

    const partial = teams.find((team) => normalizeTeamName(team.name).includes(normalizedTarget))
    if (partial) return partial
  }

  return teams.find((team) => normalizeTeamName(team.name) === normalizeTeamName(DEFAULT_TEAM_NAME)) ?? null
}

function formatScrimDateLabel(startAt) {
  if (!startAt) return ''
  const date = new Date(Number(startAt) * 1000)
  return formatJst(date)
}

async function getScrimTeamSnapshot(scrim, team) {
  const scrimId = Number(scrim?.id ?? 0)
  const scrimName = String(scrim?.name ?? `CLスクリム #${scrimId}`)

  if (!scrimId || !team) {
    return {
      id: `scrim-${scrimId || 'unknown'}`,
      title: scrimName,
      dateLabel: formatScrimDateLabel(scrim?.startAt),
      statusLabel: '確認中',
      note: 'チーム情報を確認できませんでした。',
      groupLabel: null,
      scrimId,
    }
  }

  const [checkinsResult, participantsResult, groupsResult] = await Promise.allSettled([
    postJson(ENDPOINTS.getCheckInsByScrimId, { scrimId }),
    postJson(ENDPOINTS.getParticipantsByScrimId, { scrimId }),
    postJson(ENDPOINTS.getGroups, { scrimId }),
  ])

  if (checkinsResult.status !== 'fulfilled') {
    return {
      id: `scrim-${scrimId}`,
      title: scrimName,
      dateLabel: formatScrimDateLabel(scrim?.startAt),
      statusLabel: '確認中',
      note: '参加状況の取得に失敗しました。',
      groupLabel: null,
      scrimId,
    }
  }

  const checkins = normalizeCheckins(checkinsResult.value)
  const participants =
    participantsResult.status === 'fulfilled' ? normalizeParticipants(participantsResult.value) : []
  const groups = groupsResult.status === 'fulfilled' ? normalizeGroups(groupsResult.value) : []

  const checkedIn = checkins.some(
    (item) =>
      Number(item?.team?.id ?? item?.teamId ?? 0) === Number(team.teamId) ||
      normalizeTeamName(extractNameFromRecord(item)) === normalizeTeamName(team.name)
  )

  let groupLabel = null
  if (checkedIn) {
    const participant = participants.find(
      (item) =>
        Number(item?.team?.id ?? item?.teamId ?? 0) === Number(team.teamId) ||
        normalizeTeamName(extractNameFromRecord(item)) === normalizeTeamName(team.name)
    )

    if (participant?.groupId != null) {
      const matchedGroup = groups.find((group) => Number(group?.id) === Number(participant.groupId))
      if (matchedGroup?.groupNum != null) {
        groupLabel = `G${matchedGroup.groupNum}`
      }
    }
  }

  const statusLabel = checkedIn ? '参加' : '未参加'

  return {
    id: `scrim-${scrimId}`,
    title: scrimName,
    dateLabel: formatScrimDateLabel(scrim?.startAt),
    statusLabel,
    note: buildStatusNote({ status: statusLabel, groupLabel, scrimName }),
    groupLabel,
    scrimId,
  }
}

export async function searchEsclTeams(query = '') {
  const teams = normalizeTeams(await postJson(ENDPOINTS.getTeams, {}))
  const normalizedQuery = normalizeTeamName(query)

  const filtered = normalizedQuery
    ? teams.filter((team) => normalizeTeamName(team.name).includes(normalizedQuery))
    : teams

  return filtered
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
    .map((team) => ({
      ...team,
      slug: buildTeamSlug(team),
    }))
}

export async function computeEsclTeamStatus({ teamName, teamId, teamSlug } = {}) {
  const updatedAtLabel = `最終確認: ${formatJst(new Date())}`
  const listScrimPayload = await postJson(ENDPOINTS.listScrim, {})
  const scrims = normalizeListScrims(listScrimPayload)
  const teams = normalizeTeams(await postJson(ENDPOINTS.getTeams, {}))
  const selectedTeam = findTeamByIdentifier(teams, { teamName, teamId, teamSlug })

  if (!selectedTeam) {
    return {
      selectedTeam: {
        teamId: 0,
        name: teamName || DEFAULT_TEAM_NAME,
        rate: 0,
      },
      todayStatus: {
        id: 'scrim-pending',
        title: '本日の ESCL スクリム情報',
        dateLabel: '',
        statusLabel: '確認中',
        note: 'チーム情報を取得できませんでした。',
      },
      recentScrims: [],
      updatedAtLabel,
      source: 'error',
    }
  }

  const todayScrim = pickTodayClScrim(scrims)
  const recentScrims = pickRecentClScrims(scrims, 3)

  const [todayStatus, recentStatuses] = await Promise.all([
    todayScrim
      ? getScrimTeamSnapshot(todayScrim, selectedTeam)
      : Promise.resolve({
          id: 'scrim-none',
          title: '本日の ESCL スクリム情報',
          dateLabel: '',
          statusLabel: '未開催',
          note: '本日対象の CL スクリムは見つかりませんでした。',
        }),
    Promise.all(recentScrims.map((scrim) => getScrimTeamSnapshot(scrim, selectedTeam))),
  ])

  return {
    selectedTeam,
    todayStatus,
    recentScrims: recentStatuses,
    updatedAtLabel,
    source: 'live',
  }
}

export function buildStorageKey(date = new Date()) {
  return `escl-status:${getJstDateKey(date)}`
}

export function isRedisEnabled() {
  return Boolean(redis)
}

export async function computeEsclStatus(now = new Date()) {
  const result = await computeEsclTeamStatus({ teamName: DEFAULT_TEAM_NAME })

  return {
    date: getJstDateKey(now),
    items: [result.todayStatus],
    meta: {
      teamName: result.selectedTeam.name,
      ratePoint: result.selectedTeam.rate,
      rateUpdatedAt: result.updatedAtLabel,
    },
    status: result.todayStatus.statusLabel,
    group: result.todayStatus.groupLabel ?? null,
    scrimId: result.todayStatus.scrimId ?? null,
    scrimName: result.todayStatus.title,
    updatedAtLabel: result.updatedAtLabel,
    selectedTeam: result.selectedTeam,
    recentScrims: result.recentScrims,
    source: result.source,
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
