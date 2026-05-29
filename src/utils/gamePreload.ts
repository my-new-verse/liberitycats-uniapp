import type { GameType, getGameParamsApiResponse } from '@/service/api/game'
import type { GameConfig } from '@/utils/plusGameWebViewPool'
import { buildGameUrlWithToken } from '@/utils/gameUrl'

declare const plus: any

const prefetchedResourceCache = new Set<string>()

const getUrlOrigin = (url: string) => {
  const match = url.match(/^(https?:\/\/[^/]+)/i)
  return match ? match[1] : ''
}

/**
 * 将相对路径解析为绝对 URL（不依赖 URL 构造器，兼容真机）
 */
export const resolveGameResourceUrl = (resource: string, baseUrl?: string) => {
  const normalized = (resource || '').trim()
  if (!normalized) return ''

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  if (!baseUrl) return normalized

  const baseWithoutQuery = baseUrl.split('#')[0].split('?')[0]
  const origin = getUrlOrigin(baseWithoutQuery)

  if (normalized.startsWith('/')) {
    return origin ? `${origin}${normalized}` : normalized
  }

  const baseDir = baseWithoutQuery.includes('/')
    ? baseWithoutQuery.slice(0, baseWithoutQuery.lastIndexOf('/') + 1)
    : `${baseWithoutQuery}/`

  return `${baseDir}${normalized}`
}

export const normalizePreloadResourceList = (
  resources?: string[] | string | null | Array<{ url?: string } | string>,
  baseUrl?: string,
) => {
  if (!resources) return []

  let rawList: (string | { url?: string })[] = []

  if (Array.isArray(resources)) {
    rawList = resources
  } else {
    rawList = String(resources)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  const seen = new Set<string>()
  const result: string[] = []

  rawList.forEach((item) => {
    // 处理对象类型，提取 url 字段
    let urlString = ''
    if (typeof item === 'string') {
      urlString = item
    } else if (item && typeof item === 'object') {
      // 假设对象有 url 属性
      urlString = (item as any).url || (item as any).src || ''
    }
    if (!urlString) return

    const resolved = resolveGameResourceUrl(urlString, baseUrl)
    if (!resolved || seen.has(resolved)) return
    seen.add(resolved)
    result.push(resolved)
  })

  return result
}

const prefetchSingleResource = (url: string) => {
  if (!url || prefetchedResourceCache.has(url)) return

  prefetchedResourceCache.add(url)

  // #ifdef APP-PLUS
  if (typeof plus !== 'undefined' && typeof plus.webview?.prefetchURL === 'function') {
    try {
      plus.webview.prefetchURL(url)
      console.log('[GamePreload] prefetchURL:', url)
    } catch (error) {
      console.warn('[GamePreload] prefetchURL failed:', url, error)
    }
  }
  // #endif

  // 后台下载到本地临时缓存，二次打开更快
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode !== 200 || !res.tempFilePath) return
      uni.saveFile({
        tempFilePath: res.tempFilePath,
        success: () => {
          console.log('[GamePreload] cached:', url)
        },
      })
    },
  })
}

/**
 * 预加载 jumpUrl 及接口返回的 preloadResources
 */
export const prefetchGameResources = (config: Pick<GameConfig, 'url' | 'preloadResources'>) => {
  if (!config?.url) return

  prefetchSingleResource(config.url)

  const resources = normalizePreloadResourceList(config.preloadResources, config.url)
  resources.forEach((url) => {
    if (url !== config.url) {
      prefetchSingleResource(url)
    }
  })
}

export const createGameConfigFromApi = (
  gameType: GameType,
  data?: getGameParamsApiResponse | null,
): GameConfig | null => {
  if (!data?.tempToken || !data?.jumpUrl) return null

  return {
    gameType,
    url: buildGameUrlWithToken(data.jumpUrl, data.tempToken),
    tempToken: data.tempToken,
    preloadResources: normalizePreloadResourceList(data.preloadResources, data.jumpUrl),
  }
}
