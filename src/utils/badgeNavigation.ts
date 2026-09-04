import type { NavigationParams, NavigationTarget } from '@/service/api/badge'
import { openUrl, toUrl } from '@/utils'

const appendParams = (path: string, params?: NavigationParams) => {
  if (!params) return path
  const query = Object.entries(params)
    .filter(([, value]) => value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path
}

export const executeBadgeNavigationTarget = (target?: NavigationTarget | null): boolean => {
  if (!target || target.type === 'none') return false

  switch (target.type) {
    case 'post':
      toUrl(
        appendParams(
          `/pages/cats/social/detail?id=${encodeURIComponent(target.id)}`,
          target.params,
        ),
      )
      return true
    case 'comment': {
      const postId = target.params?.post_id || target.params?.postId
      if (!postId) return false
      toUrl(
        appendParams(
          `/pages/cats/social/detail?id=${encodeURIComponent(String(postId))}&showComment=true&commentId=${encodeURIComponent(target.id)}`,
          target.params,
        ),
      )
      return true
    }
    case 'member':
      toUrl(
        appendParams(
          `/pages/cats/user/home?member_id=${encodeURIComponent(target.id)}`,
          target.params,
        ),
      )
      return true
    case 'agreement':
      toUrl(
        appendParams(
          `/pages/cats/agreement/detail?id=${encodeURIComponent(target.id)}`,
          target.params,
        ),
      )
      return true
    case 'webview':
      toUrl(
        appendParams(
          `/pages/cats/webview/webview?url=${encodeURIComponent(target.url)}`,
          target.params,
        ),
      )
      return true
    case 'external_url':
      openUrl(target.url)
      return true
    case 'feature':
      return executeFeatureTarget(target.name, target.params)
    default:
      console.warn('[Badge] Unsupported navigation target:', target)
      return false
  }
}

const executeFeatureTarget = (name: string, params?: NavigationParams): boolean => {
  switch (name) {
    case 'profile_edit':
      toUrl(appendParams('/pages/cats/settings/index', params), true)
      return true
    case 'post_create':
      toUrl(appendParams('/pages/cats/social/publish', params), true)
      return true
    case 'community_discussion':
      uni.switchTab({
        url: '/pages/tabbar/discover',
        success: () => uni.$emit('switchToSocialTab'),
      })
      return true
    case 'check_in':
      uni.switchTab({
        url: '/pages/tabbar/my',
        success: () => setTimeout(() => uni.pageScrollTo({ scrollTop: 0, duration: 0 }), 0),
      })
      return true
    case 'staking':
      toUrl(appendParams('/pages/cats/pledge/index', params), true)
      return true
    default:
      console.warn('[Badge] Unsupported feature target:', name)
      return false
  }
}
