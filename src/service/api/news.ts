import { http } from '@/utils/http'

export interface getNewsDetailApiResponse {
  id: number
  title: string
  summary: string
  cover: string
  create_time: number
  content: string
  views: number
  total_view: number
}

export interface getNewsListApiResponse {
  current_page: number
  data: getNewsDetailApiResponse[]
  last_page: number
}

/**
 * 获取新闻列表
 */
export const getNewsListApi = (page: number, type: number) => {
  return http.get<getNewsListApiResponse>('/v1/news/news/list', {
    page,
    size: 20,
    type,
  })
}

export const getNewsDetailApi = (id: number) => {
  return http.get<getNewsDetailApiResponse>('/v1/news/news/detail', {
    id,
  })
}
