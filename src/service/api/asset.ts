import { http } from '@/utils/http'

export interface assetLogResponse {
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

export interface getAssetLogPageListApiResponse {
  current_page: number
  data: assetLogResponse[]
  last_page: number
}

export interface getAssetLogListApiResponse {
  log: getAssetLogPageListApiResponse
}

/**
 * 获取资产明细列表
 */
export const getAssetLogListApi = (assetKey: string, page: number, limit?: number) => {
  return http.get<getAssetLogListApiResponse>('/v1/member/user/get-assets-logs', {
    assetKey,
    page,
    limit,
  })
}
