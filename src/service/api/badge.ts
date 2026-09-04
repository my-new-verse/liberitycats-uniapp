import { http } from '@/utils/http'

export type BadgeStatus = 'LOCKED' | 'IN_PROGRESS' | 'EARNED' | 'EQUIPPED'
export type BadgeListStatus = 'ALL' | 'EARNED' | 'IN_PROGRESS'
export type BadgeCategory = 'GROWTH' | 'CREATION' | 'INTERACTION' | 'TENURE'
export type BadgeCategoryFilter = BadgeCategory | 'ALL'
export type NavigationParams = Record<string, string | number | boolean | null>

export type NavigationTarget =
  | { type: 'none' }
  | { type: 'post' | 'comment' | 'member' | 'agreement'; id: string; params?: NavigationParams }
  | { type: 'feature'; name: string; params?: NavigationParams }
  | { type: 'webview'; url: string; params?: NavigationParams }
  | { type: 'external_url'; url: string }

export interface BadgeItem {
  code: string
  seriesCode: string
  catalogVersion?: string
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
  target?: NavigationTarget
  earnedAt: string | null
}

export interface NearestBadge {
  code: string
  name: string
  iconUrl: string
  progressCurrent: number
  progressTarget: number
  remaining: number
  actionType: string
  target?: NavigationTarget
}

export interface BadgeStage {
  code: string
  tier: number
  name: string
  iconUrl: string
  progressTarget: number
  unit: string
  status: BadgeStatus
  isCurrent: boolean
  earnedAt: string | null
}

export interface BadgeDetail extends BadgeItem {
  series: {
    code: string
    name: string
    type: 'ONE_TIME' | 'STAGED'
    category: string
    visualTheme: string
  }
  condition: { metricCode: string; description: string }
  progress: {
    current: number
    target: number
    remaining: number
    unit: string
    percentage: number
  }
  stages: BadgeStage[]
  acquisition: { method: string; earnedAt: string | null }
  display: {
    preview: EquippedCommunityBadge
    placements: string[]
  }
  guidanceAction: { label: string; target: NavigationTarget } | null
  capabilities: {
    canEquip: boolean
    canUnequip: boolean
    equipDisabledReasonCode: 'BADGE_NOT_EARNED' | 'ALREADY_EQUIPPED' | 'NOT_OWNER' | null
  }
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

export const getMyBadgesApi = (
  status: BadgeListStatus = 'ALL',
  category: BadgeCategoryFilter = 'ALL',
) => {
  return http.get<MyBadgeList>('/v1/me/badges', { status, category })
}

export const getBadgeDetailApi = (badgeCode: string) => {
  return http.get<BadgeDetail>(`/v1/badges/${encodeURIComponent(badgeCode)}`)
}

export const getUserBadgeDetailApi = (memberId: string | number, badgeCode: string) => {
  return http.get<BadgeDetail>(
    `/v1/users/${encodeURIComponent(String(memberId))}/badges/${encodeURIComponent(badgeCode)}`,
  )
}

export const getUserBadgesApi = (
  memberId: string | number,
  category: BadgeCategoryFilter = 'ALL',
) => {
  return http.get<MyBadgeList>(`/v1/users/${encodeURIComponent(String(memberId))}/badges`, {
    category,
  })
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
