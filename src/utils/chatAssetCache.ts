import type { ChatMessage } from '@/service/api/groupChat'
import { getImageUrl, getChatImageUrl } from '@/utils'
import { preloadAvatarUrls, preloadLevelBadgeUrls } from '@/utils/avatarCache'
import { getEmotionIconPath } from '@/utils/emotionTool'

const CACHE_MAX = 200

const emotionUrlCache = new Map<number, string>()
const iconPathUrlCache = new Map<string, string>()
const thumbUrlCache = new Map<string, string>()

const stripUrlQuery = (url: string) => url.split('#')[0].split('?')[0]

const touchLruCache = <K, V>(cache: Map<K, V>, key: K, value: V) => {
  if (cache.has(key)) {
    cache.delete(key)
  }
  cache.set(key, value)

  if (cache.size <= CACHE_MAX) return

  const oldestKey = cache.keys().next().value
  if (oldestKey !== undefined) {
    cache.delete(oldestKey)
  }
}

const isValidThumbUrl = (thumbUrl?: string) => !!thumbUrl && !thumbUrl.includes('NaN')

const getMessageLevel = (message?: ChatMessage | null) =>
  (message?.sender as { level?: { level?: number | string | null } } | undefined)?.level?.level

export const getCachedEmotionUrl = (emotionId?: number | null, iconPath?: string) => {
  const normalizedId = Number(emotionId || 0)

  if (normalizedId) {
    const cached = emotionUrlCache.get(normalizedId)
    if (cached) {
      touchLruCache(emotionUrlCache, normalizedId, cached)
      return cached
    }
  }

  if (iconPath) {
    const iconKey = stripUrlQuery(iconPath)
    const iconCached = iconPathUrlCache.get(iconKey)
    if (iconCached) {
      touchLruCache(iconPathUrlCache, iconKey, iconCached)
      if (normalizedId) {
        touchLruCache(emotionUrlCache, normalizedId, iconCached)
      }
      return iconCached
    }

    const url = getImageUrl(iconPath, true)
    touchLruCache(iconPathUrlCache, iconKey, url)
    if (normalizedId) {
      touchLruCache(emotionUrlCache, normalizedId, url)
    }
    return url
  }

  if (!normalizedId) return ''

  const icon = getEmotionIconPath(normalizedId)
  if (!icon) return ''

  const url = getImageUrl(icon, true)
  touchLruCache(emotionUrlCache, normalizedId, url)
  return url
}

export const getCachedChatThumbUrl = (rawUrl: string, width?: number, height?: number) => {
  if (!rawUrl) return ''

  const cacheKey = `${stripUrlQuery(rawUrl)}:${width || 0}:${height || 0}`
  const cached = thumbUrlCache.get(cacheKey)
  if (cached) {
    touchLruCache(thumbUrlCache, cacheKey, cached)
    return cached
  }

  const url = getChatImageUrl(rawUrl, width || 0, height || 0, true)
  touchLruCache(thumbUrlCache, cacheKey, url)
  return url
}

const getCachedThumbFromUrl = (url: string) => {
  const cacheKey = stripUrlQuery(url)
  const cached = thumbUrlCache.get(cacheKey)
  if (cached) {
    touchLruCache(thumbUrlCache, cacheKey, cached)
    return cached
  }

  const resolved = getImageUrl(url, true)
  touchLruCache(thumbUrlCache, cacheKey, resolved)
  return resolved
}

export const resolveImageThumbUrl = (message: ChatMessage): string => {
  const payload = message.payload
  if (!payload) return ''

  const thumbUrl = payload.thumb_url || ''
  if (isValidThumbUrl(thumbUrl)) {
    return getCachedThumbFromUrl(thumbUrl)
  }

  const originalUrl = payload.url || ''
  if (!originalUrl) return ''

  return getCachedChatThumbUrl(originalUrl, payload.width, payload.height)
}
/*
 为单条聊天消息补充资源相关的 URL 字段（如图片缩略图、表情包图片），
 * 确保渲染时可直接使用，避免在组件内重复计算或异步获取。
 */
export const enrichChatMessageAssets = (message: ChatMessage): ChatMessage => {
  if (!message) return message

  if (message.message_type === 'image' && message.payload) {
    const thumb_url = resolveImageThumbUrl(message)
    return {
      ...message,
      payload: {
        ...message.payload,
        thumb_url: thumb_url || message.payload.thumb_url,
      },
    }
  }

  if (message.message_type === 'emotion' && message.payload) {
    const emotion_url =
      message.payload.emotion_url || getCachedEmotionUrl(message.payload.emotion_id)
    return {
      ...message,
      payload: {
        ...message.payload,
        emotion_url,
      },
    }
  }

  if (message.message_type === 'rich' && message.payload?.parts) {
    return {
      ...message,
      payload: {
        ...message.payload,
        parts: message.payload.parts.map((part) => {
          if (part.type === 'emotion' && part.emotion_id) {
            return {
              ...part,
              emotion_url: getCachedEmotionUrl(part.emotion_id),
            }
          }

          if (part.type === 'image') {
            const thumb_url = isValidThumbUrl(part.thumb_url)
              ? getCachedThumbFromUrl(part.thumb_url!)
              : part.url
                ? getCachedChatThumbUrl(part.url, part.width, part.height)
                : part.thumb_url
            return {
              ...part,
              thumb_url,
            }
          }

          return part
        }),
      },
    }
  }

  return message
}

export const enrichChatMessagesAssets = (messages: ChatMessage[]) => {
  return messages.map(enrichChatMessageAssets)
}

export const preloadMessageAssets = (messageList: ChatMessage[], roomAvatar?: string) => {
  if (roomAvatar) {
    preloadAvatarUrls([roomAvatar], 'room')
  }

  const avatars = new Set<string>()
  const levels = new Set<number | string | null | undefined>()
  const emotionIds = new Set<number>()

  messageList.forEach((message) => {
    if (message.sender?.avatar) {
      avatars.add(message.sender.avatar)
    }

    const level = getMessageLevel(message)
    if (level) {
      levels.add(level)
    }

    if (message.message_type === 'emotion' && message.payload?.emotion_id) {
      emotionIds.add(message.payload.emotion_id)
    }

    if (message.message_type === 'image') {
      resolveImageThumbUrl(message)
    }

    if (message.message_type === 'rich' && message.payload?.parts) {
      message.payload.parts.forEach((part) => {
        if (part.type === 'emotion' && part.emotion_id) {
          emotionIds.add(part.emotion_id)
        }
        if (part.type === 'image') {
          if (isValidThumbUrl(part.thumb_url)) {
            getCachedThumbFromUrl(part.thumb_url!)
          } else if (part.url) {
            getCachedChatThumbUrl(part.url, part.width, part.height)
          }
        }
      })
    }
  })

  preloadAvatarUrls(Array.from(avatars), 'chat')
  preloadLevelBadgeUrls(Array.from(levels))
  emotionIds.forEach((id) => getCachedEmotionUrl(id))
}

export const patchEmotionMessagesAssets = (messages: ChatMessage[]) => {
  let changed = false

  const next = messages.map((message) => {
    if (message.message_type !== 'emotion' || !message.payload?.emotion_id) {
      return message
    }

    if (message.payload.emotion_url) {
      return message
    }

    const emotion_url = getCachedEmotionUrl(message.payload.emotion_id)
    if (!emotion_url) {
      return message
    }

    changed = true
    return {
      ...message,
      payload: {
        ...message.payload,
        emotion_url,
      },
    }
  })

  return { messages: next, changed }
}
