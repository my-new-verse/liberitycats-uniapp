import { http } from '@/utils/http'

export type BadgeStatus = 'LOCKED' | 'IN_PROGRESS' | 'EARNED' | 'EQUIPPED'
export type BadgeListStatus = BadgeStatus | 'ALL'

export interface BadgeItem {
  code: string
  seriesCode: string
  tier: number
  name: string
  description: string
  category: string
  iconUrl: string
  status: BadgeStatus
  progressCurrent: number
  progressTarget: number
  progressUnit: string
  actionType: string
  earnedAt: string | null
  // 引导操作配置
  guidanceAction?: {
    label: string
    target: {
      name: string
      params?: Record<string, any>
    }
  }
}

export interface NearestBadge {
  code: string
  name: string
  iconUrl: string
  progressCurrent: number
  progressTarget: number
  remaining: number
  actionType: string
}

export interface MyBadgeList {
  version: string
  earnedCount: number
  totalCount: number
  equippedBadgeCode: string | null
  items: BadgeItem[]
  nearest: NearestBadge[]
}

export interface EquippedCommunityBadge {
  iconUrl: string
  accessibilityLabel: string
}

export interface UpdateEquippedBadgeResponse {
  equippedCommunityBadge: EquippedCommunityBadge | null
}

export const getMyBadgesApi = (category: BadgeListStatus = 'ALL') => {
  return http.get<MyBadgeList>('/v1/me/badges', { category })
}

export const getBadgeDetailApi = (badgeCode: string) => {
  return http.get<BadgeItem>(`/v1/badges/${encodeURIComponent(badgeCode)}`)
}

export const equipBadgeApi = (badgeCode: string) => {
  return http<UpdateEquippedBadgeResponse>({
    url: '/v1/me/badges/equipped',
    method: 'PUT',
    data: { badgeCode },
  })
}

export const unequipBadgeApi = () => {
  return http<UpdateEquippedBadgeResponse>({
    url: '/v1/me/badges/equipped',
    method: 'DELETE',
  })
}
