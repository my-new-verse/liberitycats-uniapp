import { http } from '@/utils/http'

export interface getGameParamsApiResponse {
  tempToken: string
  jumpUrl: string
}

/**
 * 获取资产明细列表
 */
export const getGameParamsApi = (type: string) => {
  return http.get<getGameParamsApiResponse>('/v1/open-api/game/get-new-token', {
    game_type: type,
  })
}
