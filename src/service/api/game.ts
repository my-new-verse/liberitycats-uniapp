import { http } from '@/utils/http'

export interface getGameParamsApiResponse {
  token: string
}

/**
 * 获取资产明细列表
 */
export const getGameParamsApi = () => {
  return http.get<getGameParamsApiResponse>('/v1/open-api/game/get-new-token')
}
