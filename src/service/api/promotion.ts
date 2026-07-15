import { http } from '@/utils/http'

export interface AdPostItem {
  id: number
  type: string
  member_id: number
  title: string
  content: string
  images: string[]
  status: number
  view_count: number
  commit_count: number
  like_count: number
  create_time: number
  is_liked: number
  member: {
    id: number
    nickname: string
    avatar: string
    level: number
    is_following: number
    is_self: number
    is_mutual_following?: number
    is_special_following?: number
    is_following_me?: number
  }
  post_category: string
  ad_type: {
    id: number
    name: string
    display_name: string
  }
  contact_email: string
  contact_wechat: string
  ad_expire_days: number
  publish_status: number
  is_expired: boolean
  currentGif?: string
  ad_tags: {
    id: number
    name: string
    display_name: string
  }[]
}

export interface AdPostListResponse {
  current_page: number
  data: AdPostItem[]
  per_page: number
  total: number
}

export interface AdPostListParams {
  limit?: number
  page?: number
  sort?: 'latest' | 'hot'
  tag_id?: number
  ad_type_id?: number
  expire_filter?: 'valid'
  keyword?: string
}

/** 获取广告帖列表 */
export const getAdPostListApi = (params?: AdPostListParams) => {
  return http.get<AdPostListResponse>('/v1/community/ad-post/list', params as any)
}

export interface AdTypeItem {
  id: number
  name: string
  display_name: string
  sort_order: number
  is_enabled: number
  icon: string
}

/** 获取广告类型列表 */
export const getAdTypeListApi = () => {
  return http.get<AdTypeItem[]>('/v1/community/ad-type/list')
}

export interface AdTagItem {
  id: number
  name: string
  display_name: string
  use_count: number
}

/** 获取热门标签 */
export const getAdTagHotApi = (limit = 20) => {
  return http.get<AdTagItem[]>('/v1/community/ad-tag/hot', { limit } as any)
}

/** 搜索标签 */
export const getAdTagSearchApi = (keyword: string, limit = 20) => {
  return http.get<AdTagItem[]>('/v1/community/ad-tag/search', { keyword, limit } as any)
}
