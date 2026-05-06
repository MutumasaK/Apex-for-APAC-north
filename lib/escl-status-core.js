import { Redis } from '@upstash/redis'
import * as cheerio from 'cheerio'
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

const ESCL_ORIGIN = 'https://fightnt.escl.co.jp'
const FALLBACK_SCRIM_UUID = 'a2fed046-6427-432b-8852-dcc7b0981817'

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
  return (
    record?.team?.name ??
    record?.team?.teamName ??
    record?.name ??
    record?.teamName ??
    ''
  )
}

function extractTeamIdFromRecord(record) {
  return Number(record?.team?.id ?? record?.teamId ?? record?.team?.teamId ?? 0)
}

function extractTeamSlugFromRecord(record) {
  return String(record?.team?.slug ?? record?.teamSlug ?? '').trim()
}

function getSlugBase(slug) {
  return String(slug ?? '').replace(/-\d+$/g, '').trim().toLowerCase()
}

export function slugifyTeamName(name) {
  if (normalizeTeamName(name) === normalizeTeamName(DEFAULT_TEAM_NAME)) {
    return 'kyoto-brian-hotel'
  }
  if (normalizeTeamName(name) === normalizeTeamName('ペンギン急便')) {
    return 'penguin-kyubin'
  }

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

export function pickSelectedClScrim(scrims, now = new Date()) {
  const clScrims = [...scrims].filter((scrim) => scrim?.type === 'SCRIM_TYPE_CL')
  const todayScrim = pickTodayClScrim(clScrims, now)

  if (todayScrim) return todayScrim

  const nowSec = Math.floor(now.getTime() / 1000)
  const upcoming = clScrims
    .filter((scrim) => Number(scrim?.startAt ?? 0) >= nowSec)
    .sort((a, b) => Number(a?.startAt ?? 0) - Number(b?.startAt ?? 0))[0]

  return upcoming ?? pickRecentClScrims(clScrims, 1)[0] ?? null
}

function getScrimUuid(scrim) {
  return String(scrim?.uuid ?? scrim?.scrimUuid ?? scrim?.id ?? FALLBACK_SCRIM_UUID)
}

function getScrimTitle(scrim, scrimId) {
  return String(scrim?.name ?? `CLスクリム #${scrim?.count ?? scrimId ?? ''}`).trim()
}

function getScrimDetailUrl(scrim) {
  return `${ESCL_ORIGIN}/scrims/${getScrimUuid(scrim)}`
}

function isEntryOpen(scrim, now = new Date()) {
  const nowSec = Math.floor(now.getTime() / 1000)
  const start = Number(scrim?.applicationStartAt ?? 0)
  const end = Number(scrim?.applicationEndAt ?? 0)

  return start > 0 && end > 0 && nowSec >= start && nowSec <= end && scrim?.finished !== true
}

async function fetchScrimDetailText(detailUrl) {
  if (!detailUrl) return null

  try {
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Referer: 'https://fightnt.escl.co.jp/',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    $('script, style, noscript').remove()
    return normalizeTeamName($.root().text())
  } catch {
    return null
  }
}

function isTeamPresentOnScrimPage(normalizedPageText, team) {
  if (!normalizedPageText || !team) return false

  const candidates = [
    normalizeTeamName(team.name),
    normalizeTeamName(team.teamSlug),
    normalizeTeamName(slugifyTeamName(team.name)),
  ].filter(Boolean)

  return candidates.some((candidate) => normalizedPageText.includes(candidate))
}

function buildEntryStatus({ scrim, team, participants, participantsAvailable }) {
  if (!participantsAvailable || !team) {
    return { entryStatus: 'unknown', entryStatusLabel: 'データ確認中' }
  }

  const targetTeamId = Number(team.teamId)
  const targetTeamName = normalizeTeamName(team.name)
  const targetTeamSlugBase = getSlugBase(team.teamSlug)
  const targetTeamNameSlug = slugifyTeamName(team.name)

  const joined = participants.some((item) => {
    const itemTeamId = extractTeamIdFromRecord(item)
    if (itemTeamId > 0 && itemTeamId === targetTeamId) {
      return true
    }

    const itemTeamSlugBase = getSlugBase(extractTeamSlugFromRecord(item))
    if (itemTeamSlugBase && targetTeamSlugBase && itemTeamSlugBase === targetTeamSlugBase) {
      return true
    }

    const itemName = normalizeTeamName(extractNameFromRecord(item))
    if (itemName && itemName === targetTeamName) {
      return true
    }

    const itemNameSlug = slugifyTeamName(extractNameFromRecord(item))
    return itemNameSlug && itemNameSlug === targetTeamNameSlug
  })

  return joined
    ? { entryStatus: 'joined', entryStatusLabel: '参加' }
    : { entryStatus: 'notJoined', entryStatusLabel: '未参加' }
}

function buildCheckinStatus({ checkedIn, checkinsAvailable, scrim }) {
  const nowSec = Math.floor(Date.now() / 1000)
  const checkinStartAt = Number(scrim?.checkinStartAt ?? 0)

  if (checkinStartAt > 0 && nowSec < checkinStartAt) {
    return { checkinStatus: 'unknown', checkinStatusLabel: 'データ確認中' }
  }

  if (!checkinsAvailable) {
    return { checkinStatus: 'unknown', checkinStatusLabel: 'データ確認中' }
  }

  return checkedIn
    ? { checkinStatus: 'checkedIn', checkinStatusLabel: 'チェックイン完了' }
    : { checkinStatus: 'notCheckedIn', checkinStatusLabel: 'チェックイン未完了' }
}

export function buildStatusNote({ entryStatusLabel, checkinStatusLabel, groupLabel, scrimName }) {
  if (entryStatusLabel === 'データ確認中') {
    return '本日の ESCL スクリム情報を確認しています。'
  }

  if (groupLabel) {
    return `${scrimName} / ${groupLabel} / ${checkinStatusLabel}`
  }

  return `${scrimName} / ${entryStatusLabel} / ${checkinStatusLabel}`
}

function findTeamByIdentifier(teams, { teamName, teamId, teamSlug }) {
  const slugTeamId = parseTeamSlug(teamSlug)
  const requestedTeamId = Number(teamId ?? slugTeamId ?? 0)
  const normalizedSlug = String(teamSlug ?? '').trim().toLowerCase()

  if (requestedTeamId > 0) {
    const byId = teams.find((team) => Number(team.teamId) === requestedTeamId)
    if (byId) return byId
  }

  if (normalizedSlug) {
    const bySlug = teams.find((team) => buildTeamSlug(team) === normalizedSlug || slugifyTeamName(team.name) === normalizedSlug)
    if (bySlug) return bySlug
  }

  const normalizedTarget = normalizeTeamName(teamName || '')
  if (normalizedTarget) {
    const exact = teams.find((team) => normalizeTeamName(team.name) === normalizedTarget)
    if (exact) return exact

    const partial = teams.find((team) => normalizeTeamName(team.name).includes(normalizedTarget))
    if (partial) return partial

    return null
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
  const scrimName = getScrimTitle(scrim, scrimId)
  const scrimUuid = getScrimUuid(scrim)
  const detailUrl = getScrimDetailUrl(scrim)
  const baseSnapshot = {
    id: scrimUuid,
    title: scrimName,
    detailUrl,
    dateLabel: formatScrimDateLabel(scrim?.startAt),
    rate: Number(team?.rate ?? 0),
    groupLabel: null,
    scrimId,
    scrimUuid,
  }

  if (!team) {
    return {
      ...baseSnapshot,
      entryStatus: 'unknown',
      entryStatusLabel: 'データ確認中',
      checkinStatus: 'unknown',
      checkinStatusLabel: 'データ確認中',
      statusLabel: 'データ確認中',
      note: '本日のスクリム情報を確認しています。',
    }
  }

  const [checkinsResult, participantsResult, groupsResult] = scrimId
    ? await Promise.allSettled([
        postJson(ENDPOINTS.getCheckInsByScrimId, { scrimId }),
        postJson(ENDPOINTS.getParticipantsByScrimId, { scrimId }),
        postJson(ENDPOINTS.getGroups, { scrimId }),
      ])
    : [
        { status: 'rejected' },
        { status: 'rejected' },
        { status: 'rejected' },
      ]


  const checkins = checkinsResult.status === 'fulfilled' ? normalizeCheckins(checkinsResult.value) : []
  const participants =
    participantsResult.status === 'fulfilled' ? normalizeParticipants(participantsResult.value) : []
  const groups = groupsResult.status === 'fulfilled' ? normalizeGroups(groupsResult.value) : []
  const detailPageText = await fetchScrimDetailText(detailUrl)
  const oneTeamOnPage = detailPageText ? isTeamPresentOnScrimPage(detailPageText, team) : null

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

  const entry = buildEntryStatus({
    scrim,
    team,
    participants,
    participantsAvailable: participantsResult.status === 'fulfilled',
  })

  const normalizedEntry =
    oneTeamOnPage === true
      ? { entryStatus: 'joined', entryStatusLabel: '参加' }
      : oneTeamOnPage === false
        ? { entryStatus: 'notJoined', entryStatusLabel: '未参加' }
        : entry

  const checkin = buildCheckinStatus({
    checkedIn,
    checkinsAvailable: checkinsResult.status === 'fulfilled',
    scrim,
  })

  return {
    ...baseSnapshot,
    ...normalizedEntry,
    ...checkin,
    statusLabel: normalizedEntry.entryStatusLabel,
    note: buildStatusNote({
      entryStatusLabel: normalizedEntry.entryStatusLabel,
      checkinStatusLabel: checkin.checkinStatusLabel,
      groupLabel,
      scrimName,
    }),
    groupLabel,
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
  const selectedTeamWithSlug = selectedTeam
    ? {
        ...selectedTeam,
        teamName: selectedTeam.name,
        teamSlug: buildTeamSlug(selectedTeam),
      }
    : null
  const publicSelectedTeam = selectedTeamWithSlug
    ? {
        teamId: selectedTeamWithSlug.teamId,
        teamName: selectedTeamWithSlug.teamName,
        teamSlug: selectedTeamWithSlug.teamSlug,
      }
    : null

  if (!selectedTeamWithSlug) {
    return {
      selectedTeam: {
        teamId: 0,
        teamName: teamName || DEFAULT_TEAM_NAME,
        teamSlug: '',
      },
      selectedScrim: {
        id: FALLBACK_SCRIM_UUID,
        title: '本日の ESCL スクリム情報',
        detailUrl: `${ESCL_ORIGIN}/scrims/${FALLBACK_SCRIM_UUID}`,
        dateLabel: '',
        entryStatus: 'unknown',
        entryStatusLabel: 'データ確認中',
        checkinStatus: 'unknown',
        checkinStatusLabel: 'データ確認中',
        statusLabel: 'データ確認中',
        rate: 0,
        note: '本日のスクリム情報を確認しています。',
      },
      todayStatus: {
        id: FALLBACK_SCRIM_UUID,
        title: '本日の ESCL スクリム情報',
        detailUrl: `${ESCL_ORIGIN}/scrims/${FALLBACK_SCRIM_UUID}`,
        dateLabel: '',
        entryStatus: 'unknown',
        entryStatusLabel: 'データ確認中',
        checkinStatus: 'unknown',
        checkinStatusLabel: 'データ確認中',
        statusLabel: 'データ確認中',
        rate: 0,
        note: '本日のスクリム情報を確認しています。',
      },
      recentScrims: [],
      updatedAtLabel,
      source: 'error',
    }
  }

  const selectedScrimSource = pickSelectedClScrim(scrims)
  const recentScrims = pickRecentClScrims(scrims, 3)

  const [todayStatus, recentStatuses] = await Promise.all([
    selectedScrimSource
      ? getScrimTeamSnapshot(selectedScrimSource, selectedTeamWithSlug)
      : Promise.resolve({
          id: FALLBACK_SCRIM_UUID,
          title: '本日の ESCL スクリム情報',
          detailUrl: `${ESCL_ORIGIN}/scrims/${FALLBACK_SCRIM_UUID}`,
          dateLabel: '',
          entryStatus: 'unknown',
          entryStatusLabel: 'データ確認中',
          checkinStatus: 'unknown',
          checkinStatusLabel: 'データ確認中',
          statusLabel: 'データ確認中',
          rate: selectedTeamWithSlug.rate,
          note: '本日のスクリム情報を確認しています。',
        }),
    Promise.all(recentScrims.map((scrim) => getScrimTeamSnapshot(scrim, selectedTeamWithSlug))),
  ])
  todayStatus.updatedAt = updatedAtLabel

  return {
    selectedTeam: publicSelectedTeam,
    selectedScrim: todayStatus,
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
    selectedScrim: result.selectedScrim,
    scrims: result.recentScrims,
    items: [result.selectedScrim],
    meta: {
      teamName: result.selectedTeam.teamName,
      ratePoint: result.selectedScrim.rate,
      rateUpdatedAt: result.updatedAtLabel,
    },
    status: result.selectedScrim.entryStatusLabel,
    group: result.selectedScrim.groupLabel ?? null,
    scrimId: result.selectedScrim.scrimId ?? null,
    scrimName: result.selectedScrim.title,
    updatedAtLabel: result.updatedAtLabel,
    updatedAt: result.updatedAtLabel,
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
