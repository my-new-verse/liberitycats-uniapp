import type { ChatMessage, ChatRoomDetail } from '@/service/api/groupChat'

export type GroupChatPageCacheSnapshot = {
  roomCode?: string
  roomId?: number
  roomDetail: ChatRoomDetail | null
  messages: ChatMessage[]
  hasMoreHistory: boolean
  nextBeforeMessageId: number | null
  cachedAt: number
}

const GROUP_CHAT_PAGE_CACHE_TTL_MS = 90 * 1000
const GROUP_CHAT_PAGE_CACHE_VERSION = 'v1'
const GROUP_CHAT_PAGE_CACHE_KEY_PREFIX = `group_chat_page_cache:${GROUP_CHAT_PAGE_CACHE_VERSION}:`
const memoryCache = new Map<string, GroupChatPageCacheSnapshot>()

const buildCacheKey = (roomCode?: string, roomId?: number) => {
  if (roomCode) return `${GROUP_CHAT_PAGE_CACHE_KEY_PREFIX}code:${roomCode}`
  if (roomId) return `${GROUP_CHAT_PAGE_CACHE_KEY_PREFIX}id:${roomId}`
  return ''
}

const cloneSnapshot = (snapshot: GroupChatPageCacheSnapshot): GroupChatPageCacheSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as GroupChatPageCacheSnapshot

const isSnapshotExpired = (
  snapshot?: GroupChatPageCacheSnapshot | null,
  maxAgeMs = GROUP_CHAT_PAGE_CACHE_TTL_MS,
) => {
  if (!snapshot?.cachedAt) return true
  return Date.now() - snapshot.cachedAt > maxAgeMs
}

export const getGroupChatPageCache = (
  params: {
    roomCode?: string
    roomId?: number
  },
  maxAgeMs = GROUP_CHAT_PAGE_CACHE_TTL_MS,
) => {
  const keys = [
    buildCacheKey(params.roomCode, params.roomId),
    params.roomId ? buildCacheKey(undefined, params.roomId) : '',
  ].filter(Boolean)

  for (const key of keys) {
    const memorySnapshot = memoryCache.get(key)
    if (memorySnapshot && !isSnapshotExpired(memorySnapshot, maxAgeMs)) {
      return cloneSnapshot(memorySnapshot)
    }

    try {
      const stored = uni.getStorageSync(key)
      if (!stored) continue
      const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
      if (isSnapshotExpired(parsed, maxAgeMs)) {
        uni.removeStorageSync(key)
        continue
      }
      const snapshot = parsed as GroupChatPageCacheSnapshot
      memoryCache.set(key, snapshot)
      return cloneSnapshot(snapshot)
    } catch (error) {
      console.error('getGroupChatPageCache error:', error)
    }
  }

  return null
}

export const setGroupChatPageCache = (snapshot: GroupChatPageCacheSnapshot) => {
  const normalizedSnapshot: GroupChatPageCacheSnapshot = {
    ...cloneSnapshot(snapshot),
    cachedAt: Date.now(),
  }

  const keys = [
    buildCacheKey(normalizedSnapshot.roomCode, normalizedSnapshot.roomId),
    normalizedSnapshot.roomId ? buildCacheKey(undefined, normalizedSnapshot.roomId) : '',
  ].filter(Boolean)

  keys.forEach((key) => {
    memoryCache.set(key, normalizedSnapshot)
    try {
      uni.setStorageSync(key, normalizedSnapshot)
    } catch (error) {
      console.error('setGroupChatPageCache error:', error)
    }
  })
}

export const clearGroupChatPageCache = (params: { roomCode?: string; roomId?: number }) => {
  const keys = [
    buildCacheKey(params.roomCode, params.roomId),
    params.roomId ? buildCacheKey(undefined, params.roomId) : '',
  ].filter(Boolean)

  keys.forEach((key) => {
    memoryCache.delete(key)
    try {
      uni.removeStorageSync(key)
    } catch (error) {
      console.error('clearGroupChatPageCache error:', error)
    }
  })
}
