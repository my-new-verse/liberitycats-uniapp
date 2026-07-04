import { getImageUrl } from './index'

export type AvatarScene = 'chat' | 'member' | 'room'

const DEFAULT_AVATAR_URL = '/static/images/default_avatar.png'
const AVATAR_MEMORY_CACHE_MAX = 200
const AVATAR_SIZE_MAP: Record<AvatarScene, number> = {
  chat: 80,
  member: 96,
  room: 112,
}

const avatarUrlCache = new Map<string, string>()
const avatarStyleCache = new Map<string, Record<string, string>>()
const levelBadgeUrlCache = new Map<number, string>()
const levelBadgeStyleCache = new Map<number, Record<string, string>>()
// 基于 member_id 的头像缓存，避免 API 重新获取后重复加载
const memberAvatarCache = new Map<number, string>()

type AvatarCacheStats = {
  avatarUrlEntries: number
  avatarStyleEntries: number
  levelBadgeUrlEntries: number
  levelBadgeStyleEntries: number
}

const stripUrlQueryAndHash = (url: string) => {
  if (!url) return ''
  return url.split('#')[0].split('?')[0]
}

const touchLruCache = <T>(cache: Map<string, T>, key: string, value: T) => {
  if (cache.has(key)) {
    cache.delete(key)
  }
  cache.set(key, value)

  if (cache.size <= AVATAR_MEMORY_CACHE_MAX) return

  const oldestKey = cache.keys().next().value
  if (typeof oldestKey === 'string') {
    cache.delete(oldestKey)
  }
}

const getAvatarSceneSize = (scene: AvatarScene) => {
  return AVATAR_SIZE_MAP[scene] || AVATAR_SIZE_MAP.chat
}

const buildAvatarResizeUrl = (url: string, scene: AvatarScene) => {
  if (!url) return DEFAULT_AVATAR_URL

  const imageExtRegex = /\.(jpg|jpeg|png|webp)($|\?)/i
  const matchResult = url.match(imageExtRegex)
  if (!matchResult) return url

  const ext = matchResult[1].toLowerCase()
  const size = getAvatarSceneSize(scene)
  const baseUrl = stripUrlQueryAndHash(url)

  return `${baseUrl}?x-oss-process=image/resize,w_${size},h_${size},m_fill/format,${ext}`
}

const createAvatarCacheKey = (source: string, scene: AvatarScene) => {
  return `${scene}:${stripUrlQueryAndHash(source)}`
}

const normalizeAvatarUrl = (source: string, scene: AvatarScene) => {
  if (!source) return DEFAULT_AVATAR_URL
  const normalizedUrl = getImageUrl(stripUrlQueryAndHash(source))
  return buildAvatarResizeUrl(normalizedUrl, scene)
}

export const isDefaultAvatarSource = (source: string) => !source.trim()

/** 根据 member_id 获取缓存的头像 URL（避免重复加载） */
export const getCachedMemberAvatar = (
  memberId: number | undefined,
  source: string,
  scene: AvatarScene = 'member',
) => {
  if (!memberId) return getCachedAvatarUrl(source, scene)
  const cached = memberAvatarCache.get(memberId)
  if (cached) return cached
  const url = getCachedAvatarUrl(source, scene)
  touchLruCache(memberAvatarCache, String(memberId), url)
  return url
}

/** 批量缓存成员头像（API 返回成员列表后调用） */
export const cacheMemberAvatars = (
  members: Array<{ member_id: number; avatar?: string }>,
  scene: AvatarScene = 'member',
) => {
  members.forEach((m) => {
    if (m.member_id && m.avatar) {
      const url = getCachedAvatarUrl(m.avatar, scene)
      touchLruCache(memberAvatarCache, String(m.member_id), url)
    }
  })
}

export const getCachedAvatarUrl = (source: string, scene: AvatarScene = 'chat') => {
  const cacheKey = createAvatarCacheKey(source || DEFAULT_AVATAR_URL, scene)
  const cachedUrl = avatarUrlCache.get(cacheKey)
  if (cachedUrl) {
    touchLruCache(avatarUrlCache, cacheKey, cachedUrl)
    return cachedUrl
  }

  const normalizedUrl = normalizeAvatarUrl(source, scene)
  touchLruCache(avatarUrlCache, cacheKey, normalizedUrl)
  return normalizedUrl
}

export const getAvatarStyle = (source: string, scene: AvatarScene = 'chat') => {
  const avatarUrl = getCachedAvatarUrl(source, scene)
  const styleKey = `${scene}:${avatarUrl}`
  const cachedStyle = avatarStyleCache.get(styleKey)
  if (cachedStyle) {
    touchLruCache(avatarStyleCache, styleKey, cachedStyle)
    return cachedStyle
  }

  const style = {
    backgroundImage: `url("${avatarUrl}")`,
  }
  touchLruCache(avatarStyleCache, styleKey, style)
  return style
}

export const preloadAvatarUrls = (
  sources: Array<string | null | undefined>,
  scene: AvatarScene,
) => {
  sources.forEach((source) => {
    getCachedAvatarUrl(source || '', scene)
  })
}

const normalizeLevelBadgeLevel = (level?: number | string | null) => {
  const normalizedLevel = Number(level || 0)
  return Number.isFinite(normalizedLevel) && normalizedLevel > 0 ? normalizedLevel : 0
}

export const getCachedLevelBadgeUrl = (level?: number | string | null) => {
  const normalizedLevel = normalizeLevelBadgeLevel(level)
  if (!normalizedLevel) return ''

  const cachedUrl = levelBadgeUrlCache.get(normalizedLevel)
  if (cachedUrl) {
    touchLruCache(levelBadgeUrlCache, normalizedLevel, cachedUrl)
    return cachedUrl
  }

  const url = `/static/images/level/${normalizedLevel}.png`
  touchLruCache(levelBadgeUrlCache, normalizedLevel, url)
  return url
}

export const getLevelBadgeStyle = (level?: number | string | null) => {
  const normalizedLevel = normalizeLevelBadgeLevel(level)
  if (!normalizedLevel) return null

  const cachedStyle = levelBadgeStyleCache.get(normalizedLevel)
  if (cachedStyle) {
    touchLruCache(levelBadgeStyleCache, normalizedLevel, cachedStyle)
    return cachedStyle
  }

  const style = {
    backgroundImage: `url("${getCachedLevelBadgeUrl(normalizedLevel)}")`,
  }
  touchLruCache(levelBadgeStyleCache, normalizedLevel, style)
  return style
}

export const preloadLevelBadgeUrls = (levels: Array<number | string | null | undefined>) => {
  levels.forEach((level) => {
    getCachedLevelBadgeUrl(level)
    getLevelBadgeStyle(level)
  })
}

export const getAvatarCacheStats = (): AvatarCacheStats => ({
  avatarUrlEntries: avatarUrlCache.size,
  avatarStyleEntries: avatarStyleCache.size,
  levelBadgeUrlEntries: levelBadgeUrlCache.size,
  levelBadgeStyleEntries: levelBadgeStyleCache.size,
})
