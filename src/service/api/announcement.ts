import { http } from '@/utils/http'

export interface getAnnouncementDetailApiResponse {
  id: number
  status: number
  pop_type: number
  sort: number
  create_time: string | null
  i18n_content: I18n_content | any[]
}

type I18n_content = {
  id: number
  announcement_id: number
  lang: string
  summary: string
  title: string
  content: string
}

export interface AnnouncementListResponse {
  current_page: number
  data: getAnnouncementDetailApiResponse[]
  last_page: number
}

/**
 * 获取公告列表
 */
export const getAnnouncementListApi = (page: number, limit?: number) => {
  return http.get<AnnouncementListResponse>('/v1/system/announcement/lists', {
    page,
    limit,
  })
}

export const getAnnouncementDetailApi = (id: number) => {
  return http.get<getAnnouncementDetailApiResponse>('/v1/system/announcement/detail', {
    id,
  })
}
