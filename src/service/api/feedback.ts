import { http } from '@/utils/http'

export interface feedbackContent {
  id: number
  email: string
  content: string
  images: string[]
  create_time: string
}

/**
 * 保存用户地址
 */
export const addFeedbackApi = (param: feedbackContent) => {
  return http.post<any>('/v1/feedback/feedback/add', {
    ...param,
  })
}

// FAQ 列表项
export interface FaqI18nItem {
  title: string
  content: string
}

export interface FaqItem {
  id: number
  name: string
  tags_json: string[]
  create_time: string
  i18n_content?: FaqI18nItem
}

export interface FaqListResponse {
  current_page: number
  data: FaqItem[]
  last_page: number
}

export type FaqDetailResponse = FaqItem

/**
 * 获取 FAQ 列表（支持关键字搜索）
 */
export const getFaqListApi = (page: number, keyword?: string, limit?: number) => {
  return http.get<FaqListResponse>('/v1/feedback/faq/lists', {
    page,
    limit,
    keyword,
  })
}

/**
 * 获取 FAQ 详情
 */
export const getFaqDetailApi = (id: number) => {
  return http.get<FaqDetailResponse>('/v1/feedback/faq/detail', {
    id,
  })
}
